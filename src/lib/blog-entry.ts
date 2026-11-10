/**
 * The blog entry the platform's templates read (blog-sitio-de-marca-generado
 * D-10c): a Core card dressed as the `{ id, data }` shape the components were
 * written against when the blog was a content collection.
 *
 * Keeping the shape means `bareSlug(post.id)`, `localeOf(post.id)` and every
 * `post.data.*` in the layouts and cards stay as they are; only the source
 * changed. `id` is `<locale>/<slug>`, the id the collection used to produce.
 */
import { resolveArchive, type BlogCard, type Resolved } from './site-blog'

export interface BlogData {
  title: string
  description: string
  pubDate: Date
  updatedDate?: Date
  author: string
  category: string
  image?: string
  ogImage?: string
  readingTime?: number
  tags?: string[]
  translationKey: string
}

export interface BlogEntry {
  id: string
  data: BlogData
}

export function toBlogEntry(card: BlogCard, locale: string, authorFallback: string, ogImage?: string | null): BlogEntry {
  const pubDate = new Date(card.published_at ?? 0)
  return {
    id: `${locale}/${card.slug}`,
    data: {
      title: card.title,
      description: card.description,
      pubDate,
      updatedDate: card.updated_at ? new Date(card.updated_at) : undefined,
      author: card.author ?? authorFallback,
      category: card.category,
      image: card.image ?? undefined,
      ogImage: ogImage ?? undefined,
      readingTime: card.reading_minutes ?? undefined,
      tags: card.tags,
      translationKey: card.translation_key,
    },
  }
}

/** Newest first; same-day posts by slug — the order `getLocalized` gave the files. */
export function byNewest(entries: BlogEntry[]): BlogEntry[] {
  return [...entries].sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf() || a.id.localeCompare(b.id),
  )
}

/**
 * One site's posts in one language, from the Core (cached archive, D-9).
 * `absent` = the site has no blog; `unavailable` = no data and no cache (the
 * caller answers 503 — the middleware already has by the time a page renders).
 */
export async function loadBlogEntries(
  tenant: { slug: string; brand_name: string },
  locale: string,
): Promise<Resolved<BlogEntry[]>> {
  const archive = await resolveArchive(tenant.slug, locale)
  if (archive.outcome !== 'resolved') return archive
  return {
    outcome: 'resolved',
    value: byNewest(archive.value.map((card) => toBlogEntry(card, locale, tenant.brand_name))),
  }
}

/** Posts or nothing: for the places (related posts) that degrade to an empty list. */
export async function blogEntriesOrEmpty(tenant: { slug: string; brand_name: string }, locale: string): Promise<BlogEntry[]> {
  const loaded = await loadBlogEntries(tenant, locale)
  return loaded.outcome === 'resolved' ? loaded.value : []
}
