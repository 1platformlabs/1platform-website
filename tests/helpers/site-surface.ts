import { repoTenants } from '../../src/data/site-tenants'
import { apiBaseUrl, type SiteTenant } from '../../src/lib/site-api'
import { localesOf, makeLocalizePath } from '../../src/lib/site-locale'

/**
 * Every (tenant, locale, url) this estate publishes.
 *
 * Extracted from `no-leak-across-tenants.spec.ts` (D-5, LAYER 2) so a second
 * guard that needs the same surface — `no-fabricated-claims-served.spec.ts`,
 * issue #101 — does not hand-write a second enumeration that can drift from
 * the first one silently.
 *
 * Derived from `SiteTenant.pages` rather than from the sitemap: a tenant with
 * `indexable: false` answers 404 for its sitemap on purpose, so a
 * sitemap-driven enumerator returns ZERO routes for exactly the tenant most
 * worth scanning — a provisional brand — and reports it clean.
 */
export interface SurfacePage {
  slug: string
  host: string
  locale: string
  /** The canonical, English-rooted route from `SiteTenant.pages` — e.g.
   *  `/blog/automate-seo-pipeline/` even when `url` is its Spanish address. */
  route: string
  url: string
}

export function surface(): SurfacePage[] {
  const out: SurfacePage[] = []
  for (const tenant of repoTenants()) {
    const localise = makeLocalizePath(tenant)
    for (const locale of localesOf(tenant)) {
      for (const route of tenant.pages) {
        out.push({ slug: tenant.slug, host: tenant.domain, locale, route, url: localise(route, locale) })
      }
    }
  }
  return out
}

/**
 * PRODUCTION mode (issue #101): the surface the API actually serves.
 *
 * `surface()` above walks the repo manifest, which is all a PR check can know —
 * CI has no API and a PR must not go red over live data. The tenants that live
 * ONLY in the API (the case #101 is about) are reached here instead, by the
 * scheduled workflow `served-claims.yml`, never by a pull request:
 *
 *   GET /api/v1/sites/published-hosts   -> the published, indexable hosts
 *   GET /api/v1/sites/by-host?host=…    -> each one's pages and locales
 *
 * and each page is then fetched from its real address, so what is scanned is
 * what a visitor receives. Provisional (`indexable: false`) sites are not
 * listed by the API and are therefore not scanned — a stated gap, not a pass.
 */

export function scanningProduction(): boolean {
  return process.env.SERVED_CLAIMS_TARGET === 'prod'
}

/**
 * Below this many listed hosts the run FAILS: an empty or truncated list is
 * indistinguishable, from the scan's own output, from an estate with no
 * defects. Two is what production lists today (1platform.pro, medipago.gt).
 */
export const MIN_PRODUCTION_HOSTS = Number(process.env.SERVED_CLAIMS_MIN_HOSTS || 2)

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, { headers: { accept: 'application/json' } })
  if (res.status !== 200) throw new Error(`GET ${path} answered ${res.status}`)
  const body = (await res.json()) as { data: T }
  return body.data
}

export async function publishedHosts(): Promise<string[]> {
  const { hosts } = await getJson<{ hosts: string[] }>('/api/v1/sites/published-hosts')
  return hosts
}

let productionCache: Promise<SurfacePage[]> | null = null

export function productionSurface(): Promise<SurfacePage[]> {
  productionCache ??= (async () => {
    const out: SurfacePage[] = []
    for (const host of await publishedHosts()) {
      const tenant = await getJson<SiteTenant>(`/api/v1/sites/by-host?host=${encodeURIComponent(host)}`)
      const localise = makeLocalizePath(tenant)
      for (const locale of localesOf(tenant)) {
        for (const route of tenant.pages) {
          out.push({ slug: tenant.slug, host: tenant.domain, locale, route, url: localise(route, locale) })
        }
      }
    }
    return out
  })()
  return productionCache
}
