/**
 * The tenant's Tag Manager web container, as data — never as markup.
 *
 * One process serves every tenant, so a container written into a layout would
 * load on every tenant's pages and measure (and fire the pixels of) visitors
 * who never asked for it. The manifest carries only the id; the snippet lives
 * here, and the only thing interpolated into it is an id that matched the
 * pattern below. The API refuses anything else on write; this is the second
 * check, so an older or misbehaving API can at worst switch the container off.
 */

import type { SiteTenant } from './site-api'

/** Same rule as the API's `validate_tag_manager_id`: `GTM-` + 4-12 of [A-Z0-9]. */
export const TAG_MANAGER_ID = /^GTM-[A-Z0-9]{4,12}$/

/** A usable container id, or null. A malformed value is ignored, never repaired. */
export function tagManagerIdOf(tenant: Pick<SiteTenant, 'tag_manager_id'>): string | null {
  const id = tenant.tag_manager_id
  return typeof id === 'string' && TAG_MANAGER_ID.test(id) ? id : null
}

/** The `<head>` loader, verbatim from the container's install instructions. */
export function tagManagerHeadScript(id: string): string {
  if (!TAG_MANAGER_ID.test(id)) throw new Error('tagManagerHeadScript: not a container id')
  return (
    "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':" +
    "new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0]," +
    "j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=" +
    "'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);" +
    `})(window,document,'script','dataLayer','${id}');`
  )
}

/** The no-script fallback that goes right after `<body>`. */
export function tagManagerNoscriptSrc(id: string): string {
  if (!TAG_MANAGER_ID.test(id)) throw new Error('tagManagerNoscriptSrc: not a container id')
  return `https://www.googletagmanager.com/ns.html?id=${id}`
}
