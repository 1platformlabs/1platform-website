import type { SiteTenant } from './site-api'
import { i18nKey } from '../i18n/key'
import { environmentDestination } from './site-destinations'

export const ACCESS_ROUTE = '/access/'
export const REQUEST_ACCESS_ROUTE = '/request-access/'

/** Opt-in belongs to each published manifest, never to a tenant name or host. */
export function hasTenantAccess(tenant: SiteTenant): boolean {
  return tenant.pages.includes(ACCESS_ROUTE) && tenant.pages.includes(REQUEST_ACCESS_ROUTE)
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
