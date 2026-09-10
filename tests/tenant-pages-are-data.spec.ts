import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'
// Vite arrives with Astro (it is what builds this site); it is imported here
// because `site-routes.ts` enumerates pages with `import.meta.glob`, which only
// a bundler resolves — see the module docstring above.
import { createServer, type Plugin, type ViteDevServer } from 'vite'

import type { SiteTenant } from '../src/lib/site-api'
import { getWithHost } from './helpers/http-host'

/**
 * `SiteTenant.pages` is a DATUM, and this file is what makes that true.
 *
 * ── The defect ─────────────────────────────────────────────────────────────
 * Until F3 the page list had exactly one reader in the whole tree: the sitemap.
 * So a tenant that published six pages still SERVED all forty-three of
 * 1Platform's, `/pricing/` with the platform's own prices included. The sitemap
 * omitting them changed nothing — a file router does not consult a manifest —
 * and nothing anywhere went red. The leak stays invisible until a crawler, or a
 * competitor, follows an external link into a customer's domain.
 *
 * The middleware now enforces it (`isPublishedRequest`), and this file measures
 * the enforcement from OUTSIDE the process, where a visitor stands.
 *
 * ── Two layers, and why both ───────────────────────────────────────────────
 * SERVED (part A) drives the real adapter over `node:http`, which is the only
 * evidence that the rule is WIRED. A rule that is correct and never called is
 * the defect this file exists to catch, and a unit test cannot tell them apart.
 *
 * IN-PROCESS (part B) loads `src/lib/site-routes.ts` through Vite and exercises
 * the enumerations the server cannot show from the outside — `unservedRoutes`,
 * the alternates graph, the canonical mapping. It has to go through Vite rather
 * than a plain import: that module's page enumeration is `import.meta.glob`,
 * which is a bundler transform. Measured under a plain Playwright import:
 * `TypeError: (intermediate value).glob is not a function` at site-routes.ts:43.
 *
 * ── ⚠️ `fetch` CANNOT DO THIS ──────────────────────────────────────────────
 * `Host` is a forbidden header name and `fetch` drops it SILENTLY. On this
 * server `Host` chooses the TENANT, so a two-tenant test written with `fetch`
 * measures one tenant twice and passes. Every request below goes through
 * `getWithHost` (`node:http`), which sets the header the way the world does.
 */

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4321)
const BASE = `http://localhost:${PORT}`

/** The clinic: `pages: ['/']`, Spanish only, a different brand entirely. */
const CLINIC_HOST = 'clinicas.1platform.dev'
const CLINIC_BRAND = 'Clínica Delta'
/** Tenant #1, whose page set is the one that used to leak everywhere. */
const PLATFORM_HOST = '1platform.pro'
/** A host no manifest claims — the live control for part A's chrome assertion. */
const UNROUTED_HOST = 'nobody-routed-here.example'

/**
 * Addresses 1Platform publishes and the clinic does not. `/es/precios/` is in
 * the list on purpose: it is the platform's price page at a SPANISH address,
 * which is the one a Spanish-speaking clinic's visitor is most likely to reach.
 */
const PLATFORM_ONLY_ROUTES = [
  '/pricing/',
  '/for-developers/',
  '/solutions/',
  '/blog/',
  '/es/precios/',
]

// ───────────────────────────────────────────────────────────────────────────
// A. What the server actually serves
// ───────────────────────────────────────────────────────────────────────────

test('the clinic serves its home and refuses every page it does not publish', async () => {
  const home = await getWithHost(`${BASE}/`, CLINIC_HOST)
  expect(home.status, `${CLINIC_HOST}/ must be served — it is the one page this tenant publishes`).toBe(200)
  // Proof the Host actually selected THIS tenant. Without it a suite whose host
  // header got dropped would be resolving 1Platform for every request, and the
  // refusals below would be measuring nothing about the clinic.
  expect(home.body, `${CLINIC_HOST}/ did not render the clinic's brand — the Host did not select this tenant`).toContain(CLINIC_BRAND)

  for (const route of PLATFORM_ONLY_ROUTES) {
    const res = await getWithHost(`${BASE}${route}`, CLINIC_HOST)
    expect(
      res.status,
      `${CLINIC_HOST}${route} answered ${res.status}. This tenant declares pages: ['/']; ` +
        `serving 1Platform's ${route} under a customer's domain is the leak this gate closes.`,
    ).toBe(404)
  }
})

