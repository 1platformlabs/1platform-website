/**
 * A site's blog, read from the Core over HTTP (blog-sitio-de-marca-generado D-9, §23 E-8).
 *
 * Three reads, three caches, every key carrying the site AND the locale:
 *
 *   list       `slug:locale`        the whole archive (pages of 50, merged)
 *   post       `slug:locale:post`   one body
 *   editorial  `slug:locale`        the editorial block projected to a locale
 *
 * Search, category filter and pagination are computed by the page over the
 * cached LIST and are never cached on their own, so no key can mix one query's
 * answer with another's. A site without data and without cache gets
 * `SiteApiUnavailable` (the caller answers 503) — never another site's posts.
 *
 * A slug that is not in the cached list triggers, at most once per 5 s per
 * (site, locale), a single-flight re-read of PAGE 1 only (where a newly
 * published post lands), bounded by a global budget; failing that, the page
 * answers the site's 404 — never 503 — and the miss is not remembered.
 */
import { manifestSource } from '../data/site-tenants'
import { repoPage, repoPost } from './blog-repo-source'
import { apiBaseUrl, API_TIMEOUT_MS, SiteApiUnavailable } from './site-api'
import { MissBudget, TenantCache } from './tenant-cache'

export interface BlogCard {
  slug: string
  title: string
  description: string
  category: string
  tags: string[]
  author: string | null
  image: string | null
  illustration: string | null
  reading_minutes: number | null
  translation_key: string
  published_at: string | null
  updated_at: string | null
}

export interface BlogPost extends BlogCard {
  body: string
  og_image: string | null
  faq: { question: string; answer: string }[]
  alternates: Record<string, string>
  related: BlogCard[]
}

export interface EditorialCategory {
  id: string
  name: string
  description: string
}

export interface Editorial {
  locale: string
  categories: EditorialCategory[]
  home: { kicker: string | null; title: string; intro: string; featured_post: string | null; illustration: string } | null
  reading_paths: { id: string; title: string; description: string; post: string }[]
  cta: { url: string; presentation: 'band' | 'card'; title: string; body: string; button: string } | null
  byline: string | null
  legal: { text: string; approved: boolean } | null
  newsletter: { available: false } | { available: true; title: string; body: string; consent_text: string; button: string }
  palette: { canvas: string; ink: string; highlight: string }
  reading_font: 'system-serif' | 'system-sans'
}

export const ILLUSTRATIONS = [
  'chain', 'connections', 'grid', 'labels', 'lines', 'orbit', 'pages', 'pairs', 'questions',
] as const

const PAGE_SIZE = 50
const MAX_PAGES = 10
const RESCUE_INTERVAL_MS = 5_000
const RESCUE_BUDGET_PER_MINUTE = 60
/** Body reads per minute, all sites: keeps the site inside the Core's shared 600/min bucket (D-4b/D-9). */
const POST_READ_BUDGET_PER_MINUTE = 240

const lists = new TenantCache<BlogCard[]>()
const posts = new TenantCache<BlogPost>()
const editorials = new TenantCache<Editorial>()
const lastRescue = new Map<string, number>()
const rescueFlights = new Map<string, Promise<void>>()
const rescueBudget = new MissBudget(RESCUE_BUDGET_PER_MINUTE)
const postReadBudget = new MissBudget(POST_READ_BUDGET_PER_MINUTE)

export const listKey = (slug: string, locale: string) => `${slug}:${locale}`
export const postKey = (slug: string, locale: string, post: string) => `${slug}:${locale}:${post}`

async function getJson(path: string): Promise<unknown | null> {
  const url = `${apiBaseUrl()}/api/v1${path}`
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT_MS), headers: { accept: 'application/json' } })
  } catch (cause) {
    throw new SiteApiUnavailable(`could not reach the site API for ${path}`, cause)
  }
  if (response.status === 404) return null
  if (!response.ok) throw new SiteApiUnavailable(`site API answered ${response.status} for ${path}`)
  let body: unknown
  try {
    body = await response.json()
  } catch (cause) {
    throw new SiteApiUnavailable(`site API returned a body that is not JSON for ${path}`, cause)
  }
  return body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : body
}

