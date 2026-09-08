/**
 * The absolute origin of the site being served — the tenant's, not the build's.
 *
 * WHY `Astro.site` CANNOT BE THE ANSWER ANY MORE
 * ----------------------------------------------
 * `astro.config.mjs` declares `site: 'https://1platform.pro'`. That is a BUILD
 * constant, and one build now serves every tenant, so every absolute URL
 * derived from it says `1platform.pro` no matter whose domain the visitor
 * typed. Measured on the served HTML of the clinics host before this module
 * existed: 7 of the 19 platform-domain mentions left on its home page came from
 * that one constant, through the canonical link, `og:url`, `og:image`,
 * `twitter:image`, the hreflang block and `x-default`.
 *
 * The sitemap already emitted `tenant.domain`. So the two contradicted each
 * other on the same page: a sitemap under the customer's domain listing pages
 * that declared themselves canonical at `1platform.pro`. To a crawler that is
 * an instruction to index the platform instead of the customer.
 *
 * A GREP FOR `Astro.site` DOES NOT FIND ALL OF IT
 * -----------------------------------------------
 * Two files never used `Astro.site` at all — `BlogLayout.astro` and
 * `Breadcrumb.astro` wrote the literal `'https://1platform.pro'` — and they are
 * the two that leaked most, because `BlogLayout` carries a SECOND JSON-LD
 * Organization block that `BaseLayout`'s fix never touched. A blog post left 27
 * brand mentions and 30 domain mentions against the home page's 13 and 19. Any
 * sweep of this problem has to search for the literal as well as the property.
 */

import type { SiteTenant } from './site-api'

/** The per-request state this module reads, structurally. */
type OriginLocals = { tenant: SiteTenant }

/**
 * `https://<the tenant's domain>`, with no trailing slash.
 *
 * Always `https`, deliberately, even though the container speaks plain HTTP to
 * the Cloudflare edge: this value goes into canonicals, `og:url` and JSON-LD,
 * which describe the address a VISITOR uses, and that address is https. Reading
 * the scheme off the incoming request would publish `http://` canonicals for
 * every tenant, because the origin never sees anything else.
 */
export function siteOrigin(locals: OriginLocals): string {
  return `https://${locals.tenant.domain}`
}

/**
 * An absolute URL for a root-relative path, under the tenant's own domain.
 *
 * The one-argument-order rule worth stating: the PATH comes first, matching
 * `new URL(path, base)`, so the call sites this replaces read the same way they
 * did before and a reviewer is comparing like with like.
 */
export function absoluteUrl(path: string, locals: OriginLocals): string {
  return new URL(path, siteOrigin(locals)).toString()
}