test('POSITIVE CONTROL: 1platform.pro serves those same routes', async () => {
  // Without this the test above passes over a server that is DOWN, misconfigured,
  // or answering 404 to everything — a universal 404 satisfies "the clinic 404s"
  // perfectly. This is what makes the refusals above evidence of a rule rather
  // than evidence of an outage.
  for (const route of PLATFORM_ONLY_ROUTES) {
    const res = await getWithHost(`${BASE}${route}`, PLATFORM_HOST)
    expect(
      res.status,
      `${PLATFORM_HOST}${route} answered ${res.status}. The tenant that DOES publish this ` +
        `route must serve it, or the clinic's 404 proves nothing.`,
    ).toBe(200)
  }
})

test('a refusal is the rendered 404 PAGE, not a bare body', async () => {
  // A regression already committed and corrected in this run: the first version
  // of the gate returned plain text, so every address a tenant does not publish
  // lost its chrome and its language control. The status alone cannot see that —
  // both shapes are 404 — so the body is asserted too.
  const res = await getWithHost(`${BASE}/pricing/`, CLINIC_HOST)

  expect(res.status).toBe(404)
  expect(String(res.headers['content-type'] ?? '')).toContain('text/html')
  expect(res.body, 'the refusal has no document at all — this is a bare body, not the 404 page').toContain('<html')
  expect(
    res.body,
    "the refusal rendered a document without the clinic's brand — the 404 page is not tenant-aware",
  ).toContain(CLINIC_BRAND)

  // ── CONTROL NEGATIVE, live and running in this very server ──────────────
  // The mutation that would put the assertions above back in the red is the
  // regression itself: answering the refusal with a plain-text body. That exact
  // shape is still reachable — it is what an UNROUTED host gets — so the control
  // is measured rather than argued. Same status, no chrome. If the assertions
  // above could not tell these two 404s apart they would not be testing anything.
  const bare = await getWithHost(`${BASE}/pricing/`, UNROUTED_HOST)
  expect(bare.status, 'an unrouted host must also be a 404 — otherwise this is not the same subject').toBe(404)
  expect(bare.body).not.toContain('<html')
  expect(bare.body).not.toContain(CLINIC_BRAND)
  expect(
    bare.body.length,
    'the unrouted-host refusal is no longer a bare body, so it cannot serve as the control',
  ).toBeLessThan(200)
})

// ───────────────────────────────────────────────────────────────────────────
// B. The enumerations behind the gate
// ───────────────────────────────────────────────────────────────────────────

interface SiteRoutesModule {
  publishedUrls(tenant: SiteTenant): Promise<Array<{ path: string; alternates: Array<{ lang: string; path: string }> }>>
  unservedRoutes(tenant: SiteTenant): string[]
  canonicalRouteOf(pathname: string, tenant: SiteTenant): string
  physicalRouteOf(pathname: string, tenant: SiteTenant): string
  isPublishedRequest(pathname: string, tenant: SiteTenant): boolean
}

interface SiteTenantsModule {
  repoTenants(): SiteTenant[]
}

const ROOT = process.cwd()

/**
 * `site-routes.ts` and the repo manifest, loaded the way the bundler loads them.
 *
 * `configFile: false` keeps Astro's own config out of it — only the two path
 * aliases these modules use are needed, and inheriting the full integration
 * chain drags in `astro:content` and fails. Roughly 100 ms.
 *
 * `plugins` is how the control negative at the bottom mutates the guard.
 */
async function loadRoutes(plugins: Plugin[] = []): Promise<{
  routes: SiteRoutesModule
  tenants: SiteTenantsModule
  server: ViteDevServer
}> {
  const server = await createServer({
    configFile: false,
    root: ROOT,
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    resolve: {
      alias: {
        '@i18n/': join(ROOT, 'src/i18n/'),
        '@lib/': join(ROOT, 'src/lib/'),
      },
    },
    plugins,
  })
  const routes = (await server.ssrLoadModule('/src/lib/site-routes.ts')) as unknown as SiteRoutesModule
  const tenants = (await server.ssrLoadModule('/src/data/site-tenants.ts')) as unknown as SiteTenantsModule
  return { routes, tenants, server }
}

