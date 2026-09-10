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
  // Lockup parts are explicit. `Logo.astro` does not cut the brand name to
  // guess where the boxed symbol ends, so a multi-character mark and a normal
  // wordmark cannot corrupt each other.
  brand_mark: '1',
  brand_wordmark: 'Platform',
  domain: '1platform.pro',
  locales: ['en', 'es'],
  default_locale: 'en',
  home_template: 'platform-commerce',
  theme: {
    // The values the site ships today, read from src/styles/global.css so the
    // conversion changes the SOURCE of the tokens and not the tokens.
    //
    // ⚠️ This said `#1f4fe0` and that was NOT what the site ships. `global.css`
    // sets `--color-accent: var(--cobalt)` and `--cobalt: #1748A7`; the wrong
    // value came from the neighbouring `--color-accent-glow: rgba(31, 79, 224,
    // …)`, which is `#1f4fe0` and disagrees with the accent it is supposedly
    // derived from — a pre-existing inconsistency in the stylesheet, still
    // there.
    //
    // It went unnoticed because nothing rendered this field. The moment
    // `tenant-theme.ts` started honouring it, the manifest being wrong about
    // tenant #1's own colour would have REPAINTED 1platform.pro — the exact
    // regression the epic's byte-for-byte criterion exists to catch. Verified
    // against live production: `1platform.pro` serves `--cobalt:#1748a7`.
    accent: '#1748a7',
    accent_contrast: '#ffffff',
    // This is the family `global.css` already compiles. The former
    // `instrument-serif` value described loaded-but-unused data and would have
    // repainted tenant #1 once the manifest started driving the document.
    // Matching the real default lets the request-scoped emitter stay silent.
    display_font: 'space-grotesk',
  },
  destinations: {
    docs: 'https://developer.1platform.pro/',
    app: 'https://app.1platform.pro/app/',
    support: null,
    status: null,
  },
  // Data, not a branch for tenant #1: these are exactly the compiled assets
  // the historical page emitted, so resolving them preserves its HTML bytes.
  brand_assets: {
    icon: '/favicon.svg',
    social_image: '/og/default.png',
    // The compiled touch icon this page has always carried. Declaring it is
    // what keeps tenant #1's bytes identical now that the element is resolved
    // from the manifest instead of hard-coded (issue #107) — the same
    // mechanism as the two fields above, and still not a branch on slug.
    apple_touch_icon: '/logo-oauth-120x120.png',
  },
  // The canonical routes this tenant publishes — the SAME list the API is
  // seeded with, which is why it is not hand-written: it is the
  // `published_routes` of `scripts/fixtures/site_pages_oneplatform.json`, which
  // `scripts/export-site-content.mjs` derives from this repository's own
  // catalogues and blog collection. `tests/tenant-pages-match-export.spec.ts`
  // compares the two and fails when they drift, which is the only thing
  // stopping this copy from becoming a second source of truth.
  //
  // Locale-independent by design: `/pricing/` covers `/pricing/` and
  // `/es/precios/` both, because the URL is derived through the tenant's own
  // topology (`makeLocalizePath`). Storing the translated address here would
  // give one page two entries and make "did this tenant publish it?"
  // ambiguous.
  google_site_verification: 'google1dd96c2b1cc5f482',
  pages: [
    '/',
    '/about/',
    '/blog/',
    '/blog/1platform-vs-custom-toolchain/',
    '/blog/ai-content-best-practices/',
    '/blog/automate-seo-pipeline/',
    '/blog/electronic-invoicing-online-business/',
    '/blog/getting-started-5-minutes/',
    '/blog/integrating-payments-into-your-saas/',
    '/blog/launch-online-store-30-minutes/',
    '/blog/programmatic-link-building/',
    '/changelog/',
    '/contact/',
    '/cookies/',
    '/for-agencies/',
    '/for-developers/',
    '/payments-invoicing/',
    '/pricing/',
    '/privacy/',
    '/solutions/',
    '/solutions/ads/',
    '/solutions/content/',
    '/solutions/deliveries/',
    '/solutions/online-store/',
    '/solutions/whitelabel/',
    '/terms/',
  ],
  indexable: true,
}

/**
 * The clinics tenant — a second brand, and the reason the engine is worth having.
 *
 * Provisional domain, so it is NOT indexed: `indexable: false` puts `noindex` on
 * every page and keeps it out of the sitemap, until the manifest says the domain
 * is final. That is the whole cost of a provisional name being carried as DATA —
 * renaming later is editing one value, not a migration with 301s across a site
 * search engines already learned.
 *
 * It has no `docs` destination, and that is the point of D-7: a tenant without
 * developer documentation does not get an empty link, a disabled link, or a link
 * to the platform's docs. The element is not rendered.
 */
const CLINICAS: SiteTenant = {
  slug: 'clinicas',
  brand_name: 'Clínica Delta',
  brand_mark: 'C',
  brand_wordmark: 'Clínica Delta',
  domain: 'clinicas.1platform.dev',
  locales: ['es'],
  default_locale: 'es',
  // The repository catalogue is a published-manifest harness. Until the
  // clinic supplies its real HTTPS support destination it cannot truthfully
  // satisfy the `service-lead` publication invariant, so that strategy is
  // exercised by the API-mode contractual fixture instead of inventing a URL.
  home_template: 'platform-commerce',
  theme: {
    accent: '#0f766e',
    accent_contrast: '#ffffff',
    display_font: 'instrument-serif',
  },
  destinations: {
    docs: null,
    app: null,
    support: null,
    status: null,
  },
  // `null` is intentional. This tenant exercises the derived icon and social
  // card rather than falling back to any asset belonging to 1Platform.
  brand_assets: null,
  // No Search Console property of its own yet. Absent is the right answer:
  // the platform's token is emphatically NOT a fallback here — serving it would
  // hand ownership of the clinic's domain to whoever holds that property.
  google_site_verification: null,
  // Its home, and only its home, until F7 writes the vertical's pages.
  //
  // NOT left empty, and the reason is a false green that was measured: with an
  // empty page list the middleware answers 404 for every address of this
  // tenant, so `tests/tenant-brand-is-data.spec.ts` would count ZERO brand
  // mentions on a 10-byte "Not Found" body and report the leak closed. A guard
  // whose subject disappeared is not a guard that passed.
  pages: ['/'],
  indexable: false,
}

/**
 * Hosts that resolve to a tenant while the manifest lives here.
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
  ['clinicas.1platform.dev', CLINICAS],
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
