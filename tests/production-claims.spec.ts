import { expect, test } from '@playwright/test'
import { repoTenants } from '../src/data/site-tenants'
import { fabricatedPricingPattern, replaceCountPatterns } from './helpers/claim-patterns'
import { scanProductionClaims, type ClaimsTransport } from './helpers/production-claims'
import type { HostResponse } from './helpers/http-host'

const API = 'https://registry.example'
const REFERENCE = 'reference.example'
const EXTRA = 'api-only.example'
const json = (data: unknown): HostResponse => ({ status: 200, headers: {}, body: JSON.stringify({ success: true, data }) })
const html = (body = '<h1>Capabilities</h1>', status = 200): HostResponse => ({ status, headers: {}, body })
const manifest = (host: string) => ({
  ...repoTenants()[0], slug: host.split('.')[0], domain: host, locales: ['en', 'es'],
  default_locale: 'en', pages: ['/', '/blog/example/'], indexable: true,
})

type Override = (url: URL, signal: AbortSignal) => HostResponse | Promise<HostResponse> | undefined
function fixture(override?: Override) {
  const visited: string[] = []
  const transport: ClaimsTransport = async (url, signal) => {
    visited.push(url)
    const target = new URL(url)
    const custom = override?.(target, signal)
    if (custom) return custom
    if (target.pathname.endsWith('/published-hosts')) return json({ hosts: [REFERENCE, EXTRA] })
    if (target.pathname.endsWith('/by-host')) return json(manifest(target.searchParams.get('host')!))
    return html()
  }
  return { transport, visited }
}

function scan(transport: ClaimsTransport, timeoutMs = 1_000) {
  const { en, es } = replaceCountPatterns()
  return scanProductionClaims({ apiBase: API, minHosts: 2, referenceHost: REFERENCE, timeoutMs,
    patterns: { price: fabricatedPricingPattern(), countEn: en, countEs: es }, transport })
}

test('API-only tenant and every locale are scanned without repo enumeration', async () => {
  expect(repoTenants().map((tenant) => tenant.domain)).not.toContain(EXTRA)
  const { transport } = fixture()
  const report = await scan(transport)
  expect(report.errors).toEqual([])
  expect(report.findings).toEqual([])
  expect(report.resolvedHosts).toEqual([REFERENCE, EXTRA])
  expect(report.visited).toHaveLength(8)
  expect(report.visited).toContain(`https://${EXTRA}/es/`)
  expect(report.scanned).toBe(8)
  expect(report.countScanned).toBe(4)
  expect(report.excluded).toBe(4)
})

test('seeded served HTML fails both real rules, while editorial counts remain exempt', async () => {
  const { transport } = fixture((url) => {
    if (url.hostname !== EXTRA) return
    if (url.pathname.startsWith('/blog/')) return html('replaces four vendors; Plans start around $19/mo')
    if (url.pathname === '/') return html('reemplaza seis herramientas distintas; Plans start around $19/mo')
  })
  const report = await scan(transport)
  expect(report.findings).toEqual([
    `price: https://${EXTRA}/`, `count: https://${EXTRA}/`, `price: https://${EXTRA}/blog/example/`,
  ])
  expect(report.errors).toEqual([])
})

for (const hosts of [[], [REFERENCE]]) {
  test(`empty or truncated corpus cannot pass (${hosts.length} hosts)`, async () => {
    const { transport } = fixture((url) => url.pathname.endsWith('/published-hosts') ? json({ hosts }) : undefined)
    expect((await scan(transport)).errors).toContain(`host floor: ${hosts.length} < 2`)
  })
}

for (const fault of ['route404', 'network', 'manifest404', 'mismatch', 'timeout']) {
  test(`${fault} remains an error and later API-only tenant still exposes its defect`, async () => {
    const { transport, visited } = fixture((url, signal) => {
      if (url.hostname === EXTRA && url.pathname === '/') return html('replaces four vendors')
      const isManifest = url.searchParams.get('host') === REFERENCE
      if (fault === 'manifest404' && isManifest) return html('', 404)
      if (fault === 'mismatch' && isManifest) return json(manifest('wrong.example'))
      if (url.hostname !== REFERENCE || url.pathname !== '/') return
      if (fault === 'route404') return html('', 404)
      if (fault === 'network') throw new Error('connection refused')
      if (fault === 'timeout') return new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('deadline exceeded')), { once: true })
      })
    })
    const report = await scan(transport, 25)
    expect(report.errors.length).toBeGreaterThan(0)
    expect(visited).toContain(`https://${EXTRA}/`)
    expect(report.findings).toContain(`count: https://${EXTRA}/`)
  })
}

test('invalid envelope, duplicated hosts and empty manifests fail explicitly', async () => {
  for (const response of [json({ hosts: [REFERENCE, REFERENCE] }), html('{"success":false,"data":{"hosts":[]}}')]) {
    const { transport } = fixture((url) => url.pathname.endsWith('/published-hosts') ? response : undefined)
    const report = await scan(transport)
    expect(report.errors).toHaveLength(1)
    expect(report.visited).toEqual([])
  }
  const { transport } = fixture((url) => url.searchParams.get('host') === REFERENCE
    ? json({ ...manifest(REFERENCE), pages: [] }) : undefined)
  expect((await scan(transport)).errors).toContain(`${REFERENCE} manifest: invalid published pages or locales`)
})

test('internal-page and hostname validation cannot expand a fetch to another origin', async () => {
  const { transport, visited } = fixture((url) => url.searchParams.get('host') === REFERENCE
    ? json({ ...manifest(REFERENCE), pages: ['//elsewhere.example/'] }) : undefined)
  const report = await scan(transport)
  expect(report.errors.length).toBeGreaterThan(0)
  expect(visited.some((url) => new URL(url).hostname === 'elsewhere.example')).toBe(false)
})

test('locale aliases and noncanonical dot paths cannot inflate coverage', async () => {
  for (const pages of [['/', '/es/'], ['/a/../'], ['/a/%2e%2e/']]) {
    const { transport } = fixture((url) => url.searchParams.get('host') === REFERENCE
      ? json({ ...manifest(REFERENCE), pages }) : undefined)
    const report = await scan(transport)
    expect(report.errors.some((error) => error.startsWith(`${REFERENCE} manifest:`))).toBe(true)
    expect(report.visited.filter((url) => new URL(url).hostname === REFERENCE)).toEqual([])
    expect(report.resolvedHosts).toEqual([EXTRA])
  }
})
