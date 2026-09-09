import { repoTenants } from '../../src/data/site-tenants'
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
