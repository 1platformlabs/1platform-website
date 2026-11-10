/**
 * The traffic analytics the site's own panel connected, as data — never as markup.
 *
 * Same contract as `@lib/tag-manager`: the manifest carries only the
 * measurement id (`analytics_measurement_id`, derived by the API from the
 * analytics connected in the panel), and the loader is built here around an id
 * that matched the pattern below. A malformed value switches the tag off,
 * never the page. Sites of the ecosystem therefore need no tag pasted by hand.
 */

import type { SiteTenant } from './site-api'

/** Same rule as the API's `GOOGLE_ANALYTICS_MEASUREMENT_ID_PATTERN`. */
export const MEASUREMENT_ID = /^G-[A-Z0-9]{8,12}$/

/** A usable measurement id, or null. A malformed value is ignored, never repaired. */
export function analyticsIdOf(tenant: Pick<SiteTenant, 'analytics_measurement_id'>): string | null {
  const id = tenant.analytics_measurement_id
  return typeof id === 'string' && MEASUREMENT_ID.test(id) ? id : null
}

/** The async loader's `src`. */
export function analyticsLoaderSrc(id: string): string {
  if (!MEASUREMENT_ID.test(id)) throw new Error('analyticsLoaderSrc: not a measurement id')
  return `https://www.googletagmanager.com/gtag/js?id=${id}`
}

/** The inline configuration that goes right after the loader. */
export function analyticsConfigScript(id: string): string {
  if (!MEASUREMENT_ID.test(id)) throw new Error('analyticsConfigScript: not a measurement id')
  return (
    'window.dataLayer=window.dataLayer||[];' +
    'function gtag(){dataLayer.push(arguments);}' +
    "gtag('js',new Date());" +
    `gtag('config','${id}');`
  )
}
