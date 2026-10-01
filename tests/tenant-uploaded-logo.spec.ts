/**
 * api#519 (LC-09a): a tenant's UPLOADED logo — re-served from its own origin and
 * the source of its favicon, touch icon, social card and JSON-LD logo.
 *
 * The repository manifest has no tenant with a logo (the bytes live in the
 * API), so this file drives the library and the route handlers directly, with
 * the API fetch replaced through the module's test seam. The served suite keeps
 * proving that tenants WITHOUT a logo render exactly as before.
 */
import { expect, test } from '@playwright/test'
import sharp from 'sharp'

import { repoTenants } from '../src/data/site-tenants'
import { fetchTenantByHost, isTenant, normalizeBrandLogo } from '../src/lib/site-api'
import type { SiteTenant } from '../src/lib/site-api'
import {
  __logoTesting,
  appleTouchIconPng,
  brandAssetVersion,
  iconMimeType,
  logoBytes,
  logoIconPng,
  resolveAppleTouchIcon,
  resolveIcon,
  resolveLogo,
  resolveSocial,
  resolveUploadedLogo,
  socialPng,
} from '../src/lib/tenant-brand-assets'
import { getWithHost } from './helpers/http-host'
import { GET as getLogo } from '../src/pages/brand/logo/[hash].png'
import { GET as getIconPng } from '../src/pages/brand/icon.png'

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4321)
const BASE = `http://127.0.0.1:${PORT}`

const SHA_A = 'a'.repeat(64)
const SHA_B = 'b'.repeat(64)

function base(slug: string): SiteTenant {
  const value = repoTenants().find((t) => t.slug === slug)
  expect(value, `missing ${slug} fixture`).toBeTruthy()
  return value!
}

function withLogo(slug: string, sha256 = SHA_A): SiteTenant {
  return { ...base(slug), brand_logo: { sha256, width: 400, height: 100 } }
}

async function pngOf(colour: { r: number; g: number; b: number }, width = 400, height = 100): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 4, background: { ...colour, alpha: 1 } } }).png().toBuffer()
}

// Each test sets its own fetcher; none leaks to the next one.
test.afterEach(() => __logoTesting.setFetcher(null))

// ── the manifest ─────────────────────────────────────────────────────────────

test('a malformed brand_logo is ignored, never a reason to take the tenant offline', async () => {
  expect(normalizeBrandLogo({ sha256: SHA_A, width: 10, height: 5 })).toEqual({ sha256: SHA_A, width: 10, height: 5 })
  for (const bad of [null, 'x', { sha256: 'NOT-HEX', width: 1, height: 1 }, { sha256: SHA_A, width: -1, height: 1 }, { sha256: SHA_A.toUpperCase(), width: 1, height: 1 }]) {
    expect(normalizeBrandLogo(bad)).toBeNull()
  }

  const manifest = { ...base('clinicas'), brand_logo: { sha256: '../../etc/passwd', width: 1, height: 1 } }
  expect(isTenant(manifest)).toBe(true)

  const realFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({ success: true, data: manifest }), { status: 200 })) as typeof fetch
  try {
    const tenant = await fetchTenantByHost('clinicas.1platform.dev')
    expect(tenant?.brand_logo).toBeNull()
  } finally {
    globalThis.fetch = realFetch
  }
})

// ── precedence and versions ─────────────────────────────────────────────────

test('declared assets win; then the uploaded logo; then the monogram', () => {
  const platform = base('oneplatform')
  expect(resolveIcon({ ...platform, brand_logo: { sha256: SHA_A, width: 1, height: 1 } })).toBe(resolveIcon(platform))

  const clinic = base('clinicas')
  expect(resolveIcon(clinic)).toMatch(/^\/brand\/icon\.svg\?v=[0-9a-f]{12}$/)
  expect(resolveIcon(withLogo('clinicas'))).toMatch(/^\/brand\/icon\.png\?v=[0-9a-f]{12}$/)
})

