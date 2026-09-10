/**
 * The cache that stands between a visitor and the API.
 *
 * WHY IT IS PART OF THE CONTRACT AND NOT AN OPTIMISATION
 * -----------------------------------------------------
 * Until this epic, nginx served files: `1platform-api` could be down for an hour
 * and `1platform.pro` would not notice. Now a page is rendered from a manifest
 * fetched over HTTP, so the site's availability is bolted to the API's. That is
 * the direct cost of resolving a tenant per request, and it is designed rather
 * than absorbed:
 *
 *   fresh copy            -> serve it
 *   stale copy            -> serve it AND refresh in the background
 *   no copy, API answers  -> wait for it
 *   no copy, API silent   -> 503 with Retry-After. Never another tenant's
 *                            content, never half a page.
 *
 * The maximum age a visitor may be served is a declared number, not an accident.
 *
 * WHY EVERY ENTRY IS KEYED EXPLICITLY AND NOTHING HERE KNOWS "THE CURRENT TENANT"
 * ------------------------------------------------------------------------------
 * This is a long-lived process handling concurrent requests for different hosts.
 * A module-level "current tenant" would let two requests interleave at an
 * `await` and overwrite each other — and the damage would not be a wrong render,
 * which someone would notice. It would be a cache WRITE under the wrong key,
 * which poisons every later response for a tenant nobody was even looking at.
 *
 * So: this module holds a map. It takes a key. It has no notion of who is
 * asking. The resolved tenant lives in `context.locals`, which is per request by
 * construction.
 *
 * WHY THE SIZE IS BOUNDED
 * -----------------------
 * A negative entry is keyed by the Host header, which anyone can choose. Without
 * a cap, a loop of random hosts is a memory-exhaustion primitive against a
 * process that has to stay up — the cache put there to ABSORB that attack
 * becomes the way to land it. Both maps are therefore capped and evict the
 * least-recently-used entry, and the negative one is capped harder because its
 * keys are the attacker-chosen ones.
 */

/** How long a resolved manifest is considered fresh. */
export const FRESH_MS = 60_000

/**
 * The oldest copy a visitor may be served while the API is unreachable. Beyond
 * this the honest answer is 503: a day-old brand is not "still working", it is a
 * site quietly serving something nobody can correct.
 */
export const MAX_STALE_MS = 24 * 60 * 60 * 1000

/** How long "this host resolves to nothing" is remembered. Short on purpose: a
 *  domain being wired up should not be 404 for an hour after it starts working. */
export const NEGATIVE_MS = 30_000

/** Caps. See the module docstring — the negative map is the attacker-keyed one. */
export const MAX_POSITIVE_ENTRIES = 512
export const MAX_NEGATIVE_ENTRIES = 1024

export interface CacheEntry<T> {
  value: T
  storedAt: number
}

/**
 * An insertion-ordered map with a cap, evicting least-recently-used.
 *
 * `Map` in JS preserves insertion order and `delete`+`set` moves a key to the
 * end, which is all an LRU needs. Written out rather than pulled from a package
 * because it is fifteen lines and this site has a 64 KB JS budget it intends to
 * keep — though note this module is server-only, so it never reaches a browser.
 */
class BoundedMap<T> {
  private readonly entries = new Map<string, CacheEntry<T>>()

  constructor(private readonly max: number) {}

  get(key: string): CacheEntry<T> | undefined {
    const hit = this.entries.get(key)
    if (hit) {
      this.entries.delete(key)
      this.entries.set(key, hit)
    }
    return hit
  }

  set(key: string, value: T, now: number): void {
    if (this.entries.has(key)) this.entries.delete(key)
    this.entries.set(key, { value, storedAt: now })
    while (this.entries.size > this.max) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
  }

  delete(key: string): void {
    this.entries.delete(key)
  }

  get size(): number {
    return this.entries.size
  }

  clear(): void {
    this.entries.clear()
  }
}

export type Age = 'fresh' | 'stale' | 'missing'

export interface Lookup<T> {
  value: T | null
  age: Age
  /** Milliseconds since this copy was stored. Null when there is no copy. */
  ageMs: number | null
}

/**
 * A cache for one kind of thing, keyed by a string the caller chooses.
 *
 * `now` is injected rather than read from the clock so that expiry is testable
 * without waiting, and so a test cannot pass by accident of timing.
 */
