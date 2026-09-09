/**
 * The only thing this site knows about `1platform-api`: its HTTP surface.
 *
 * Nothing here imports from that repository, and nothing here should. The two
 * are separate products with separate deploys; the contract between them is the
 * shape below and the URL it is fetched from.
 *
 * The types are written out rather than generated because writing them out is
 * what makes a contract change VISIBLE in a diff. A generated client updates
 * silently and the reviewer sees a lockfile.
 */

/** Closed values accepted by the API and safe to map to local code. */
export const DISPLAY_FONTS = [
  'space-grotesk',
  'instrument-serif',
  'system-serif',
  'system-sans',
  'system-mono',
] as const

export type DisplayFont = (typeof DISPLAY_FONTS)[number]

export const HOME_TEMPLATES = ['platform-commerce', 'service-lead'] as const

export type HomeTemplate = (typeof HOME_TEMPLATES)[number]

/** The manifest, exactly as `GET /api/v1/sites/by-host` projects it. */
export interface SiteTenant {
  slug: string
  brand_name: string
  brand_mark: string | null
  brand_wordmark: string | null
  domain: string
  locales: string[]
  default_locale: string
  home_template: HomeTemplate
  theme: {
    accent: string
    accent_contrast: string
    display_font: DisplayFont
  }
  destinations: {
    docs: string | null
    app: string | null
    support: string | null
    status: string | null
  }
  pages: string[]
  /**
   * The Search Console ownership token, without the `.html` suffix, or null.
   * Served at `/<token>.html` to THIS tenant only — see
   * `src/pages/[token].html.ts` for why it stopped being a file in `public/`.
   */
  google_site_verification: string | null
  indexable: boolean
}

/**
 * Where the API lives.
 *
 * Read at CALL time, not at module load. Module scope in a long-lived server
 * runs once, at import, which in a container is before anything interesting has
 * happened — and it makes the value impossible to change in a test without
 * reloading the module.
 *
 * ⚠️ OPS: nothing gives the container this value yet. `docker-compose.prod.yml`
 * declares no `environment:` and no `env_file:`, and the deploy writes an empty
 * `.env.prod`. F5 has to add that channel; until it does, production falls back
 * to the public API host below, which is correct but leaves QA unable to point
 * at a QA API. That is a known, named gap rather than a silent default.
 */
export function apiBaseUrl(): string {
  const configured =
    typeof process !== 'undefined' ? process.env?.SITE_API_BASE_URL : undefined
  return (configured || 'https://api.1platform.pro').replace(/\/+$/, '')
}

/** How long the site waits for the API before giving up on one attempt. */
export const API_TIMEOUT_MS = 3_000

export class SiteApiUnavailable extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'SiteApiUnavailable'
  }
}

/**
 * Resolve a host to its manifest.
 *
 * Three outcomes, deliberately distinct, because collapsing any two of them is
 * how a site starts serving the wrong thing:
 *
 *   a manifest   the host resolves and is published
 *   null         the API answered, and said no such published site (404)
 *   throws       the API did not answer, or answered something unusable
 *
 * The third is NOT the second. "We could not ask" must never render as "this
 * domain does not exist" — that would turn an API blip into every tenant's site
 * disappearing, with a 404 that looks deliberate.
 */
export async function fetchTenantByHost(host: string, signal?: AbortSignal): Promise<SiteTenant | null> {
  const url = `${apiBaseUrl()}/api/v1/sites/by-host?host=${encodeURIComponent(host)}`

  let response: Response
  const timeout = AbortSignal.timeout(API_TIMEOUT_MS)
  try {
    response = await fetch(url, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { accept: 'application/json' },
    })
  } catch (cause) {
    throw new SiteApiUnavailable(`could not reach the site API for host ${host}`, cause)
  }

  if (response.status === 404) return null
  if (!response.ok) {
    // 429 lands here too, and it must: being rate-limited is "could not ask",
    // not "does not exist". Answering 404 on a 429 would make a burst of traffic
    // look like the tenant was deleted.
    throw new SiteApiUnavailable(`site API answered ${response.status} for host ${host}`)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch (cause) {
    throw new SiteApiUnavailable(`site API returned a body that is not JSON for host ${host}`, cause)
  }

  const tenant = unwrap(body)
  if (!isTenant(tenant)) {
    // A 200 whose shape we do not recognise is an unusable answer, not an
    // absent tenant. Rendering half a manifest is the outcome D-22 forbids.
    throw new SiteApiUnavailable(`site API returned an unrecognised manifest for host ${host}`)
  }
  return tenant
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
 * `as SiteTenant` would compile and then hand `undefined` to the renderer, which
 * is how a page ends up with the literal string "undefined" in its title. Every
 * field the layout actually reads is verified present and of the right type.
 */
function isTenant(value: unknown): value is SiteTenant {
  if (!value || typeof value !== 'object') return false
  const t = value as Record<string, unknown>
  const str = (v: unknown) => typeof v === 'string' && v.length > 0
  const strOrNull = (v: unknown) => v === null || typeof v === 'string'

  if (!str(t.slug) || !str(t.brand_name) || !str(t.domain)) return false
  if (!strOrNull(t.brand_mark) || !strOrNull(t.brand_wordmark)) return false
  if (!strOrNull(t.google_site_verification)) return false
  if (!Array.isArray(t.locales) || t.locales.length === 0 || !t.locales.every(str)) return false
  if (!str(t.default_locale)) return false
  if (!(HOME_TEMPLATES as readonly unknown[]).includes(t.home_template)) return false
  if (typeof t.indexable !== 'boolean') return false
  if (!Array.isArray(t.pages) || !t.pages.every((p) => typeof p === 'string')) return false

  const theme = t.theme as Record<string, unknown> | undefined
  if (!theme || !str(theme.accent) || !str(theme.accent_contrast)) return false
  if (!(DISPLAY_FONTS as readonly unknown[]).includes(theme.display_font)) return false

  const dest = t.destinations as Record<string, unknown> | undefined
  if (!dest) return false
  for (const key of ['docs', 'app', 'support', 'status']) {
    if (!strOrNull(dest[key])) return false
  }
  return true
}