test('the ?v= of every derived asset moves when the logo changes or goes away (website#129)', () => {
  const none = base('clinicas')
  const a = withLogo('clinicas', SHA_A)
  const b = withLogo('clinicas', SHA_B)
  for (const asset of ['icon', 'social', 'appleTouch'] as const) {
    const versions = new Set([brandAssetVersion(none, asset), brandAssetVersion(a, asset), brandAssetVersion(b, asset)])
    expect(versions.size, `${asset} must have three distinct versions`).toBe(3)
  }
  expect(resolveSocial(a)).not.toBe(resolveSocial(b))
  expect(resolveAppleTouchIcon(a)).not.toBe(resolveAppleTouchIcon(none))
})

test('the favicon type follows its extension', () => {
  expect(iconMimeType('/favicon.svg')).toBe('image/svg+xml')
  expect(iconMimeType('/brand/icon.svg?v=abc')).toBe('image/svg+xml')
  expect(iconMimeType('/brand/icon.png?v=abc')).toBe('image/png')
  expect(iconMimeType('/favicon.ico')).toBe('image/x-icon')
  expect(iconMimeType('/whatever')).toBeUndefined()
})

// ── the same-origin route ───────────────────────────────────────────────────

test('the logo route serves only the current hash of THIS tenant, immutable', async () => {
  const bytes = await pngOf({ r: 200, g: 30, b: 30 })
  const asked: string[] = []
  __logoTesting.setFetcher(async (slug, sha) => {
    asked.push(`${slug}/${sha}`)
    return slug === 'clinicas' && sha === SHA_A ? bytes : null
  })
  const call = (tenant: SiteTenant, hash: string) =>
    (getLogo as unknown as (ctx: unknown) => Promise<Response>)({ params: { hash }, locals: { tenant } })

  const ok = await call(withLogo('clinicas'), SHA_A)
  expect(ok.status).toBe(200)
  expect(ok.headers.get('content-type')).toBe('image/png')
  expect(ok.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  expect(ok.headers.get('x-content-type-options')).toBe('nosniff')
  expect(Buffer.from(await ok.arrayBuffer()).equals(bytes)).toBe(true)

  // Another tenant's hash under this host, an old hash, a tenant without a
  // logo: the same 404, and the API is never asked for any of them.
  asked.length = 0
  for (const [tenant, hash] of [
    [withLogo('oneplatform', SHA_B), SHA_A],
    [withLogo('clinicas', SHA_B), SHA_A],
    [base('clinicas'), SHA_A],
  ] as const) {
    expect((await call(tenant, hash)).status).toBe(404)
  }
  expect(asked).toEqual([])
})

test('an API that cannot serve the logo is a 404, retried next time, never a 500', async () => {
  let calls = 0
  __logoTesting.setFetcher(async () => {
    calls += 1
    return null
  })
  const tenant = withLogo('clinicas')
  const call = () => (getLogo as unknown as (ctx: unknown) => Promise<Response>)({ params: { hash: SHA_A }, locals: { tenant } })
  expect((await call()).status).toBe(404)
  expect((await call()).status).toBe(404)
  expect(calls, 'a failure must not be cached').toBe(2)
  expect(await resolveLogo(tenant), 'no logo is advertised while its bytes cannot be served').toBeNull()
})

test('the default fetch accepts only a real PNG from the API', async () => {
  const realFetch = globalThis.fetch
  const png = await pngOf({ r: 1, g: 2, b: 3 })
  const answers: Response[] = [
    new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    new Response('<svg/>', { status: 200, headers: { 'content-type': 'image/png' } }),
    new Response(new Uint8Array(png), { status: 404, headers: { 'content-type': 'image/png' } }),
    new Response(new Uint8Array(png), { status: 200, headers: { 'content-type': 'image/png' } }),
  ]
  const urls: string[] = []
  globalThis.fetch = (async (url: string) => {
    urls.push(String(url))
    return answers.shift()!
  }) as typeof fetch
  try {
    __logoTesting.setFetcher(null)
    const tenant = withLogo('clinicas')
    expect(await logoBytes(tenant)).toBeNull()
    expect(await logoBytes(tenant)).toBeNull()
    expect(await logoBytes(tenant)).toBeNull()
    expect((await logoBytes(tenant))?.equals(png)).toBe(true)
    expect(urls[0]).toMatch(new RegExp(`/api/v1/sites/clinicas/logo/${SHA_A}\\.png$`))
  } finally {
    globalThis.fetch = realFetch
  }
})

// ── the derived rasters ─────────────────────────────────────────────────────

test('favicon, touch icon, social card and JSON-LD logo are made from the logo', async () => {
  const red = await pngOf({ r: 220, g: 0, b: 0 })
  __logoTesting.setFetcher(async () => red)
  const tenant = withLogo('clinicas')

  const icon = await logoIconPng(tenant)
  expect(icon).not.toBeNull()
  expect((await sharp(icon!).metadata()).width).toBe(192)
  const iconResponse = await (getIconPng as unknown as (ctx: unknown) => Promise<Response>)({ locals: { tenant } })
  expect(iconResponse.status).toBe(200)
  expect(iconResponse.headers.get('content-type')).toBe('image/png')
  const noLogo = await (getIconPng as unknown as (ctx: unknown) => Promise<Response>)({ locals: { tenant: base('clinicas') } })
  expect(noLogo.status, 'the PNG favicon exists only with a logo').toBe(404)

  const touch = await appleTouchIconPng(tenant)
  const touchMeta = await sharp(touch!).metadata()
  expect([touchMeta.width, touchMeta.height]).toEqual([180, 180])
  const corner = await sharp(touch!).extract({ left: 0, top: 0, width: 1, height: 1 }).ensureAlpha().raw().toBuffer()
  expect([...corner], 'iOS draws transparency black: the corner must be opaque white').toEqual([255, 255, 255, 255])
  const centre = await sharp(touch!).extract({ left: 90, top: 90, width: 1, height: 1 }).removeAlpha().raw().toBuffer()
  expect(centre[0]).toBeGreaterThan(200)
  expect(centre[1]).toBeLessThan(40)

  const social = await socialPng(tenant)
  const derived = await socialPng(base('clinicas'))
  expect((await sharp(social!).metadata()).width).toBe(1200)
  expect(social!.equals(derived!)).toBe(false)

  expect(await resolveLogo(tenant)).toBe(`/brand/logo/${SHA_A}.png`)
  expect(await resolveUploadedLogo(tenant)).toBe(`/brand/logo/${SHA_A}.png`)
  expect(await resolveUploadedLogo(base('clinicas')), 'no logo: the photographic head keeps the social card').toBeNull()
  expect(
    await resolveUploadedLogo({ ...base('oneplatform'), brand_logo: { sha256: SHA_A, width: 1, height: 1 } }),
    'a declared asset outranks the upload',
  ).toBeNull()
  expect(await resolveLogo(base('oneplatform')), 'tenant #1 keeps its declared icon').toBe('/favicon.svg')
})

// ── served regression: tenants without a logo are unchanged ─────────────────

test('without a logo the served favicon is still the SVG it was', async () => {
  const [platform, clinic, logoRoute] = await Promise.all([
    getWithHost(`${BASE}/`, '1platform.pro'),
    getWithHost(`${BASE}/`, 'clinicas.1platform.dev'),
    getWithHost(`${BASE}/brand/logo/${SHA_A}.png`, 'clinicas.1platform.dev'),
  ])
  // Attribute order differs between the two heads (BaseLayout and the
  // photographic home); both must keep advertising an SVG for an SVG.
  const iconLink = (html: string) => /<link rel="icon"[^>]*>/.exec(html)?.[0] ?? ''
  expect(iconLink(platform.body)).toContain('href="/favicon.svg"')
  expect(iconLink(platform.body)).toContain('type="image/svg+xml"')
  expect(iconLink(clinic.body)).toMatch(/href="\/brand\/icon\.svg\?v=[0-9a-f]{12}"/)
  expect(iconLink(clinic.body)).toContain('type="image/svg+xml"')
  expect(logoRoute.status, 'a tenant without a logo has no logo route').toBe(404)
})
