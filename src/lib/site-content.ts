/**
 * The tenant's COPY, fetched over HTTP and cached the same way the manifest is.
 *
 * WHY THIS EXISTS
 * ---------------
 * After F4 the chrome of a page belonged to the tenant asking and the words did
 * not: `Clínica Delta` rendered its own logo above 1Platform's marketing copy.
 * Measured on the served HTML of the clinics host, the home page still left 13
 * mentions of the platform's brand and 19 of its domain — and the home is the
 * page that leaks LEAST. A blog post left 27 and 30.
 *
 * So the catalogue moves. `1platform-api` stores one document per (tenant,
 * route, locale) and merges them into the one flat map a renderer reads; this
 * module fetches that map, caches it, and hands it to `useI18n`.
 *
 * THE SOURCE IS THE SAME SWITCH AS THE MANIFEST'S, DELIBERATELY
 * -------------------------------------------------------------
 * `SITE_MANIFEST_SOURCE` chooses where a tenant's data comes from, and content
 * is that tenant's data. A second variable would be a second thing to keep in
 * sync, and the failure of getting it wrong is the worst kind: a site serving
 * one tenant's brand around another tenant's words, with both halves reporting
 * success. One switch cannot disagree with itself.
 *
 * AND IT IS NOT A FALLBACK
 * ------------------------
 * `repo` mode is chosen explicitly and production never chooses it. If the API
 * cannot be reached and there is no cached copy, the honest answer is the 503
 * `D-22` already specifies — not the platform's own copy served under a
 * client's domain and called resilience.
 */

import { apiBaseUrl, API_TIMEOUT_MS, SiteApiUnavailable } from './site-api'
import { TenantCache } from './tenant-cache'

/** The merged dictionary for one tenant in one locale. */
export interface SiteContent {
  slug: string
  locale: string
  /** Content key to string, exactly as `useI18n` wants it. */
  messages: Record<string, string>
}

/**
 * Module-level and keyed, the same distinction `resolve-tenant.ts` draws: this
 * is a shared STORE, like a connection pool, not the answer for one request.
 * The key is `slug:locale`, so no request can read another tenant's entry by
 * accident and nothing here has a notion of "the current tenant".
 */
const cache = new TenantCache<SiteContent>()

export function contentKey(slug: string, locale: string): string {
  return `${slug}:${locale}`
}

/**
 * Fetch one tenant's copy for one locale.
 *
 * The same three outcomes as the manifest resolver, and for the same reason —
 * collapsing any two of them is how a site starts serving the wrong thing:
 *
 *   content      the tenant publishes this locale
 *   null         the API answered, and said no (404)
 *   throws       the API did not answer, or answered something unusable
 */
export async function fetchContent(
  slug: string,
  locale: string,
  signal?: AbortSignal,
): Promise<SiteContent | null> {
  const url = `${apiBaseUrl()}/api/v1/sites/${encodeURIComponent(slug)}/pages?locale=${encodeURIComponent(locale)}`

  let response: Response
  const timeout = AbortSignal.timeout(API_TIMEOUT_MS)
  try {
    response = await fetch(url, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { accept: 'application/json' },
    })
  } catch (cause) {
    throw new SiteApiUnavailable(`could not reach the site API for ${slug}/${locale}`, cause)
  }

  if (response.status === 404) return null
  if (!response.ok) {
    // 429 lands here too, and it must: being rate-limited is "could not ask",
    // not "this site has no words".
    throw new SiteApiUnavailable(`site API answered ${response.status} for ${slug}/${locale}`)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch (cause) {
    throw new SiteApiUnavailable(`site API returned a body that is not JSON for ${slug}`, cause)
  }

  const payload = unwrap(body)
  if (!isContent(payload)) {
    throw new SiteApiUnavailable(`site API returned unrecognised content for ${slug}/${locale}`)
  }
  return payload
}

/** The API wraps success payloads; accept both shapes rather than guess. */
function unwrap(body: unknown): unknown {
  if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
    return (body as Record<string, unknown>).data
  }
  return body
}

/**
 * A structural check, not a cast.
 *
 * `as SiteContent` would compile and then hand `undefined` to `t()`, which
 * throws — turning a shape mismatch into a 500 on a page rather than a named
 * failure here. Every value of `messages` is verified to be a string for the
 * same reason: a number or a nested object reaching `interpolate` renders
 * "[object Object]" into a heading and nothing goes red.
 */
function isContent(value: unknown): value is SiteContent {
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>
  if (typeof c.slug !== 'string' || typeof c.locale !== 'string') return false
  const messages = c.messages
  if (!messages || typeof messages !== 'object' || Array.isArray(messages)) return false
  for (const v of Object.values(messages as Record<string, unknown>)) {
    if (typeof v !== 'string') return false
  }
  return true
}

export type ContentResolution =
  | { outcome: 'resolved'; content: SiteContent; ageMs: number | null; stale: boolean }
  | { outcome: 'unavailable'; reason: string }

/**
 * Resolve a tenant's copy, with `D-22`'s cache contract.
 *
 * Note the outcome set is SHORTER than the manifest's by one: there is no
 * `unknown-host` here. By the time this is called the host has already resolved
 * to a published tenant, so a 404 from the content endpoint does not mean "no
 * such site" — it means the site resolved and its copy is missing, which is an
 * inconsistency between two documents rather than an absent visitor. Rendering
 * a page with no words would be the wrong answer to that; `unavailable` (and
 * therefore a 503) is the right one.
 *
 * @param now injected so expiry is testable without waiting, and so a test
 *            cannot pass by accident of timing
 */
export async function resolveContent(
  slug: string,
  locale: string,
  now: number = Date.now(),
): Promise<ContentResolution> {
  const key = contentKey(slug, locale)
  const hit = cache.lookup(key, now)

  if (hit.age === 'fresh' && hit.value) {
    return { outcome: 'resolved', content: hit.value, ageMs: hit.ageMs, stale: false }
  }

  if (hit.age === 'stale' && hit.value) {
    // Serve now, refresh behind the visitor's back — the branch that keeps the
    // site up while the API is slow.
    cache.refreshInBackground(key, () => fetchContent(slug, locale), now)
    return { outcome: 'resolved', content: hit.value, ageMs: hit.ageMs, stale: true }
  }

  try {
    const content = await fetchContent(slug, locale)
    if (content === null) {
      return {
        outcome: 'unavailable',
        reason: `the site API has no published content for ${slug} in ${locale}`,
      }
    }
    cache.store(key, content, now)
    return { outcome: 'resolved', content, ageMs: 0, stale: false }
  } catch (err) {
    const reason = err instanceof SiteApiUnavailable ? err.message : String(err)
    return { outcome: 'unavailable', reason }
  }
}

/** Test seam. Production never calls this. */
export const __testing = { cache }
