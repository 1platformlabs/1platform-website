/**
 * Turning a `Host` header into the tenant this request belongs to.
 *
 * The whole multi-tenant design meets the visitor here, so the rules are stated
 * rather than implied:
 *
 * 1. The answer goes in `context.locals`. Never a module variable. This process
 *    handles concurrent requests for different hosts and every fetch below is an
 *    `await`; a module variable would let two requests overwrite each other, and
 *    the visible damage would not be the wrong page — it would be a cache write
 *    under the wrong key, which then poisons requests for a tenant nobody was
 *    even looking at.
 * 2. The cache is a map with explicit keys and no notion of "current tenant".
 * 3. An unknown host gets a 404, never another tenant's content. The front door
 *    today answers 200 with an unrelated product's panel for an unrouted
 *    domain; that is the defect this replaces, and answering it with someone
 *    else's site would be the same defect wearing a new hat.
 * 4. "The API did not answer" is NOT "this host does not exist". A blip must not
 *    render as a deliberate 404 across every tenant at once.
 */

import { manifestSource, repoTenantForHost } from '../data/site-tenants'
import { fetchTenantByHost, SiteApiUnavailable, type SiteTenant } from './site-api'
import { MissBudget, TenantCache } from './tenant-cache'

/**
 * Module-level, and that is fine — read the distinction carefully, because it is
 * the one D-27 is about. These are KEYED STORES shared across requests, the same
 * way a database connection pool is. What must never be module-level is the
 * ANSWER for a particular request: which tenant is being served right now.
 */
const cache = new TenantCache<SiteTenant>()

/** Misses per minute allowed to reach the API when nothing is configured. */
export const DEFAULT_MISS_BUDGET_PER_MINUTE = 120

/**
 * Read the budget, and treat anything that is not a usable number as ABSENT.
 *
 * ⚠️ THIS TOOK PRODUCTION DOWN, so the reason is written out. `??` only steps
 * in for `null`/`undefined`, and the value that arrives here is neither: the
 * deploy writes an EMPTY `.env.prod` (correct — production wants the defaults),
 * and `docker-compose.prod.yml` then sets the variable anyway from
 * `${SITE_MISS_BUDGET_PER_MINUTE:-}`. So the process sees `''`, `'' ?? 120` is
 * `''`, and `Number('')` is **0** — a budget of zero, which refuses the FIRST
 * miss on a cold cache. And a refused miss never reaches the API, so the cache
 * it would have filled stays empty: every request afterwards is a miss too.
 * `1platform.pro` answered 503 to everything, including its own healthcheck,
 * from the second the container started.
 *
 * Its two neighbours survived the same empty string by accident of syntax —
 * `apiBaseUrl()` uses `||` and `manifestSource()` compares to `'repo'`. This is
 * the one that read it as a number, so this is the one that fell over.
 *
 * Zero and negatives are refused too: a budget of zero is not a configuration,
 * it is an outage with a value in it.
 */
export function configuredMissBudget(): number {
  const raw = process.env?.SITE_MISS_BUDGET_PER_MINUTE
  const parsed = Number(raw)
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return DEFAULT_MISS_BUDGET_PER_MINUTE
  }
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MISS_BUDGET_PER_MINUTE
}

const budget = new MissBudget(configuredMissBudget())

/** Same canonicalisation the API stores with: lowercase, no port, no root dot. */
export function normalizeHost(host: string): string {
  let cleaned = (host ?? '').trim().toLowerCase()
  const slash = cleaned.indexOf('/')
  if (slash !== -1) cleaned = cleaned.slice(0, slash)
  const colon = cleaned.indexOf(':')
  if (colon !== -1) cleaned = cleaned.slice(0, colon)
  // Stop at the first character a hostname cannot hold. Same reason as the API's
  // copy: this value is logged, and a newline in the middle of it lets a
  // stranger forge log lines.
  const illegal = cleaned.search(/[^a-z0-9.\-]/)
  if (illegal !== -1) cleaned = cleaned.slice(0, illegal)
  return cleaned.replace(/\.+$/, '')
}

export type Resolution =
  | { outcome: 'resolved'; tenant: SiteTenant; ageMs: number | null; stale: boolean }
  | { outcome: 'unknown-host' }
  | { outcome: 'unavailable'; reason: string }

/**
 * @param host  the raw Host header
 * @param now   injected so expiry is testable without waiting, and so a test
 *              cannot pass by accident of timing
 */
export async function resolveTenant(host: string, now: number = Date.now()): Promise<Resolution> {
  const key = normalizeHost(host)
  if (!key) return { outcome: 'unknown-host' }

  // The repo manifest, when someone explicitly asked for it. Checked BEFORE the
  // routable-host test on purpose: `localhost` has no dot, and a laptop and the
  // browser suite are exactly the callers this mode exists for.
  //
  // This is not a fallback. `manifestSource()` defaults to the API, so this
  // branch is dead unless SITE_MANIFEST_SOURCE=repo was set — which production
  // never does. A source that silently substitutes itself when the API is
  // unreachable would serve the platform's brand under a client's domain and
  // call it resilience.
  if (manifestSource() === 'repo') {
    const local = repoTenantForHost(key)
    return local
      ? { outcome: 'resolved', tenant: local, ageMs: 0, stale: false }
      : { outcome: 'unknown-host' }
  }

  if (!key.includes('.')) {
    // Not a routable host at all. Never asked about; never cached, so a flood of
    // malformed values cannot fill the negative map either.
    return { outcome: 'unknown-host' }
  }

  if (cache.isKnownMissing(key, now)) return { outcome: 'unknown-host' }

  const hit = cache.lookup(key, now)

  if (hit.age === 'fresh' && hit.value) {
    return { outcome: 'resolved', tenant: hit.value, ageMs: hit.ageMs, stale: false }
  }

  if (hit.age === 'stale' && hit.value) {
    // Serve now, refresh behind the visitor's back. This is the branch that
    // keeps the site up while the API is slow.
    cache.refreshInBackground(key, () => fetchTenantByHost(key), now)
    return { outcome: 'resolved', tenant: hit.value, ageMs: hit.ageMs, stale: true }
  }

  // No usable copy: we have to ask, and this is the only branch an attacker can
  // force repeatedly, so it is the one the budget guards.
  if (!budget.allow(now)) {
    // Refused without touching the API. Protecting the API here is protecting
    // every OTHER tenant's ability to be resolved at all.
    return { outcome: 'unavailable', reason: 'miss budget exhausted' }
  }

  try {
    const tenant = await fetchTenantByHost(key)
    if (tenant === null) {
      cache.rememberMissing(key, now)
      return { outcome: 'unknown-host' }
    }
    cache.store(key, tenant, now)
    return { outcome: 'resolved', tenant, ageMs: 0, stale: false }
  } catch (err) {
    const reason = err instanceof SiteApiUnavailable ? err.message : String(err)
    // Deliberately NOT cached as missing: an unreachable API would otherwise
    // pin every tenant to 404 for the negative TTL, turning a blip into an
    // outage that looks intentional.
    return { outcome: 'unavailable', reason }
  }
}

/** Test seam. Production never calls these. */
export const __testing = { cache, budget }
