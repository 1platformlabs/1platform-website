import { postPaths } from '@i18n/collections'
import { translateFromEs, translateToEs } from '@i18n/routes'

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
 * `locales` decides whether alternates are emitted at all: a monolingual tenant
 * that advertised `hreflang` pairs would be pointing search engines at pages it
 * does not publish. The platform's own site declares two; the clinic declares
 * one.
 */
export async function publishedUrls(locales: readonly string[]): Promise<SiteUrl[]> {
  const bilingual = locales.includes('en') && locales.includes('es')

  const staticPaths = Object.keys(PAGE_MODULES)
    .map(pathOfPageModule)
    .filter((p): p is string => p !== null && !NEVER_INDEXED.has(p))

  const blogPaths: string[] = []
  for (const locale of locales) {
    if (locale !== 'en' && locale !== 'es') continue
    const posts = await postPaths(locale as 'en' | 'es')
    const prefix = locale === 'es' ? '/es/blog/' : '/blog/'
    for (const post of posts) blogPaths.push(`${prefix}${post.params.slug}/`)
  }

  const all = [...new Set([...staticPaths, ...blogPaths])].sort()

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
