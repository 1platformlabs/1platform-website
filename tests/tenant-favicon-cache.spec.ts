import { expect, test } from '@playwright/test'
import sharp from 'sharp'
import { repoTenants } from '../src/data/site-tenants'
import type { SiteTenant } from '../src/lib/site-api'
import { __logoTesting } from '../src/lib/tenant-brand-assets'
import { GET } from '../src/pages/brand/favicon/[hash].png'

const SHA = 'f'.repeat(64)
const tenant = (): SiteTenant => ({
  ...repoTenants()[0]!,
  slug: 'favicon-cache',
  brand_favicon: { sha256: SHA, width: 128, height: 128 },
})
const request = (site: SiteTenant, hash = SHA) =>
  (GET as unknown as (context: unknown) => Promise<Response>)({
    params: { hash }, locals: { tenant: site },
  })
const png = () => sharp({
  create: { width: 128, height: 128, channels: 4, background: 'navy' },
}).png().toBuffer()

test.afterEach(() => __logoTesting.setFetcher(null))

test('a current favicon has one immutable cache policy and unchanged PNG bytes', async () => {
  const bytes = await png()
  __logoTesting.setFetcher(async () => bytes)
  const response = await request(tenant())
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  expect(response.headers.get('content-type')).toBe('image/png')
  expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes)
})

test('absent, malformed, old and foreign hashes fail before fetching and are not stored', async () => {
  let fetches = 0
  __logoTesting.setFetcher(async () => { fetches += 1; return png() })
  const cases: Array<[SiteTenant, string]> = [
    [{ ...tenant(), brand_favicon: null }, SHA],
    [{ ...tenant(), brand_favicon: undefined }, SHA],
    [tenant(), 'invalid-hash'],
    [tenant(), 'a'.repeat(64)],
    [{ ...tenant(), slug: 'other-site', brand_favicon: { sha256: 'b'.repeat(64), width: 128, height: 128 } }, SHA],
  ]
  for (const [site, hash] of cases) {
    const response = await request(site, hash)
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('retry-after')).toBeNull()
  }
  expect(fetches).toBe(0)
})

test('temporary failure is an uncacheable 503 and recovers after the transport retry window', async () => {
  let now = 0
  let fetches = 0
  let available = false
  __logoTesting.setFetcher(async () => { fetches += 1; return available ? png() : null })
  __logoTesting.setClock(() => now)

  const failed = await request(tenant())
  expect(failed.status).toBe(503)
  expect(failed.headers.get('cache-control')).toBe('no-store')
  expect(failed.headers.get('retry-after')).toBe('30')
  expect(failed.headers.get('x-content-type-options')).toBe('nosniff')

  available = true
  now = 29_999
  const retrying = await request(tenant())
  expect(retrying.status).toBe(503)
  expect(retrying.headers.get('cache-control')).toBe('no-store')
  expect(fetches).toBe(1)

  now = 30_000
  const recovered = await request(tenant())
  expect(recovered.status).toBe(200)
  expect(recovered.headers.get('cache-control')).toContain('immutable')
  expect(fetches).toBe(2)
})