export class TenantCache<T> {
  private readonly positive = new BoundedMap<T>(MAX_POSITIVE_ENTRIES)
  private readonly negative = new BoundedMap<true>(MAX_NEGATIVE_ENTRIES)
  /** Keys with a refresh already in flight, so N concurrent misses cause one fetch. */
  private readonly inFlight = new Map<string, Promise<void>>()

  /** Cache misses, for the budget that bounds the real attack (see the guard). */
  private misses = 0

  constructor(
    private readonly freshMs = FRESH_MS,
    private readonly maxStaleMs = MAX_STALE_MS,
    private readonly negativeMs = NEGATIVE_MS,
  ) {}

  /** Is this key known NOT to resolve? Distinct from "we have no copy". */
  isKnownMissing(key: string, now: number): boolean {
    const hit = this.negative.get(key)
    if (!hit) return false
    if (now - hit.storedAt > this.negativeMs) {
      this.negative.delete(key)
      return false
    }
    return true
  }

  rememberMissing(key: string, now: number): void {
    this.negative.set(key, true, now)
  }

  lookup(key: string, now: number): Lookup<T> {
    const hit = this.positive.get(key)
    if (!hit) {
      this.misses += 1
      return { value: null, age: 'missing', ageMs: null }
    }
    const ageMs = now - hit.storedAt
    if (ageMs > this.maxStaleMs) {
      // Too old to be honest about. Drop it so the caller cannot be handed it by
      // a later code path that only checks for presence.
      this.positive.delete(key)
      this.misses += 1
      return { value: null, age: 'missing', ageMs: null }
    }
    if (ageMs > this.freshMs) return { value: hit.value, age: 'stale', ageMs }
    return { value: hit.value, age: 'fresh', ageMs }
  }

  store(key: string, value: T, now: number): void {
    this.positive.set(key, value, now)
    this.negative.delete(key)
  }

  /**
   * Refresh in the background, at most one flight per key.
   *
   * The promise is deliberately not awaited by the caller: the point of a stale
   * copy is that the visitor does not wait. Failures are swallowed HERE, with
   * the reason, because a rejected floating promise takes the process down in
   * Node — and a background refresh failing is exactly the case the stale copy
   * exists to survive.
   */
  refreshInBackground(key: string, fetcher: () => Promise<T | null>, now: number): void {
    if (this.inFlight.has(key)) return
    const flight = (async () => {
      try {
        const value = await fetcher()
        if (value !== null) this.store(key, value, now)
      } catch {
        // Deliberately silent to the visitor; the caller logs the miss.
      } finally {
        this.inFlight.delete(key)
      }
    })()
    this.inFlight.set(key, flight)
  }

  /** Test and diagnostics surface. Not used to make decisions. */
  stats(): { positive: number; negative: number; misses: number; inFlight: number } {
    return {
      positive: this.positive.size,
      negative: this.negative.size,
      misses: this.misses,
      inFlight: this.inFlight.size,
    }
  }

  reset(): void {
    this.positive.clear()
    this.negative.clear()
    this.inFlight.clear()
    this.misses = 0
  }
}

/**
 * The budget that bounds the attack the API's per-IP limit cannot see.
 *
 * The API's limiter keys on the caller's address, and the caller is this Node
 * process — so every tenant's legitimate traffic arrives from one address and a
 * per-IP bucket there is really one global bucket for the whole site. A flood of
 * unique Hosts is a cache MISS every time, so the negative cache does not help
 * either: each host is new.
 *
 * The quantity that actually describes that attack is cache misses per minute,
 * measured HERE, where the misses happen. Over budget, an unresolved host is
 * refused without asking the API at all — which protects the API, and protects
 * every other tenant's ability to be resolved.
 */
export class MissBudget {
  private windowStart = 0
  private count = 0

  constructor(private readonly perMinute: number) {}

  /** Returns true when this miss is within budget and may reach the API. */
  allow(now: number): boolean {
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now
      this.count = 0
    }
    this.count += 1
    return this.count <= this.perMinute
  }

  stats(): { count: number; windowStart: number } {
    return { count: this.count, windowStart: this.windowStart }
  }

  reset(): void {
    this.windowStart = 0
    this.count = 0
  }
}