const enc = encodeURIComponent

function isCard(v: unknown): v is BlogCard {
  if (!v || typeof v !== 'object') return false
  const c = v as Record<string, unknown>
  return typeof c.slug === 'string' && typeof c.title === 'string' && typeof c.category === 'string'
}

async function fetchPage(slug: string, locale: string, page: number) {
  if (manifestSource() === 'repo') return repoPage(slug, locale, page, PAGE_SIZE)
  const data = (await getJson(`/sites/${enc(slug)}/blog?locale=${enc(locale)}&page=${page}&page_size=${PAGE_SIZE}`)) as
    | { items: unknown[]; total: number }
    | null
  if (data === null) return null
  if (!Array.isArray(data.items) || !data.items.every(isCard)) {
    throw new SiteApiUnavailable(`site API returned an unrecognised blog list for ${slug}/${locale}`)
  }
  return { items: data.items as BlogCard[], total: Number(data.total) || 0 }
}

/** The whole archive, deduplicated by slug, newest first. `null` = no blog. */
export async function fetchArchive(slug: string, locale: string): Promise<BlogCard[] | null> {
  const first = await fetchPage(slug, locale, 1)
  if (first === null) return null
  const all = [...first.items]
  const pages = Math.min(MAX_PAGES, Math.ceil(first.total / PAGE_SIZE))
  for (let page = 2; page <= pages; page++) {
    const next = await fetchPage(slug, locale, page)
    if (next) all.push(...next.items)
  }
  return dedupe(all)
}

function dedupe(cards: BlogCard[]): BlogCard[] {
  const seen = new Set<string>()
  return cards.filter((c) => (seen.has(c.slug) ? false : (seen.add(c.slug), true)))
}

export type Resolved<T> = { outcome: 'resolved'; value: T } | { outcome: 'absent' } | { outcome: 'unavailable'; reason: string }

async function resolveCached<T>(
  cache: TenantCache<T>,
  key: string,
  fetcher: () => Promise<T | null>,
  now = Date.now(),
  rememberAbsent = false,
): Promise<Resolved<T>> {
  const hit = cache.lookup(key, now)
  if (hit.value && hit.age === 'fresh') return { outcome: 'resolved', value: hit.value }
  if (hit.value && hit.age === 'stale') {
    cache.refreshInBackground(key, fetcher, now)
    return { outcome: 'resolved', value: hit.value }
  }
  // A site with no blog is asked again in 30 s, not on every request. Bodies are
  // not remembered as missing: a post republished a second ago must show.
  if (rememberAbsent && cache.isKnownMissing(key, now)) return { outcome: 'absent' }
  try {
    const value = await fetcher()
    if (value === null) {
      if (rememberAbsent) cache.rememberMissing(key, now)
      return { outcome: 'absent' }
    }
    cache.store(key, value, now)
    return { outcome: 'resolved', value }
  } catch (err) {
    return { outcome: 'unavailable', reason: err instanceof Error ? err.message : String(err) }
  }
}

export function resolveArchive(slug: string, locale: string): Promise<Resolved<BlogCard[]>> {
  return resolveCached(lists, listKey(slug, locale), () => fetchArchive(slug, locale), Date.now(), true)
}

export function resolveEditorial(slug: string, locale: string): Promise<Resolved<Editorial>> {
  return resolveCached(editorials, listKey(slug, locale), async () => {
    const data = (await getJson(`/sites/${enc(slug)}/blog/editorial?locale=${enc(locale)}`)) as Editorial | null
    if (data !== null && (!Array.isArray(data.categories) || typeof data.palette !== 'object')) {
      throw new SiteApiUnavailable(`site API returned an unrecognised editorial block for ${slug}/${locale}`)
    }
    return data
  })
}

export type Listed = 'listed' | 'absent' | 'unavailable'

