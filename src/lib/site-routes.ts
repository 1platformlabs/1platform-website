import { translateFromEs, translateToEs } from '@i18n/routes'
import type { SiteTenant } from './site-api'
import { localesOf, makeLocalizePath } from './site-locale'

/**
 * Every URL this site publishes, enumerated at request time.
 *
 * WHY THIS EXISTS INSTEAD OF `@astrojs/sitemap`
 * ---------------------------------------------
 * That integration runs at BUILD time and enumerates the route table. Under one
 * build serving N brands there is nothing for it to enumerate: the page set is a
 * property of the tenant asking, not of the build.
 *
 * It also stopped being able to see the blog. The moment those routes became
 * dynamic — which they had to, because a prerendered page has no request and so
 * no tenant — the integration dropped all sixteen of them. Measured: 52 `<loc>`
 * before, 36 after, with the build exiting 0 and printing success. Sixteen
 * indexed URLs disappearing silently is exactly the class of failure this epic
 * exists to stop shipping, so the sitemap becomes a rendered route.
 *
 * WHERE THE ROUTE LIST COMES FROM, HONESTLY
 * -----------------------------------------
 * Two sources, both the same ones the site itself renders from:
 *
 *   · the file router, globbed at build time — still the truth about which
 *     pages exist, because the page set does not become tenant data until the
 *     content moves to the API;
 *   · the content collections, for the blog, read per request.
 *
 * When the page set becomes a manifest field, this function reads it from the
 * tenant instead and the callers do not change shape. That is the point of
 * putting the enumeration behind one function rather than inline in a route.
 */

/**
 * The file router's own view of which pages exist.
 *
 * `import.meta.glob` is resolved by the bundler, so this is a build-time
 * enumeration of real files — it cannot drift from the routes that exist the way
 * a hand-kept list would. `eager: false` keeps the modules out of the bundle:
 * only the KEYS are wanted.
 */
const PAGE_MODULES = import.meta.glob('/src/pages/**/*.astro')

/** `/src/pages/es/nosotros.astro` -> `/es/nosotros/` · `index.astro` -> `/` */
function pathOfPageModule(file: string): string | null {
  let p = file.replace(/^\/src\/pages/, '').replace(/\.astro$/, '')
  // A dynamic segment cannot be enumerated from its filename; those routes
  // contribute their URLs from the collections below instead.
  if (p.includes('[')) return null
  // Astro's file router ignores anything prefixed with an underscore.
  if (p.split('/').some((seg) => seg.startsWith('_'))) return null
  if (p.endsWith('/index')) p = p.slice(0, -'index'.length)
  else if (p === '/index') p = '/'
  else p = p + '/'
  return p === '' ? '/' : p
}

/**
 * Addresses that exist but must never be nominated to a crawler.
 *
 * `/404` is not a page anyone should be sent to, and the two `.well-known`-ish
 * files are not pages at all.
 */
const NEVER_INDEXED = new Set(['/404/'])

export interface SiteUrl {
  /** Root-relative, always with a trailing slash except the root itself. */
  path: string
  /** The `hreflang` pairs for this URL, or none when the tenant is monolingual. */
  alternates: Array<{ lang: string; path: string }>
}

/**
 * The published URL set for a tenant.
 *
 * ⚠️ THE PAGE SET IS `tenant.pages`, NOT THE FILE ROUTER.
 *
 * This function used to glob `src/pages/**` and hand every tenant the same 36
 * addresses. That is what made the page set a property of the BUILD, and the
 * failure was silent and specific: a tenant declaring `locales: ['es']` still
 * received the eighteen ENGLISH paths of 1Platform in its sitemap — `/pricing/`
 * with the platform's prices, `/for-developers/`, `/solutions/whitelabel/` —
 * because only the blog half was ever filtered by locale. Nothing went red;
 * `tenant.pages` simply had no reader anywhere in the tree.
 *
 * Now the manifest decides, and the URL for each canonical route is derived
 * through the tenant's OWN topology (`makeLocalizePath`), so the tenant whose
 * default locale is Spanish publishes at the root rather than under `/es/`.
 *
 * For 1Platform this reproduces the previous answer exactly — 26 canonical
 * routes × 2 locales = the same 52 URLs, with the same alternates — which is
 * what keeps the no-regression checkable while the source of truth moves.
 *
 * The file router still has one job here, and only one: `assertRoutesExist`
 * below cross-checks that every canonical route the manifest publishes is
 * actually served by a file. A manifest naming a page nobody implemented is a
 * sitemap entry that 404s, which is worse than omitting it.
 */
