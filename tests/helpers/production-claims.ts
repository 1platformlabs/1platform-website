import { isTenant } from '../../src/lib/site-api'
import { localesOf, makeLocalizePath } from '../../src/lib/site-locale'
import type { HostResponse } from './http-host'
import type { SurfacePage } from './site-surface'

export interface ClaimPatterns {
  price: RegExp
  countEn: RegExp
  countEs: RegExp
}

export interface ClaimsReport {
  listedHosts: string[]
  resolvedHosts: string[]
  visited: string[]
  scanned: number
  countScanned: number
  excluded: number
  errors: string[]
  findings: string[]
}

export type ClaimsTransport = (url: string, signal: AbortSignal) => Promise<HostResponse>
const PROSE_ROUTE = /^\/blog(\/|$)|^\/changelog\/$/

export const claimsTransport: ClaimsTransport = async (url, signal) => {
  const response = await fetch(url, { redirect: 'manual', signal })
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: await response.text(),
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'request failed'
}

/** The transport consumes the body under the same deadline as the headers. */
async function request(url: string, transport: ClaimsTransport, timeoutMs: number) {
  const response = await transport(url, AbortSignal.timeout(timeoutMs))
  return response
}

function dataOf(response: HostResponse): unknown {
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`)
  const body: unknown = JSON.parse(response.body)
  if (!body || typeof body !== 'object' || !('success' in body) || body.success !== true || !('data' in body)) {
    throw new Error('invalid API envelope')
  }
  return body.data
}

function isHost(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 253 &&
    /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z](?:[a-z0-9-]*[a-z0-9])?$/.test(value)
}

function hostsOf(value: unknown): string[] {
  if (!value || typeof value !== 'object' || !('hosts' in value) || !Array.isArray(value.hosts)) {
    throw new Error('invalid published hosts')
  }
  const hosts: unknown[] = value.hosts
  if (!hosts.every(isHost) || new Set(hosts).size !== hosts.length) {
    throw new Error('published hosts must be unique canonical hostnames')
  }
  return hosts
}

function pagesOf(value: unknown, host: string): SurfacePage[] {
  if (!isTenant(value) || value.domain !== host || !value.indexable) {
    throw new Error('manifest does not match published host')
  }
  if (!value.pages.length || new Set(value.pages).size !== value.pages.length ||
      !value.pages.every((route) => /^\/(?!\/)[^\\?#]*$/.test(route) &&
        new URL(route, `https://${host}`).pathname === route) ||
      new Set(value.locales).size !== value.locales.length || !value.locales.includes(value.default_locale)) {
    throw new Error('invalid published pages or locales')
  }
  const localise = makeLocalizePath(value)
  const pages = localesOf(value).flatMap((locale) => value.pages.map((route) => ({
    slug: value.slug, host, locale, route, url: localise(route, locale),
  })))
  if (new Set(pages.map((page) => page.url)).size !== pages.length) {
    throw new Error('published pages resolve to duplicate URLs')
  }
  return pages
}

function responseError(response: HostResponse, page: SurfacePage): string | null {
  const retired = page.slug === 'oneplatform' && ['/for-developers/', '/es/para-desarrolladores/'].includes(page.url)
  if (retired) {
    return response.status === 301 && response.headers.location ===
      'https://developer.1platform.pro/docs/saas/1platform-api/getting-started'
      ? null : 'invalid retired-page redirect'
  }
  return response.status === 200 ? null : `HTTP ${response.status}`
}

async function scanPage(page: SurfacePage, patterns: ClaimPatterns, report: ClaimsReport,
  transport: ClaimsTransport, timeoutMs: number) {
  const url = `https://${page.host}${page.url}`
  report.visited.push(url)
  try {
    const response = await request(url, transport, timeoutMs)
    const error = responseError(response, page)
    if (error) throw new Error(error)
    report.scanned += 1
    if (patterns.price.test(response.body)) report.findings.push(`price: ${url}`)
    if (PROSE_ROUTE.test(page.route)) {
      report.excluded += 1
    } else {
      report.countScanned += 1
      if (patterns.countEn.test(response.body) || patterns.countEs.test(response.body)) {
        report.findings.push(`count: ${url}`)
      }
    }
  } catch (error) {
    report.errors.push(`${url}: ${message(error)}`)
  }
}

/** Public, read-only corpus. Every failure stays red while later hosts remain visible. */
export async function scanProductionClaims(options: {
  apiBase: string
  patterns: ClaimPatterns
  minHosts: number
  referenceHost: string
  transport?: ClaimsTransport
  timeoutMs?: number
}): Promise<ClaimsReport> {
  const { apiBase, patterns, minHosts, referenceHost, transport = claimsTransport, timeoutMs = 10_000 } = options
  const report: ClaimsReport = {
    listedHosts: [], resolvedHosts: [], visited: [], scanned: 0, countScanned: 0,
    excluded: 0, errors: [], findings: [],
  }
  try {
    if (!Number.isInteger(minHosts) || minHosts < 1) throw new Error('invalid host floor')
    report.listedHosts = hostsOf(dataOf(await request(`${apiBase}/api/v1/sites/published-hosts`, transport, timeoutMs)))
    if (report.listedHosts.length < minHosts) report.errors.push(`host floor: ${report.listedHosts.length} < ${minHosts}`)
    if (!report.listedHosts.includes(referenceHost)) report.errors.push(`reference host missing: ${referenceHost}`)
  } catch (error) {
    report.errors.push(`published-hosts: ${message(error)}`)
    return report
  }
  for (const host of report.listedHosts) {
    try {
      const manifest = dataOf(await request(`${apiBase}/api/v1/sites/by-host?host=${encodeURIComponent(host)}`, transport, timeoutMs))
      const pages = pagesOf(manifest, host)
      report.resolvedHosts.push(host)
      for (const page of pages) await scanPage(page, patterns, report, transport, timeoutMs)
    } catch (error) {
      report.errors.push(`${host} manifest: ${message(error)}`)
    }
  }
  if (report.resolvedHosts.join('\n') !== report.listedHosts.join('\n')) {
    report.errors.push('resolved corpus differs from published hosts')
  }
  return report
}