/**
 * Is `post` in this site's archive?
 *
 *   listed       it is (in the cached archive, or in page 1 just re-read)
 *   absent       it is not; the site answers ITS 404 (also when the re-read failed:
 *                a Core that is down or rate-limiting never turns an invented slug into 503)
 *   unavailable  there is no archive at all (no cache, Core unreachable): 503
 *
 * Re-reads page 1 at most every 5 s per site and locale (single flight, global
 * budget) so a post published a second ago is visible to its first visitor, and
 * invented slugs cost at most one list read per interval.
 */
export async function checkListed(slug: string, locale: string, post: string, now = Date.now()): Promise<Listed> {
  const archive = await resolveArchive(slug, locale)
  if (archive.outcome === 'unavailable') return 'unavailable'
  if (archive.outcome === 'resolved' && archive.value.some((c) => c.slug === post)) return 'listed'
  const key = listKey(slug, locale)
  // `absent` (the site has no blog yet) also takes the rescue: its first post is page 1.
  if (now - (lastRescue.get(key) ?? 0) < RESCUE_INTERVAL_MS || !rescueBudget.allow(now)) return 'absent'
  lastRescue.set(key, now)
  let flight = rescueFlights.get(key)
  if (!flight) {
    flight = (async () => {
      try {
        const first = await fetchPage(slug, locale, 1)
        if (!first) return
        const current = lists.lookup(key, now).value
        const merged = dedupe([...first.items, ...(current ?? [])])
        if (current) lists.merge(key, merged)
        else lists.store(key, merged, now)
      } catch {
        /* the attempt is recorded; a failure resolves to the site's 404 */
      } finally {
        rescueFlights.delete(key)
      }
    })()
    rescueFlights.set(key, flight)
  }
  await flight
  return (lists.lookup(key, Date.now()).value ?? []).some((c) => c.slug === post) ? 'listed' : 'absent'
}

export async function postIsListed(slug: string, locale: string, post: string, now = Date.now()): Promise<boolean> {
  return (await checkListed(slug, locale, post, now)) === 'listed'
}

/** Raw HTML would pass through the renderer (F0). The Core refuses it at write
 * time; the site refuses to render it too. Code spans and fences are ignored. */
export function bodyHasRawHtml(body: string): boolean {
  let inFence = false
  for (const raw of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(raw)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (/<\s*[/!?a-zA-Z]/.test(raw.replace(/`[^`\n]*`/g, ''))) return true
  }
  return false
}

export async function resolvePost(slug: string, locale: string, post: string): Promise<Resolved<BlogPost>> {
  return resolveCached(posts, postKey(slug, locale, post), async () => {
    if (manifestSource() === 'repo') return repoPost(slug, locale, post)
    // The site's own ceiling on body reads (D-9): a burst of distinct, listed
    // slugs must not drain the Core's shared public bucket.
    if (!postReadBudget.allow(Date.now())) throw new SiteApiUnavailable('the site spent its post read budget for this minute')
    const data = (await getJson(`/sites/${enc(slug)}/blog/${enc(post)}?locale=${enc(locale)}`)) as BlogPost | null
    if (data === null) return null
    if (!isCard(data) || typeof data.body !== 'string') {
      throw new SiteApiUnavailable(`site API returned an unrecognised post for ${slug}/${locale}`)
    }
    if (bodyHasRawHtml(data.body)) {
      throw new SiteApiUnavailable(`post ${slug}/${locale}/${post} carries raw HTML; refusing to render it`)
    }
    return data
  })
}

/** Case- and accent-insensitive form (E-1 / BSM-07 CA-3). */
export function fold(text: string): string {
  return (text ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('und')
}

/** Every word of the query must appear in title, category name or excerpt. */
export function searchCards(cards: BlogCard[], query: string, categoryName: (id: string) => string): BlogCard[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return cards
  return cards.filter((c) => {
    const hay = fold(`${c.title} ${c.description} ${categoryName(c.category)}`)
    return words.every((w) => hay.includes(w))
  })
}

export const __testing = { lists, posts, editorials, lastRescue, resetRescue: () => { rescueBudget.reset(); postReadBudget.reset() } }