let shared: { routes: SiteRoutesModule; tenants: SiteTenantsModule; server: ViteDevServer } | null = null

async function loaded() {
  if (!shared) shared = await loadRoutes()
  return shared
}

test.afterAll(async () => {
  await shared?.server.close()
  shared = null
})

function tenantsBySlug(mod: SiteTenantsModule): { platform: SiteTenant; clinic: SiteTenant } {
  const all = mod.repoTenants()
  // Floor: an enumeration that came back empty makes every loop below pass over
  // nothing at all, which is the vacuous green this whole epic is about.
  expect(all.length, 'the repo manifest enumerated no tenants — broken probe').toBe(2)
  const platform = all.find((t) => t.slug === 'oneplatform')
  const clinic = all.find((t) => t.slug === 'clinicas')
  expect(platform, 'the oneplatform tenant is missing from the repo manifest').toBeTruthy()
  expect(clinic, 'the clinicas tenant is missing from the repo manifest').toBeTruthy()
  return { platform: platform as SiteTenant, clinic: clinic as SiteTenant }
}

/** A manifest double, so a synthetic tenant is rejected by nothing structural. */
function fakeTenant(over: Partial<SiteTenant>): SiteTenant {
  return {
    slug: 'fake',
    brand_name: 'Fake',
    brand_mark: null,
    brand_wordmark: 'Fake',
    domain: 'fake.example',
    locales: ['en'],
    default_locale: 'en',
    home_template: 'platform-commerce',
    theme: { accent: '#000000', accent_contrast: '#ffffff', display_font: 'system-sans' },
    destinations: { docs: null, app: null, support: null, status: null },
    brand_assets: null,
    pages: ['/'],
    google_site_verification: null,
    indexable: true,
    ...over,
  }
}

test('every route the repo manifest publishes is served by a file', async () => {
  const { routes, tenants } = await loaded()
  const { platform, clinic } = tenantsBySlug(tenants)

  // A route in `pages` with no page behind it is the worst combination: the
  // sitemap nominates the URL, a crawler follows it, and the site refuses.
  expect(routes.unservedRoutes(platform), 'oneplatform publishes routes no file serves').toEqual([])
  expect(routes.unservedRoutes(clinic), 'clinicas publishes routes no file serves').toEqual([])

  // ── CONTROL NEGATIVE, measured ──────────────────────────────────────────
  // The mutation that reddens the two lines above is a manifest naming a page
  // nobody implemented. Here is one. If this comes back empty, `unservedRoutes`
  // is not looking at the file router and the two assertions above are decor.
  expect(
    routes.unservedRoutes(fakeTenant({ pages: ['/', '/no-existe/'] })),
    'unservedRoutes did not report a route with no file behind it — it cannot fail, so it is not a check',
  ).toEqual(['/no-existe/'])

  // And it must not cry wolf over a route a CATCH-ALL serves: `/blog/<slug>/`
  // is `blog/[...slug].astro`, which no static file name can match.
  expect(
    routes.unservedRoutes(fakeTenant({ pages: ['/blog/a-post-that-does-not-exist/'] })),
    'a dynamic route was reported unserved — the prefix derivation from `[...slug]` broke',
  ).toEqual([])
})

