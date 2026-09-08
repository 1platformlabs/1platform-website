import type { SiteTenant } from '../lib/site-api'

/**
 * The manifest, in the repository.
 *
 * WHY THIS EXISTS WHEN THE MANIFEST IS SUPPOSED TO LIVE IN THE API
 * ----------------------------------------------------------------
 * It is the step that makes the whole conversion auditable. If the way the site
 * is SERVED and the place its content COMES FROM both change at once, then a
 * difference in the rendered HTML cannot be attributed to either, and the
 * no-regression of `1platform.pro` — the central acceptance criterion of this
 * work — stops being checkable. So the engine lands first with the manifest
 * here, and only then does the source move.
 *
 * It also gives the test harness and a developer's laptop a subject. Nothing
 * else does: a browser test drives `Host: localhost:4321`, which is not a
 * routable domain and resolves to no tenant, and a laptop has no API. Without
 * this, every browser test in the suite fails at server startup — measured: the
 * readiness probe gets a 404 and Playwright waits out its full timeout.
 *
 * WHY IT IS NOT A FALLBACK
 * ------------------------
 * The source is chosen EXPLICITLY by `SITE_MANIFEST_SOURCE`, and the default is
 * the API. This file is never consulted unless someone asked for it.
 *
 * That distinction is the whole point. A silent fallback is how the front door
 * currently answers `200` with an unrelated product's panel for a domain nobody
 * routed — the exact defect this epic replaces. A fallback that fires when the
 * API is unreachable would be worse still: it would serve 1Platform's brand
 * under a client's domain and call it resilience.
 */

/**
 * `1platform.pro` — tenant #1, and NOT a special case.
 *
 * It is described here exactly as any other tenant would be, because a code path
 * that only the platform's own site exercises is a code path nobody tests. Every
 * value below is one the API will serve once the manifest moves; the shape is
 * the projection, byte for byte.
 */
const ONEPLATFORM: SiteTenant = {
  slug: 'oneplatform',
  brand_name: '1Platform',
  // The wordmark is drawn with its leading character boxed, so the logo needs
  // the mark as its own datum rather than re-deriving it from the name.
  brand_mark: '1Platform',
  domain: '1platform.pro',
  locales: ['en', 'es'],
  default_locale: 'en',
  theme: {
    // The values the site ships today, read from src/styles/global.css so the
    // conversion changes the SOURCE of the tokens and not the tokens.
    accent: '#1f4fe0',
    accent_contrast: '#ffffff',
    display_font: 'instrument-serif',
  },
  destinations: {
    docs: 'https://developer.1platform.pro/',
    app: 'https://app.1platform.pro/app/',
    support: null,
    status: null,
  },
  // Left empty on purpose while the page set still comes from the file router.
  // It becomes the tenant's published route list when the content moves to the
  // API; declaring a partial list here would be a second source of truth for
  // which pages exist, and the two would drift.
  pages: [],
  indexable: true,
}

/**
 * Hosts that resolve to tenant #1 while the manifest lives here.
 *
 * `localhost` and `127.0.0.1` are in the list so a laptop and the browser suite
 * have a tenant. They are NOT in the API's manifest and must never be: they are
 * a property of running the thing locally, not of the site.
 */
const REPO_TENANTS: ReadonlyArray<readonly [string, SiteTenant]> = [
  ['1platform.pro', ONEPLATFORM],
  ['www.1platform.pro', ONEPLATFORM],
  ['localhost', ONEPLATFORM],
  ['127.0.0.1', ONEPLATFORM],
]

/** Which source the manifest comes from. The API unless someone said otherwise. */
export function manifestSource(): 'repo' | 'api' {
  return process.env?.SITE_MANIFEST_SOURCE === 'repo' ? 'repo' : 'api'
}

/** The repo manifest for a normalised host, or null. Never consulted in `api` mode. */
export function repoTenantForHost(host: string): SiteTenant | null {
  for (const [h, tenant] of REPO_TENANTS) {
    if (h === host) return tenant
  }
  return null
}

/** Every tenant the repo manifest knows, for guards that need the full set. */
export function repoTenants(): SiteTenant[] {
  return [...new Set(REPO_TENANTS.map(([, t]) => t))]
}
