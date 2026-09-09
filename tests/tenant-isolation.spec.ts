import { test, expect } from '@playwright/test'

import { resolveTenant, normalizeHost, __testing } from '../src/lib/resolve-tenant'
import { MissBudget, TenantCache } from '../src/lib/tenant-cache'
import type { SiteTenant } from '../src/lib/site-api'

/**
 * The failure this file exists to catch.
 *
 * The site is now one long-lived process serving N brands, and resolving a
 * tenant is an `await`. If the answer for "which tenant is this" is ever kept in
 * module scope, two concurrent requests for two different hosts interleave at
 * that await and overwrite each other.
 *
 * The obvious damage — a visitor seeing the wrong brand — is not the dangerous
 * part, because somebody notices it. The dangerous part is a CACHE WRITE under
 * the wrong key: after that, requests for a tenant nobody was even looking at
 * are answered from another tenant's manifest, and they look correct.
 *
 * So the tests below interleave two hosts under real concurrency and assert
 * every answer matches ITS host. The control negative for the whole file is at
 * the bottom: a deliberately module-scoped resolver, exercised the same way,
 * which must fail. Without it these tests would pass over an implementation
 * that has the bug, and prove nothing.
 *
 * These run in Node without a browser — the property is about the process, not
 * the page.
 */

const HOST_A = 'a-tenant.example'
const HOST_B = 'b-tenant.example'

function manifest(slug: string, domain: string, accent: string): SiteTenant {
  return {
    slug,
    brand_name: `${slug} brand`,
    brand_mark: null,
    brand_wordmark: `${slug} brand`,
    domain,
    locales: ['en'],
    default_locale: 'en',
    home_template: 'platform-commerce',
    theme: { accent, accent_contrast: '#ffffff', display_font: 'system-sans' },
    destinations: { docs: null, app: null, support: null, status: null },
    pages: ['/'],
    // Widened by F3: the manifest now carries the tenant's Search Console
    // token, and `isTenant` verifies it structurally. A double that omits a
    // field the validator checks is rejected as an unrecognised manifest, which
    // is the correct behaviour and why this line is here rather than the check
    // being loosened.
    google_site_verification: null,
    indexable: true,
  }
}

const TENANTS: Record<string, SiteTenant> = {
  [HOST_A]: manifest('alpha', HOST_A, '#111111'),
  [HOST_B]: manifest('beta', HOST_B, '#222222'),
}

/**
 * A fake API that yields control mid-flight.
 *
 * The `await` on a real timer is the point: without it the two resolutions run
 * to completion one after another and never actually interleave, so a broken
 * implementation passes. This is the difference between a concurrency test and
 * a test that merely calls something twice.
 */
let originalFetch: typeof globalThis.fetch
let delayMs = 5

