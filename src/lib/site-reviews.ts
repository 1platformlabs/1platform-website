/**
 * The reviews section of a tenant's landing (landing-reviews-tenant).
 *
 * The tenant's owner manages these from their panel; the API answers, per site,
 * only the reviews that are published AND authorised, already ordered, plus the
 * summary over all of them (`GET /api/v1/sites/{slug}/reviews`).
 *
 * TWO DIFFERENCES FROM `site-content.ts`, BOTH DELIBERATE
 * ------------------------------------------------------
 * 1. It never takes the page down. Copy is the page — without it there is
 *    nothing to render, so the content resolver answers 503. Reviews are ONE
 *    section: an API that cannot answer means the section is not drawn, and
 *    the rest of the landing renders exactly as it did before this feature.
 * 2. A failure WITHOUT a cached copy is remembered for `NEGATIVE_MS`. The home
 *    waits on this read, so with the API down every render would otherwise pay
 *    the full `API_TIMEOUT_MS`; remembering the miss limits that to one slow
 *    render per window.
 *
 * CONSISTENCY
 * -----------
 * The same `TenantCache` contract as the copy: an entry is fresh for
 * `FRESH_MS` (60 s) and then served stale while ONE refresh runs behind the
 * visitor. So a review the owner publishes, hides or reorders shows within a
 * minute plus one request, and the panel says "within a minute". Keyed by the
 * tenant slug: no request can read another tenant's entry.
 *
 * `repo` mode (local preview, the browser suite's default server) never asks
 * the API: those tenants are fixtures, and the default API base is production.
 */

import { manifestSource } from '../data/site-tenants'
import { apiBaseUrl, API_TIMEOUT_MS, SiteApiUnavailable } from './site-api'
import { TenantCache } from './tenant-cache'

export type ReviewSource = 'direct' | 'whatsapp' | 'manual'
export type ReviewSort = 'featured' | 'newest'

export interface PublicReview {
  author: string
  context: string | null
  body: string
  rating: 1 | 2 | 3 | 4 | 5
  source: ReviewSource
  /** `YYYY-MM-DD`, the day the review was entered. */
  date: string
}

export interface ReviewSummary {
  count: number
  /** `null` when nothing is public: no rating is invented. */
  average: number | null
  histogram: Record<'1' | '2' | '3' | '4' | '5', number>
}

export interface SiteReviews {
  enabled: boolean
  /** The owner's heading, or `null` to use the block's own one in the page's language. */
  title: string | null
  subtitle: string | null
  sort: ReviewSort
  pageSize: number
  summary: ReviewSummary
  reviews: PublicReview[]
}

const cache = new TenantCache<SiteReviews>()

const SOURCES: readonly string[] = ['direct', 'whatsapp', 'manual']
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** The API wraps success payloads; accept both shapes. */
function unwrap(body: unknown): unknown {
  if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
    return (body as Record<string, unknown>).data
  }
  return body
}

function isRating(value: unknown): value is PublicReview['rating'] {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5
}

function toReview(value: unknown): PublicReview | null {
  if (!value || typeof value !== 'object') return null
  const r = value as Record<string, unknown>
  if (typeof r.author !== 'string' || !r.author.trim()) return null
  if (typeof r.body !== 'string' || !r.body.trim()) return null
  if (!isRating(r.rating)) return null
  if (typeof r.date !== 'string' || !DATE.test(r.date)) return null
  const context = typeof r.context === 'string' && r.context.trim() ? r.context : null
  const source = typeof r.source === 'string' && SOURCES.includes(r.source) ? (r.source as ReviewSource) : 'manual'
  return { author: r.author, context, body: r.body, rating: r.rating, source, date: r.date }
}

/**
 * A structural check, not a cast. A malformed review is DROPPED rather than
 * failing the section — but the summary is the server's and is only trusted
 * when it is coherent: a count that disagrees with its own histogram is the
 * one shape that would print a rating nobody gave.
 */
