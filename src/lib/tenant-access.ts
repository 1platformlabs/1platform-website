import type { SiteTenant } from './site-api'
import { i18nKey } from '../i18n/key'
import { environmentDestination } from './site-destinations'

export const ACCESS_ROUTE = '/access/'
export const REQUEST_ACCESS_ROUTE = '/request-access/'

/** Opt-in belongs to each published manifest, never to a tenant name or host. */
export function hasTenantAccess(tenant: SiteTenant): boolean {
  return tenant.pages.includes(ACCESS_ROUTE) && tenant.pages.includes(REQUEST_ACCESS_ROUTE)
}

/**
 * The site-wide entry («Acceder» / «Solicitar acceso») for chrome that renders
 * on EVERY page, resolved up front.
 *
 * The manifest and the copy are cached independently (60 s each), so during an
 * activation or a rollback one can be fresh while the other is stale: routes
 * published with the copy not yet there, or the copy gone with the routes still
 * listed. Measured on the local bench: a rollback left every English page
 * answering 503 until the manifest refreshed. The access pages themselves still
 * fail loudly; the chrome omits the entry instead of taking the site down.
 */
export function tenantAccessChrome(tenant: SiteTenant, messages: Record<string, string>): { entry: string; request: string } | null {
  if (!hasTenantAccess(tenant)) return null
  try {
    const access = tenantAccess(tenant, messages)
    return { entry: access.copy('entry'), request: access.copy('request') }
  } catch (error) {
    console.warn('[access] chrome entry omitted slug=%s reason=%s', tenant.slug, error instanceof Error ? error.message : String(error))
    return null
  }
}

export function tenantAccess(tenant: SiteTenant, messages: Record<string, string>) {
  if (!hasTenantAccess(tenant)) throw new Error('Tenant access pages are not published')
  const prefix = i18nKey('access.')
  const copy = (key: string): string => {
    const value = messages[`${prefix}${key}`]
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing tenant access content: ${key}`)
    return value.replaceAll('{brand}', tenant.brand_name)
  }
  const destination = (value: string | null): URL => {
    if (!value) throw new Error('Missing tenant access destination')
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid tenant access destination')
    return url
  }
  const login = destination(tenant.destinations.app)
  const support = destination(tenant.destinations.support)
  if (support.hostname === 'wa.me' || support.hostname === 'api.whatsapp.com') {
    support.searchParams.set('text', copy('supportMessage'))
  }
  return { copy, loginHref: environmentDestination(login.toString()), supportHref: environmentDestination(support.toString()) }
}