test('canonicalRouteOf reads the tenant topology, not a hard-coded /es/', async () => {
  const { routes, tenants } = await loaded()
  const { platform, clinic } = tenantsBySlug(tenants)

  // Default `en`: the Spanish tree lives under /es/ with translated slugs, and
  // the canonical address is the English one the route map pairs it with.
  expect(routes.canonicalRouteOf('/es/precios/', platform)).toBe('/pricing/')
  expect(routes.canonicalRouteOf('/es/soluciones/envios/', platform)).toBe('/solutions/deliveries/')
  expect(routes.canonicalRouteOf('/pricing/', platform)).toBe('/pricing/')

  // Default `es`: Spanish owns the root. An untranslated slug keeps its
  // spelling; a translated one maps back to the locale-independent route that
  // `tenant.pages` stores.
  expect(routes.canonicalRouteOf('/servicios/', clinic)).toBe('/servicios/')
  expect(routes.canonicalRouteOf('/', clinic)).toBe('/')
  expect(
    routes.canonicalRouteOf('/es/precios/', clinic),
    'an /es/ address was rewritten for a tenant whose default locale IS es — that tenant has no /es/ tree',
  ).toBe('/es/precios/')

  // ── CONTROL NEGATIVE, measured ──────────────────────────────────────────
  // The mutation is the pre-F3 rule: strip `/es/` unconditionally, ignoring the
  // tenant. Under it the clinic's answer changes, so the assertion above is the
  // one that discriminates a tenant-aware mapping from a hard-coded topology.
  const hardCoded = (p: string) => (p.startsWith('/es/') ? p.slice(3) : p)
  expect(
    hardCoded('/es/precios/'),
    'the hard-coded rule agrees with the tenant-aware one, so this control cannot detect the bug',
  ).not.toBe(routes.canonicalRouteOf('/es/precios/', clinic))

  const bilingualSpanish = fakeTenant({
    locales: ['es', 'en'],
    default_locale: 'es',
    pages: ['/contact/'],
  })
  expect(routes.canonicalRouteOf('/contacto/', bilingualSpanish)).toBe('/contact/')
  expect(routes.canonicalRouteOf('/en/contact/', bilingualSpanish)).toBe('/contact/')
})

test('publishedUrls enumerates 52 URLs for oneplatform, and every alternate is one of them', async () => {
  const { routes, tenants } = await loaded()
  const { platform, clinic } = tenantsBySlug(tenants)

  const urls = await routes.publishedUrls(platform)
  // 26 canonical routes x 2 locales. The number is the F0 baseline the whole
  // conversion is measured against, so it is asserted exactly rather than as a
  // floor: 52 before the manifest became the source and 52 after.
  expect(urls.length, 'the published URL set changed size — that is a regression or an intended change nobody wrote down').toBe(52)
  expect(new Set(urls.map((u) => u.path)).size, 'a URL was enumerated twice').toBe(52)
  expect(urls.filter((u) => u.path === '/es/' || u.path.startsWith('/es/')).length).toBe(26)

  const published = new Set(urls.map((u) => u.path))
  const dangling = urls.flatMap((u) =>
    u.alternates.filter((a) => !published.has(a.path)).map((a) => `${u.path} -> ${a.lang}:${a.path}`),
  )
  // An hreflang naming a URL the sitemap does not carry is invisible until
  // Search Console reports it weeks later.
  expect(dangling, 'these alternates point outside the published set').toEqual([])
  expect(
    urls.every((u) => u.alternates.length === 2),
    'a bilingual tenant emitted a URL with no language pair — a translated slug does not match by string equality, and the naive pairing emits NOTHING for either side, silently',
  ).toBe(true)

  // ── CONTROL NEGATIVE, measured ──────────────────────────────────────────
  // The dangling check must be able to see a dangling alternate. Feed the same
  // predicate a list with one, and it has to name it.
  const corrupted = [{ path: '/', alternates: [{ lang: 'es', path: '/es/no-publicada/' }] }]
  const corruptedSet = new Set(corrupted.map((u) => u.path))
  expect(
    corrupted.flatMap((u) => u.alternates.filter((a) => !corruptedSet.has(a.path)).map((a) => a.path)),
    'the dangling-alternate predicate did not flag a dangling alternate — it cannot fail',
  ).toEqual(['/es/no-publicada/'])

  // The monolingual tenant gets NO alternates. An hreflang pair announcing a
  // language this tenant does not publish points at a tree that 404s.
  const clinicUrls = await routes.publishedUrls(clinic)
  expect(clinicUrls.map((u) => u.path)).toEqual(['/'])
  expect(
    clinicUrls.reduce((n, u) => n + u.alternates.length, 0),
    'a monolingual tenant announced language alternates',
  ).toBe(0)
})

