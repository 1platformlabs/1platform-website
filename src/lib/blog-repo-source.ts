/**
 * The platform's blog in REPO mode (`SITE_MANIFEST_SOURCE=repo`, blog-sitio-de-
 * marca-generado D-10): a laptop and the browser suite have no Core to ask, so
 * the posts of `oneplatform` come from `src/data/blog-fixture.json`, generated
 * by `scripts/export-blog-posts.mjs` and shaped like what the Core serves.
 *
 * It is chosen explicitly and is never a fallback: production reads the API, and
 * an API that cannot answer is a 503, not this file. Only the fixture's own site
 * has posts here; any other slug has no blog.
 */
import fixture from '../data/blog-fixture.json'
import type { BlogCard, BlogPost } from './site-blog'

interface FixturePost {
  locale: string
  slug: string
  translation_key: string
  title: string
  description: string
  body: string
  category: string
  author: string | null
  tags: string[]
  image: string | null
  og_image: string | null
  illustration: string | null
  reading_minutes: number | null
  faq: { question: string; answer: string }[]
  status: string
  published_at: string
  updated_at: string
}

const POSTS = (fixture as { tenant: string; posts: FixturePost[] }).posts
const FIXTURE_SITE = (fixture as { tenant: string }).tenant

const card = (p: FixturePost): BlogCard => ({
  slug: p.slug,
  title: p.title,
  description: p.description,
  category: p.category,
  tags: p.tags,
  author: p.author,
  image: p.image,
  illustration: p.illustration,
  reading_minutes: p.reading_minutes,
  translation_key: p.translation_key,
  published_at: p.published_at,
  updated_at: p.updated_at,
})

/** Newest first, ties by slug — the Core's order. */
function published(locale: string): FixturePost[] {
  return POSTS.filter((p) => p.locale === locale && p.status === 'published').sort(
    (a, b) => Date.parse(b.published_at) - Date.parse(a.published_at) || a.slug.localeCompare(b.slug),
  )
}

export function repoPage(slug: string, locale: string, page: number, size: number) {
  if (slug !== FIXTURE_SITE) return null
  const all = published(locale)
  if (all.length === 0) return null
  return { items: all.slice((page - 1) * size, page * size).map(card), total: all.length }
}

export function repoPost(slug: string, locale: string, post: string): BlogPost | null {
  if (slug !== FIXTURE_SITE) return null
  const found = published(locale).find((p) => p.slug === post)
  if (!found) return null
  const alternates = Object.fromEntries(
    POSTS.filter((p) => p.translation_key === found.translation_key && p.locale !== locale && p.status === 'published').map(
      (p) => [p.locale, p.slug],
    ),
  )
  return { ...card(found), body: found.body, og_image: found.og_image, faq: found.faq, alternates, related: [] }
}