test.beforeEach(() => {
  originalFetch = globalThis.fetch
  __testing.cache.reset()
  __testing.budget.reset()

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    const host = url.searchParams.get('host') ?? ''
    await new Promise((r) => setTimeout(r, delayMs))
    const found = TENANTS[host]
    if (!found) {
      return new Response(JSON.stringify({ success: false }), { status: 404 })
    }
    return new Response(JSON.stringify({ success: true, data: found }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof globalThis.fetch
})

test.afterEach(() => {
  globalThis.fetch = originalFetch
  __testing.cache.reset()
  __testing.budget.reset()
})

test('concurrent requests interleaving two hosts each get their own tenant', async () => {
  const hosts: string[] = []
  for (let i = 0; i < 40; i++) hosts.push(i % 2 === 0 ? HOST_A : HOST_B)

  const results = await Promise.all(hosts.map((h) => resolveTenant(h)))

  // Floor: if the harness stopped resolving anything, "every answer matched"
  // would be vacuously true over an empty set.
  expect(results.length, 'no resolutions were performed — broken probe').toBe(40)

  results.forEach((r, i) => {
    const expectedHost = hosts[i]
    expect(r.outcome, `request ${i} for ${expectedHost} did not resolve`).toBe('resolved')
    if (r.outcome !== 'resolved') return
    expect(
      r.tenant.domain,
      `request ${i} asked for ${expectedHost} and was answered with ${r.tenant.domain}`,
    ).toBe(expectedHost)
    expect(r.tenant.slug).toBe(TENANTS[expectedHost].slug)
    expect(r.tenant.theme.accent).toBe(TENANTS[expectedHost].theme.accent)
  })
})

test('a concurrent burst does not write one tenant under the other key', async () => {
  // The quiet failure: the render can be right and the CACHE still be poisoned.
  // Warm both under concurrency, then read each back on its own.
  await Promise.all(
    Array.from({ length: 20 }, (_, i) => resolveTenant(i % 2 === 0 ? HOST_A : HOST_B)),
  )

  const a = await resolveTenant(HOST_A)
  const b = await resolveTenant(HOST_B)

  expect(a.outcome).toBe('resolved')
  expect(b.outcome).toBe('resolved')
  if (a.outcome === 'resolved') expect(a.tenant.domain).toBe(HOST_A)
  if (b.outcome === 'resolved') expect(b.tenant.domain).toBe(HOST_B)

  const stats = __testing.cache.stats()
  expect(stats.positive, 'two hosts should occupy exactly two cache entries').toBe(2)
})

test('an unknown host is a 404 and never another tenant', async () => {
  const r = await resolveTenant('nobody-here.example')
  expect(r.outcome).toBe('unknown-host')
})

test('the API being unreachable is NOT "this host does not exist"', async () => {
  globalThis.fetch = (async () => {
    throw new Error('connection refused')
  }) as typeof globalThis.fetch

  const r = await resolveTenant(HOST_A)
  expect(
    r.outcome,
    'an unreachable API must answer unavailable (503), never unknown-host (404) — ' +
      'a blip must not tell crawlers every tenant was deleted',
  ).toBe('unavailable')
})

test('a stale copy is served while the API is down, and it is bounded', async () => {
  const t0 = 1_000_000
  const first = await resolveTenant(HOST_A, t0)
  expect(first.outcome).toBe('resolved')

  globalThis.fetch = (async () => {
    throw new Error('down')
  }) as typeof globalThis.fetch

  // Inside the stale window: serve the copy, and say how old it is.
  const stale = await resolveTenant(HOST_A, t0 + 5 * 60_000)
  expect(stale.outcome).toBe('resolved')
  if (stale.outcome === 'resolved') {
    expect(stale.stale).toBe(true)
    expect(stale.ageMs).toBeGreaterThan(0)
  }

  // Past it: a day-old brand is not "still working".
  const tooOld = await resolveTenant(HOST_A, t0 + 25 * 60 * 60_000)
  expect(
    tooOld.outcome,
    'beyond the declared maximum age the honest answer is 503, not an ancient copy',
  ).toBe('unavailable')
})

test('the miss budget refuses without touching the API', async () => {
  let calls = 0
  globalThis.fetch = (async () => {
    calls++
    return new Response(JSON.stringify({ success: false }), { status: 404 })
  }) as typeof globalThis.fetch

  __testing.budget.reset()
  const now = 2_000_000
  // Every one of these is a distinct host, so every one is a miss the negative
  // cache cannot absorb — which is exactly the shape of the real attack.
  const attempts = 200
  for (let i = 0; i < attempts; i++) await resolveTenant(`flood-${i}.example`, now)

  expect(calls, 'the budget must stop the flood short of the API').toBeLessThan(attempts)
  expect(calls, 'but it must not refuse everything — legitimate misses still resolve').toBeGreaterThan(0)
})

test('the caches are bounded, so a host flood cannot exhaust memory', () => {
  const c = new TenantCache<SiteTenant>()
  const now = 3_000_000
  for (let i = 0; i < 5_000; i++) c.rememberMissing(`h${i}.example`, now)
  const stats = c.stats()
  expect(
    stats.negative,
    'the negative cache is keyed by an attacker-chosen Host; unbounded, it is a ' +
      'memory-exhaustion primitive against the very process it protects',
  ).toBeLessThanOrEqual(1024)
})

test('host normalisation matches the API, including the log-injection case', () => {
  expect(normalizeHost('Ejemplo.com')).toBe('ejemplo.com')
  expect(normalizeHost('ejemplo.com.')).toBe('ejemplo.com')
  expect(normalizeHost('ejemplo.com:80')).toBe('ejemplo.com')
  expect(normalizeHost('  EJEMPLO.com:443  ')).toBe('ejemplo.com')
  expect(normalizeHost('www.ejemplo.com')).toBe('www.ejemplo.com')
  // A newline in the middle survives .trim(); it must not survive this.
  expect(normalizeHost('evil.com\nforged log line')).toBe('evil.com')
  expect(normalizeHost('evil.com\r\nforged')).toBe('evil.com')
})

/**
 * THE CONTROL NEGATIVE FOR THIS ENTIRE FILE.
 *
 * Everything above asserts that the real resolver keeps tenants apart. That is
 * only evidence if the same exercise CATCHES a resolver that does not — so here
 * is one, written the way the plan warned against: the answer parked in a
 * module-scope variable across an await.
 *
 * If this test ever stops failing to keep tenants apart, the interleaving above
 * is no longer discriminating and the tests are decoration.
 */
test('CONTROL: a module-scoped resolver DOES leak across concurrent hosts', async () => {
  let currentTenant: SiteTenant | null = null // ← the bug, on purpose

  async function brokenResolve(host: string): Promise<SiteTenant | null> {
    const key = normalizeHost(host)
    await new Promise((r) => setTimeout(r, 5)) // the await two requests interleave at
    currentTenant = TENANTS[key] ?? null
    await new Promise((r) => setTimeout(r, 5)) // and the window where the other one lands
    return currentTenant
  }

  const hosts = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? HOST_A : HOST_B))
  const results = await Promise.all(hosts.map((h) => brokenResolve(h)))

  const mismatches = results.filter((t, i) => t?.domain !== hosts[i]).length
  expect(
    mismatches,
    'the module-scoped resolver did NOT leak, so this harness cannot detect the bug ' +
      'it exists to detect — the tests above are not evidence until it does',
  ).toBeGreaterThan(0)
})