test('default-es middleware gate and sitemap share translated route identities', async () => {
  const { routes } = await loaded()
  const tenant = fakeTenant({
    locales: ['es', 'en'],
    default_locale: 'es',
    pages: ['/', '/contact/', '/solutions/deliveries/', '/blog/'],
  })

  const urls = await routes.publishedUrls(tenant)
  expect(urls.map(({ path }) => path)).toEqual([
    '/',
    '/blog/',
    '/contacto/',
    '/en/',
    '/en/blog/',
    '/en/contact/',
    '/en/solutions/deliveries/',
    '/soluciones/envios/',
  ])

  const expectedAlternates = new Map([
    ['/', { es: '/', en: '/en/' }],
    ['/contacto/', { es: '/contacto/', en: '/en/contact/' }],
    ['/en/', { es: '/', en: '/en/' }],
    ['/en/blog/', { es: '/blog/', en: '/en/blog/' }],
    ['/en/contact/', { es: '/contacto/', en: '/en/contact/' }],
    [
      '/en/solutions/deliveries/',
      { es: '/soluciones/envios/', en: '/en/solutions/deliveries/' },
    ],
    ['/blog/', { es: '/blog/', en: '/en/blog/' }],
    [
      '/soluciones/envios/',
      { es: '/soluciones/envios/', en: '/en/solutions/deliveries/' },
    ],
  ])
  for (const url of urls) {
    expect(
      Object.fromEntries(url.alternates.map(({ lang, path }) => [lang, path])),
      `${url.path}: wrong language pair`,
    ).toEqual(expectedAlternates.get(url.path))
    expect(
      routes.isPublishedRequest(url.path, tenant),
      `${url.path}: the sitemap nominates a URL the middleware refuses`,
    ).toBe(true)
  }

  const published = new Set(urls.map(({ path }) => path))
  expect(
    urls.flatMap(({ alternates }) => alternates).filter(({ path }) => !published.has(path)),
    'a default-es alternate points outside its own sitemap',
  ).toEqual([])

  expect(routes.isPublishedRequest('/pricing/', tenant)).toBe(false)
  expect(routes.isPublishedRequest('/en/pricing/', tenant)).toBe(false)
  expect(
    routes.isPublishedRequest('/contact/', tenant),
    'the canonical route identity must not become a second public URL',
  ).toBe(false)
  expect(
    routes.isPublishedRequest('/es/contacto/', tenant),
    'the platform /es topology must not become an alias under a Spanish-default tenant',
  ).toBe(false)

  expect(routes.physicalRouteOf('/contacto/', tenant)).toBe('/es/contacto/')
  expect(routes.physicalRouteOf('/en/contact/', tenant)).toBe('/contact/')
  expect(routes.physicalRouteOf('/rss.xml', tenant)).toBe('/es/rss.xml')
  expect(routes.physicalRouteOf('/en/rss.xml', tenant)).toBe('/rss.xml')

  const tenantWithChangelog = fakeTenant({
    ...tenant,
    pages: [...tenant.pages, '/changelog/'],
  })
  expect(routes.physicalRouteOf('/novedades/feed.xml', tenantWithChangelog)).toBe(
    '/es/novedades/feed.xml',
  )
  expect(routes.physicalRouteOf('/en/changelog/feed.xml', tenantWithChangelog)).toBe(
    '/changelog/feed.xml',
  )

  const platform = fakeTenant({
    locales: ['en', 'es'],
    default_locale: 'en',
    pages: ['/', '/contact/', '/blog/'],
  })
  expect(
    routes.isPublishedRequest('/es/contact/', platform),
    'the existing Spanish moved-route must still reach Astro\'s 301',
  ).toBe(true)
  for (const path of ['/', '/contact/', '/es/contacto/', '/rss.xml', '/es/rss.xml']) {
    expect(
      routes.physicalRouteOf(path, platform),
      `tenant #1 must not rewrite its established physical path ${path}`,
    ).toBe(path)
  }
})

