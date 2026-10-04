import { expect, test } from '@playwright/test'
import sharp from 'sharp'
import { repoTenants } from '../src/data/site-tenants'
import { __logoTesting, faviconBytes, logoBytes, resolveIcon } from '../src/lib/tenant-brand-assets'
import { tenantBrandImage } from '../src/lib/tenant-brand-display'
import { GET as getFavicon } from '../src/pages/brand/favicon/[hash].png'
import type { SiteTenant } from '../src/lib/site-api'

const SHA = 'c'.repeat(64)
const descriptor = { sha256: SHA, width: 100, height: 50 }
const tenant = (): SiteTenant => ({ ...repoTenants()[0]!, slug: 'brand-display', brand_logo: descriptor, brand_favicon: descriptor })
const png = () => sharp({ create: { width: 100, height: 50, channels: 4, background: '#123456' } }).png().toBuffer()
test.afterEach(() => __logoTesting.setFetcher(null))

test('explicit favicon wins without hiding the independently uploaded wordmark', async () => {
  const site = tenant()
  __logoTesting.setFetcher(png)
  expect(resolveIcon(site)).toBe(`/brand/favicon/${SHA}.png`)
  expect((await tenantBrandImage(site, 'lockup'))?.src).toBe(`/brand/logo/${SHA}.png`)
  expect((await tenantBrandImage(site, 'symbol'))?.src).toBe(`/brand/favicon/${SHA}.png`)
})

test('logo and favicon transport caches are isolated even when their hash is equal', async () => {
  const asked: string[] = []
  __logoTesting.setFetcher(async (slug, sha, role) => { asked.push(`${slug}/${role}/${sha}`); return png() })
  await Promise.all([logoBytes(tenant()), faviconBytes(tenant()), faviconBytes(tenant())])
  expect(asked.sort()).toEqual([`brand-display/favicon/${SHA}`, `brand-display/logo/${SHA}`])
})

test('favicon route refuses another tenant, removed and previous hashes before fetching', async () => {
  const asked: string[] = []
  __logoTesting.setFetcher(async (slug, sha, role) => { asked.push(`${slug}/${role}/${sha}`); return png() })
  const call = (site: SiteTenant, hash: string) => (getFavicon as unknown as (ctx: unknown) => Promise<Response>)({ params: { hash }, locals: { tenant: site } })
  for (const site of [{ ...tenant(), brand_favicon: null }, { ...tenant(), brand_favicon: { ...descriptor, sha256: 'd'.repeat(64) } }]) {
    expect((await call(site, SHA)).status).toBe(404)
  }
  expect(asked).toEqual([])
  const response = await call(tenant(), SHA)
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('image/png')
  expect(response.headers.get('cache-control')).toContain('immutable')
})

test('absent or unavailable assets preserve the caller fallback', async () => {
  __logoTesting.setFetcher(async () => null)
  expect(await tenantBrandImage({ ...tenant(), slug: 'unavailable' }, 'lockup')).toBeNull()
  expect(await tenantBrandImage({ ...tenant(), brand_favicon: null }, 'symbol')).toBeNull()
})

test('optical frame follows the decoded PNG, not original asset dimensions', async () => {
  const opaque = await sharp({ create: { width: 40, height: 20, channels: 4, background: '#123456' } }).png().toBuffer()
  const padded = await sharp({ create: { width: 100, height: 50, channels: 4, background: '#00000000' } }).composite([{ input: opaque, left: 30, top: 15 }]).png().toBuffer()
  __logoTesting.setFetcher(async () => padded)
  expect(await tenantBrandImage({ ...tenant(), slug: 'padded' }, 'lockup')).toMatchObject({ width: 100, height: 50, left: 28, top: 13, cropWidth: 44, cropHeight: 24, canTintWhite: false })
})

test('opaque uploads retain their colours on dark surfaces', async () => {
  __logoTesting.setFetcher(png)
  expect(await tenantBrandImage({ ...tenant(), slug: 'opaque' }, 'lockup')).toMatchObject({ canTintWhite: false })
})

test('transparent artwork can use a white silhouette on dark surfaces', async () => {
  const pixels = Buffer.alloc(40 * 20 * 4)
  for (let y = 0; y < 20; y += 1) {
    for (let x = 0; x < 40; x += 1) {
      if (x < 8 || y > 11) pixels[(y * 40 + x) * 4 + 3] = 255
    }
  }
  const image = await sharp(pixels, { raw: { width: 40, height: 20, channels: 4 } }).png().toBuffer()
  __logoTesting.setFetcher(async () => image)
  expect(await tenantBrandImage({ ...tenant(), slug: 'silhouette' }, 'lockup')).toMatchObject({ canTintWhite: true })
})