export async function publishedUrls(tenant: SiteTenant): Promise<SiteUrl[]> {
  const locales = localesOf(tenant)
  const localise = makeLocalizePath(tenant)
  const bilingual = locales.includes('en') && locales.includes('es')

  const canonical = tenant.pages.filter((p) => !NEVER_INDEXED.has(p))

  const all = [
    ...new Set(canonical.flatMap((path) => locales.map((locale) => localise(path, locale)))),
  ].sort()

  return all.map((path) => {
    if (!bilingual) return { path, alternates: [] }
    // The canonical (English) address of this page, and its Spanish twin. The
    // pairing is rebuilt from the route map rather than by stripping a prefix,
    // because a translated slug (`/solutions/deliveries/` ->
    // `/es/soluciones/envios/`) does not match by string equality and the naive
    // version emits NO pair for either side, silently, on every translated page.
    const canonical = path.startsWith('/es/') || path === '/es/' ? englishOf(path) : path
    return {
      path,
      alternates: [
        { lang: 'en', path: canonical },
        { lang: 'es', path: translateToEs(canonical) },
      ],
    }
  })
}

/** The English address a Spanish one translates back to. */
function englishOf(spanish: string): string {
  // The route map owns the translated slugs; anything it does not know is an
  // untranslated address whose English twin is the same path without the
  // prefix — which is right for blog posts, whose slugs differ per language and
  // are paired by the collection rather than by the map.
  return translateFromEs(spanish)
}

/**
 * Canonical routes the manifest publishes that NO file in `src/pages` serves.
 *
 * The manifest decides the page set, and that is the right direction — but it
 * makes a new failure possible that could not exist while the file router was
 * the source of truth: a route named in `SiteTenant.pages` with nothing behind
 * it. The visitor's symptom is a 404 on a URL the sitemap nominated, which is
 * the worst combination (a crawler is told the page exists, follows it, and is
 * refused).
 *
 * Reported rather than thrown. This runs on the request path of the sitemap and
 * of the guards, and taking a tenant's whole site down because one route in its
 * manifest is ahead of the code is a worse answer than serving the other
 * twenty-five and saying so. `tests/tenant-pages-are-served.spec.ts` is what
 * makes it fail somewhere it matters.
 *
 * Dynamic segments are honoured: `/blog/<anything>/` is served by
 * `blog/[...slug].astro`, so a post route is covered by its prefix rather than
 * by a file of its own.
 */
export function unservedRoutes(tenant: SiteTenant): string[] {
  const files = Object.keys(PAGE_MODULES)
  const staticPaths = new Set(
    files.map(pathOfPageModule).filter((p): p is string => p !== null),
  )

  // Prefixes owned by a catch-all route, derived from the file names rather
  // than listed: `/src/pages/blog/[...slug].astro` -> `/blog/`.
  const dynamicPrefixes = files
    .filter((f) => f.includes('['))
    .map((f) => {
      const withoutRoot = f.replace('/src/pages', '').replace(/\.astro$/, '')
      const cut = withoutRoot.indexOf('/[')
      return cut === -1 ? null : `${withoutRoot.slice(0, cut)}/`
    })
    .filter((p): p is string => p !== null)

  return tenant.pages.filter((route) => {
    if (NEVER_INDEXED.has(route)) return false
    if (staticPaths.has(route)) return false
    return !dynamicPrefixes.some((prefix) => route.startsWith(prefix))
  })
}

