/**
 * The sitemap's blog half (blog-sitio-de-marca-generado D-10d).
 *
 * One entry per published post of THIS site in every locale it declares, built
 * from the cached archives. The hreflang pairs are the Core's: two posts are
 * twins when they share a `translation_key` (the Core only pairs published posts
 * of the same site in a declared locale), so a post with no twin — legitimate for
 * the ones the agent writes in one language — carries no alternates, and a pair
 * can never point at a URL the sitemap does not list (both sides come from the
 * same archives).
 */
import type { SiteTenant } from './site-api'
import type { SiteUrl } from './site-routes'
import { localesOf } from './site-locale'
import { resolveArchive, type BlogCard } from './site-blog'

export async function blogPostUrls(
  tenant: SiteTenant,
  localizePath: (path: string, locale: never) => string,
): Promise<SiteUrl[] | null> {
  const localise = localizePath as (path: string, locale: string) => string
  const byLocale = new Map<string, BlogCard[]>()
  for (const locale of localesOf(tenant)) {
    const archive = await resolveArchive(tenant.slug, locale)
    if (archive.outcome === 'unavailable') return null
    if (archive.outcome === 'resolved') byLocale.set(locale, archive.value)
  }
  const twins = new Map<string, { lang: string; slug: string }[]>()
  for (const [lang, cards] of byLocale) {
    for (const card of cards) {
      const list = twins.get(card.translation_key) ?? []
      list.push({ lang, slug: card.slug })
      twins.set(card.translation_key, list)
    }
  }
  const urls: SiteUrl[] = []
  for (const [lang, cards] of byLocale) {
    for (const card of cards) {
      const pair = twins.get(card.translation_key) ?? []
      urls.push({
        path: localise(`/blog/${card.slug}/`, lang),
        alternates:
          pair.length > 1 ? pair.map((t) => ({ lang: t.lang, path: localise(`/blog/${t.slug}/`, t.lang) })) : [],
      })
    }
  }
  return urls
}