export function parseSiteReviews(value: unknown): SiteReviews | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.enabled !== 'boolean') return null
  if (!v.enabled) return disabled()
  // The section is ON from the start and its title is optional: `null` or blank
  // means the block draws its own heading. Anything else is not a title.
  if (v.title != null && typeof v.title !== 'string') return null
  const title = typeof v.title === 'string' && v.title.trim() ? v.title : null
  const summary = v.summary as Record<string, unknown> | undefined
  const histogram = summary?.histogram as Record<string, unknown> | undefined
  if (!summary || !histogram || !Number.isInteger(summary.count)) return null
  const bars = {} as ReviewSummary['histogram']
  let total = 0
  for (const rating of ['1', '2', '3', '4', '5'] as const) {
    const count = histogram[rating]
    if (!Number.isInteger(count) || (count as number) < 0) return null
    bars[rating] = count as number
    total += count as number
  }
  const count = summary.count as number
  const average = typeof summary.average === 'number' && Number.isFinite(summary.average) ? summary.average : null
  if (total !== count || (count === 0) !== (average === null)) return null
  if (!Array.isArray(v.reviews)) return null
  const pageSize = v.page_size === 6 ? 6 : 3
  return {
    enabled: true,
    title,
    subtitle: typeof v.subtitle === 'string' && v.subtitle.trim() ? v.subtitle : null,
    sort: v.sort === 'newest' ? 'newest' : 'featured',
    pageSize,
    summary: { count, average, histogram: bars },
    reviews: v.reviews.map(toReview).filter((r): r is PublicReview => r !== null),
  }
}

function disabled(): SiteReviews {
  return {
    enabled: false,
    title: null,
    subtitle: null,
    sort: 'featured',
    pageSize: 3,
    summary: { count: 0, average: null, histogram: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
    reviews: [],
  }
}

/**
 * Fetch one site's section. `null` = the API answered and there is no section
 * to show (404 for an unpublished site, or an API that does not serve the
 * route yet); throws when the API did not answer usefully.
 */
export async function fetchSiteReviews(slug: string, signal?: AbortSignal): Promise<SiteReviews | null> {
  const url = `${apiBaseUrl()}/api/v1/sites/${encodeURIComponent(slug)}/reviews`
  const timeout = AbortSignal.timeout(API_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { accept: 'application/json' },
    })
  } catch (cause) {
    throw new SiteApiUnavailable(`could not reach the reviews of ${slug}`, cause)
  }
  if (response.status === 404) return null
  if (!response.ok) throw new SiteApiUnavailable(`reviews of ${slug} answered ${response.status}`)
  let body: unknown
  try {
    body = await response.json()
  } catch (cause) {
    throw new SiteApiUnavailable(`reviews of ${slug} returned a body that is not JSON`, cause)
  }
  const parsed = parseSiteReviews(unwrap(body))
  if (parsed === null) throw new SiteApiUnavailable(`reviews of ${slug} returned an unrecognised shape`)
  return parsed
}

/**
 * Whether a parsed section is worth a block on the page. The section is on by
 * default for EVERY site — including ones nobody manages yet — so a block with
 * no public review would put «the first reviews will appear here» on landings
 * where none ever will. Nothing is drawn until there is something to read.
 */
function drawable(section: SiteReviews): SiteReviews | null {
  return section.enabled && section.summary.count > 0 && section.reviews.length > 0 ? section : null
}

/**
 * The section to draw, or `null` to draw none. Never throws.
 *
 * @param now injected so freshness is testable without waiting
 */
export async function resolveSiteReviews(slug: string, now: number = Date.now()): Promise<SiteReviews | null> {
  if (manifestSource() === 'repo') return null
  const hit = cache.lookup(slug, now)
  if (hit.age === 'fresh' && hit.value) return drawable(hit.value)
  if (hit.age === 'stale' && hit.value) {
    cache.refreshInBackground(slug, () => fetchSiteReviews(slug), now)
    return drawable(hit.value)
  }
  if (cache.isKnownMissing(slug, now)) return null
  try {
    const section = await fetchSiteReviews(slug)
    if (section === null) {
      cache.rememberMissing(slug, now)
      return null
    }
    cache.store(slug, section, now)
    return drawable(section)
  } catch {
    cache.rememberMissing(slug, now)
    return null
  }
}

/** Test seam. Production never calls this. */
export const __testing = { cache }