test('the repo page list is the exporter’s list, byte for byte', async () => {
  /**
   * WHY THIS TEST EXISTS
   * --------------------
   * `SiteTenant.pages` in `src/data/site-tenants.ts` is a COPY. The original is
   * the `published_routes` that `scripts/export-site-content.mjs` derives from
   * this repository's own message catalogues and blog collection, and that is
   * what seeds the API's fixture for this tenant.
   *
   * Two copies of a list is a drift waiting to happen, and the drift is silent
   * in both directions: a route in the repo copy and not in the export is a page
   * the API will not publish once the manifest moves; a route in the export and
   * not in the copy is a page the local build and the browser suite refuse while
   * production serves it. Nothing goes red on its own — the copy has no other
   * reader that could disagree with it.
   *
   * `--check` verifies the map and prints only counts, so the comparison runs
   * the exporter with `--out` into a temp file and compares the SETS.
   */
  const { tenants } = await loaded()
  const { platform } = tenantsBySlug(tenants)

  const out = join(mkdtempSync(join(tmpdir(), 'site-export-')), 'fixture.json')
  execFileSync('node', ['scripts/export-site-content.mjs', '--out', out], {
    cwd: ROOT,
    stdio: 'pipe',
  })
  const exported: string[] = JSON.parse(readFileSync(out, 'utf8')).published_routes

  expect(exported.length, 'the exporter produced no routes — broken probe, the comparison below would be vacuous').toBeGreaterThan(0)
  expect(
    [...platform.pages].sort(),
    'src/data/site-tenants.ts and scripts/export-site-content.mjs disagree about which pages this tenant publishes',
  ).toEqual([...exported].sort())

  // The floor the task asks for, kept even though the comparison above subsumes
  // it: if the exporter ever stops emitting `published_routes`, the equality
  // would compare two empty-ish things and these named routes are what catches it.
  expect(platform.pages.length).toBe(26)
  expect(new Set(platform.pages).size, 'a route is listed twice in the repo manifest').toBe(26)
  for (const route of ['/', '/pricing/', '/blog/', '/changelog/', '/for-developers/']) {
    expect(platform.pages, `the repo manifest dropped ${route}`).toContain(route)
  }
  const posts = platform.pages.filter((p) => p.startsWith('/blog/') && p !== '/blog/')
  expect(posts.length, 'the eight blog posts are not in the page set — the blog index would list posts the tenant refuses').toBe(8)
})

// ───────────────────────────────────────────────────────────────────────────
// THE CONTROL NEGATIVE FOR THE GATE ITSELF
// ───────────────────────────────────────────────────────────────────────────

test('CONTROL: with the gate neutralised, the clinic publishes 1Platform’s pages', async () => {
  /**
   * Part A asserts the clinic answers 404 on five of 1Platform's addresses.
   * That is only evidence if the same subject, with the guard removed, answers
   * differently — so here is the guard removed.
   *
   * The mutation is applied to the SOURCE, in memory, by a Vite transform:
   * `isPublishedRequest` is made to `return true` unconditionally, which is
   * exactly the pre-F3 behaviour (the page list had no reader on the request
   * path). Nothing on disk is touched and the running server is untouched, so
   * this cannot leave a mutated file behind or disturb a concurrent run.
   */
  const neutralise: Plugin = {
    name: 'neutralise-the-page-gate',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (!id.endsWith('/src/lib/site-routes.ts')) return null
      const anchor = 'export function isPublishedRequest(pathname: string, tenant: SiteTenant): boolean {'
      // A refactor that moves the signature must not turn this control into a
      // silent no-op: it fails here, loudly, instead of "passing".
      if (!code.includes(anchor)) throw new Error('control negative: mutation anchor not found in site-routes.ts')
      return code.replace(anchor, `${anchor}\n  return true // ← MUTATION`)
    },
  }

  const { routes, tenants, server } = await loadRoutes([neutralise])
  try {
    const { clinic } = tenantsBySlug(tenants)

    const stillRefused = PLATFORM_ONLY_ROUTES.filter((r) => !routes.isPublishedRequest(r, clinic))
    expect(
      stillRefused,
      'the neutralised gate STILL refuses these routes, so the mutation did not take effect and ' +
        'the refusals asserted in part A are not evidence of anything',
    ).toEqual([])

    // And the unmutated module, loaded the same way, must refuse all five —
    // otherwise the difference above is not attributable to the mutation.
    const real = (await loaded()).routes
    expect(
      PLATFORM_ONLY_ROUTES.filter((r) => real.isPublishedRequest(r, clinic)),
      'the real gate lets the clinic publish 1Platform pages',
    ).toEqual([])
  } finally {
    await server.close()
  }
})