/**
 * Paths that exist for every tenant regardless of its page list.
 *
 * These are not pages: they are the machinery a site is served through. Gating
 * them on `SiteTenant.pages` would mean every manifest had to enumerate its own
 * favicon, and forgetting one would break the site in a way the page list was
 * never meant to express.
 *
 * `/_image` and `/_astro/` are the adapter's; `/og/`, `/fonts/`, the favicon and
 * the touch icon are static assets. The sitemap, robots and feeds ARE gated,
 * but on their own terms and by their own handlers — see `isPublishedRequest`.
 */
const INFRASTRUCTURE_PREFIXES = [
  '/_image',
  '/_astro/',
  '/og/',
  '/fonts/',
  '/favicon.svg',
  '/logo-oauth-120x120.png',
]

/** Routes whose handler applies its own tenant rule. */
const SELF_GATED = new Set([
  '/robots.txt',
  '/sitemap-index.xml',
  '/sitemap-0.xml',
])

/**
 * The canonical (default-locale) route a request address maps to.
 *
 * `/es/precios/` -> `/pricing/` for a tenant whose default is English; for a
 * tenant whose default IS Spanish there is no prefix to strip and the address
 * is already canonical.
 */
export function canonicalRouteOf(pathname: string, tenant: SiteTenant): string {
  const withSlash = pathname.endsWith('/') || pathname.includes('.') ? pathname : `${pathname}/`
  const locales = localesOf(tenant)
  const fallback = locales[0]
  if (fallback === 'es') return withSlash
  return withSlash.startsWith('/es/') || withSlash === '/es/'
    ? translateFromEs(withSlash)
    : withSlash
}

/**
 * May this tenant serve this address at all?
 *
 * ⚠️ THIS IS WHAT MAKES `SiteTenant.pages` A REAL DATUM RATHER THAN A LABEL.
 *
 * Without it the page list only ever reached the sitemap, so a clinic that
 * published six pages still SERVED all forty-three of 1Platform's — including
 * `/pricing/` with the platform's own prices and `/for-developers/`. The
 * sitemap omitted them and the file router happily rendered them to anyone who
 * asked, which is the shape of leak that stays invisible until a crawler
 * follows an external link.
 *
 * The feeds are gated on the section they describe rather than listed: an RSS
 * feed of a blog the tenant does not publish is the same leak wearing an XML
 * content type.
 */
export function isPublishedRequest(pathname: string, tenant: SiteTenant): boolean {
  if (INFRASTRUCTURE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true
  if (SELF_GATED.has(pathname)) return true

  // Domain-ownership verification. The PATH is tenant data (it is the token),
  // so it cannot be listed above — and the route itself compares it against the
  // manifest and answers 404 when it does not match. Letting it through here is
  // not a hole: `src/pages/[token].html.ts` is the gate, and it is a stricter
  // one than a page list (it matches exactly one string per tenant, and none at
  // all for a tenant that declares no token).
  //
  // Measured while wiring this: without this branch the middleware answered 404
  // for the DECLARING tenant too, so the positive control failed and the route
  // looked correct while verifying nothing.
  //
  // It matches the EXACT declared token and not the shape, and that second
  // measurement is why: allowing the shape let `[token].html.ts` answer for
  // every `*.html` address, which shadowed `/404.html` — the browser suite
  // caught it, because two language-switcher tests navigate there and got a
  // bare text body instead of the rendered 404 page.
  if (
    tenant.google_site_verification &&
    pathname === `/${tenant.google_site_verification}.html`
  ) {
    return true
  }

  const published = new Set(tenant.pages)

  // The feeds follow their section. `/rss.xml` and `/es/rss.xml` both describe
  // the blog; the changelog feeds describe the changelog.
  if (pathname.endsWith('/rss.xml') || pathname === '/rss.xml') return published.has('/blog/')
  if (pathname.endsWith('feed.xml')) return published.has('/changelog/')

  // 404 is reachable by definition — it is what a refusal renders.
  if (pathname === '/404' || pathname === '/404/') return true

  return published.has(canonicalRouteOf(pathname, tenant))
}
