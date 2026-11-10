/**
 * D-7 · does this blog address exist? Asked of the cached archive of THIS site
 * and locale before anything renders (blog-sitio-de-marca-generado D-7/D-9).
 *
 *   ok           render it
 *   absent       the site's own 404 page (with its chrome), `no-store`
 *   unavailable  no data and no cache: 503 + Retry-After — never content of
 *                another site
 *
 * Editorial sites decide inside their own pages (their 404 is the preset's).
 * `/blog/` itself needs data only to say "unavailable"; a site that publishes
 * the section and has no posts yet renders an empty archive.
 *
 * The 8 legacy `/es/blog/<english-slug>/` addresses (D-10b,
 * `LEGACY_ES_BLOG_REDIRECTS`) are NOT special-cased here: Astro 7 answers a
 * configured redirect before the middleware runs, so they never reach this gate
 * (measured: forcing `unavailable` or `absent` for them left the 301 intact; the
 * serving test in `tests/blog-from-api.spec.ts` pins the behaviour, so a version
 * that ran middleware first would turn it red).
 */
import { checkListed, resolveArchive, resolvePost } from './site-blog'
import type { SiteTenant } from './site-api'
import { localeForRequest } from './site-locale'
import { blogPostSlugOf, canonicalRouteOf, isEditorialBlog } from './site-routes'

export type BlogGate = 'ok' | 'absent' | 'unavailable'

export async function blogGateFor(pathname: string, tenant: SiteTenant): Promise<BlogGate> {
  if (isEditorialBlog(tenant) || !tenant.pages.includes('/blog/')) return 'ok'
  const canonical = canonicalRouteOf(pathname, tenant)
  const locale = localeForRequest(pathname, tenant)

  if (canonical === '/blog/') {
    const archive = await resolveArchive(tenant.slug, locale)
    return archive.outcome === 'unavailable' ? 'unavailable' : 'ok'
  }

  const post = blogPostSlugOf(canonical)
  if (!post) return 'ok'

  const listed = await checkListed(tenant.slug, locale, post)
  if (listed !== 'listed') return listed
  // Listed but the body is gone (unpublished < 60 s ago): the site's 404.
  const body = await resolvePost(tenant.slug, locale, post)
  if (body.outcome === 'resolved') return 'ok'
  return body.outcome === 'absent' ? 'absent' : 'unavailable'
}
