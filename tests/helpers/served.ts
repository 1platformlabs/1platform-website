/**
 * Reading the site as it is SERVED, which is the only place it exists now.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Nine spec files used to do `readFileSync(join('dist', file))` and walk the
 * built tree. That was honest while every page was a file: the artefact on disk
 * was byte-for-byte the artefact production served.
 *
 * The site now has a Node adapter, so the build emits `dist/client` (assets and
 * the handful of prerendered pages) and `dist/server` (the code that renders
 * everything else). A page is no longer a file. The specs that walked `dist/`
 * therefore lost their subject — and the failure mode matters: pointed at a
 * directory that no longer holds pages, a walker finds nothing and a test that
 * says "for every page, assert X" passes **vacuously**. Thirty specs went red
 * here, which is the good outcome; the dangerous ones are the ones that would
 * have gone green.
 *
 * The rule this file follows is the epic's: a spec that loses its subject gets
 * REWRITTEN to look at the served HTML, never relaxed and never deleted.
 *
 * WHY THE SITEMAP IS THE ROUTE SOURCE
 * -----------------------------------
 * Repointing the walkers at `dist/client` would work today and rot silently:
 * from F4 the pages stop being prerendered, so the walk would find only the few
 * that still are and every "for every page" assertion would quietly shrink to a
 * handful while staying green. That is precisely the broken-probe failure the
 * epic is trying to avoid.
 *
 * The sitemap is generated from the real route table, is served by the site,
 * and is the thing the epic already turns into a per-tenant resource — so the
 * same helper, pointed at a tenant's host, will enumerate that tenant's pages
 * without changing shape. Measured against the frozen F0 baseline: the sitemap
 * lists 52 URLs, and 52 + 46 redirects + the 404 + the domain-verification file
 * is exactly the 100 HTML routes the static build emitted. It is the complete
 * set of real pages, not a sample.
 *
 * Everything here asserts a FLOOR. A scanner that finds nothing must fail
 * loudly, or it degrades into a gate that cannot fail.
 */

import { expect } from '@playwright/test'

/** Fewer than this many pages means the enumeration broke, not that the site shrank. */
const MIN_EXPECTED_ROUTES = 40

const base = () => `http://localhost:${Number(process.env.PLAYWRIGHT_PORT ?? 4321)}`

/**
 * `Host` is how a tenant is chosen from F4 on. Until then every call resolves
 * the one tenant there is, and passing a host explicitly already works — which
 * is what lets the isolation specs interleave two hosts without new plumbing.
 */
export interface ServedOptions {
  host?: string
}

async function get(path: string, opts: ServedOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { connection: 'close' }
  if (opts.host) headers.host = opts.host
  return fetch(base() + path, { headers, redirect: 'manual' })
}

/** The HTML a visitor receives for `path`. Throws on any non-200 — a spec that
 *  wants to assert about a page should not silently receive a redirect body. */
export async function servedHtml(path: string, opts: ServedOptions = {}): Promise<string> {
  const res = await get(path, opts)
  if (res.status !== 200) {
    throw new Error(`expected 200 for ${path}, got ${res.status} (${res.headers.get('location') ?? 'no location'})`)
  }
  return res.text()
}

/** Status and headers without the body, for redirect and contract assertions. */
export async function servedHead(
  path: string,
  opts: ServedOptions = {},
): Promise<{ status: number; location: string | null; headers: Headers; body: string }> {
  const res = await get(path, opts)
  const body = await res.text()
  return { status: res.status, location: res.headers.get('location'), headers: res.headers, body }
}

/** Any served resource as text, whatever its status — sitemaps, robots, feeds. */
export async function servedText(path: string, opts: ServedOptions = {}): Promise<string> {
  const res = await get(path, opts)
  return res.text()
}

let cachedRoutes: string[] | null = null

/**
 * Every page the site publishes, as root-relative paths ending in `/`.
 *
 * Deliberately NOT memoised across hosts: from F4 the answer depends on which
 * tenant asked, and a cache keyed on nothing is how one tenant's page list ends
 * up answering for another.
 */
export async function publishedRoutes(opts: ServedOptions = {}): Promise<string[]> {
  if (!opts.host && cachedRoutes) return cachedRoutes

  const xml = await servedText('/sitemap-0.xml', opts)
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  const routes = locs
    .map((u) => {
      try {
        return new URL(u).pathname
      } catch {
        return null
      }
    })
    .filter((p): p is string => Boolean(p))
    .sort()

  expect(
    routes.length,
    `the sitemap enumerated ${routes.length} routes, below the floor of ${MIN_EXPECTED_ROUTES}. ` +
      `That is a broken enumeration, not a smaller site — every "for every page" assertion ` +
      `downstream would pass vacuously.`,
  ).toBeGreaterThanOrEqual(MIN_EXPECTED_ROUTES)

  if (!opts.host) cachedRoutes = routes
  return routes
}

/** Every published page with its HTML, fetched concurrently in bounded batches. */
export async function publishedPages(
  opts: ServedOptions = {},
): Promise<Array<{ route: string; html: string }>> {
  const routes = await publishedRoutes(opts)
  const out: Array<{ route: string; html: string }> = []
  const BATCH = 12
  for (let i = 0; i < routes.length; i += BATCH) {
    const slice = routes.slice(i, i + BATCH)
    const htmls = await Promise.all(slice.map((r) => servedHtml(r, opts)))
    slice.forEach((route, j) => out.push({ route, html: htmls[j] }))
  }
  return out
}

/** The published pages under `/es/`, and the rest. Both sides get a floor. */
export async function publishedPagesByLocale(opts: ServedOptions = {}) {
  const pages = await publishedPages(opts)
  const es = pages.filter((p) => p.route === '/es/' || p.route.startsWith('/es/'))
  const en = pages.filter((p) => !(p.route === '/es/' || p.route.startsWith('/es/')))
  expect(es.length, 'no Spanish pages were enumerated — broken probe').toBeGreaterThan(0)
  expect(en.length, 'no English pages were enumerated — broken probe').toBeGreaterThan(0)
  return { en, es, all: pages }
}

/**
 * A built asset under `dist/client` — images, fonts, the OG cards. These really
 * are still files, so the specs that check an asset EXISTS keep reading disk;
 * only the specs that read PAGES had to move.
 */
export const CLIENT_DIR = 'dist/client'
