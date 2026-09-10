import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'
import sharp from 'sharp'

import { repoTenants } from '../src/data/site-tenants'
import { fetchTenantByHost } from '../src/lib/site-api'
import {
  brandSymbol,
  iconSvg,
  resolveIcon,
  resolveLogo,
  resolveSocial,
  SocialRasterCache,
  socialPng,
  socialSvg,
  socialTitleLayout,
} from '../src/lib/tenant-brand-assets'

function tenant(slug: string) {
  const value = repoTenants().find((candidate) => candidate.slug === slug)
  expect(value, `missing ${slug} fixture`).toBeTruthy()
  return value!
}

test('declared platform assets preserve their compiled paths while a tenant without them derives both', async () => {
  const platform = tenant('oneplatform')
  const clinic = tenant('clinicas')

  expect(resolveIcon(platform)).toBe('/favicon.svg')
  expect(resolveSocial(platform)).toBe('/og/default.png')
  expect(resolveIcon(clinic)).toBe('/brand/icon.svg')
  expect(resolveSocial(clinic)).toBe('/brand/social.png')
  expect(await resolveLogo(platform)).toBe('/favicon.svg')
  expect(await resolveLogo(clinic)).toBe('/brand/social.png')
})

test('a declared social image can be the logo without invoking the derived raster', async () => {
  const clinic = tenant('clinicas')
  const partial = {
    ...clinic,
    brand_assets: { social_image: '/assets/clinic-social.png' },
  }

  expect(resolveIcon(partial)).toBe('/brand/icon.svg')
  expect(await resolveLogo(partial)).toBe('/assets/clinic-social.png')
})

test('a rolling deploy accepts an old or partially projected brand-assets field', async () => {
  const originalFetch = globalThis.fetch
  const clinic = tenant('clinicas')
  const legacy = { ...clinic }
  delete legacy.brand_assets
  const partial = { ...clinic, brand_assets: { icon: '/assets/clinic-icon.svg' } }

  try {
    for (const manifest of [legacy, partial]) {
      globalThis.fetch = (async () => new Response(JSON.stringify({ data: manifest }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch
      const resolved = await fetchTenantByHost('clinic.example')
      expect(resolved).not.toBeNull()
      expect(resolveIcon(resolved!)).toBe(
        'brand_assets' in manifest ? '/assets/clinic-icon.svg' : '/brand/icon.svg',
      )
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('the derived icon contains the tenant symbol and its contrast-checked accent', () => {
  const clinic = tenant('clinicas')
  const svg = iconSvg({ ...clinic, brand_mark: 'CD' })

  expect(svg).toContain('>CD</text>')
  expect(svg).toContain('fill="#0f766e"')
  expect(svg).toContain('fill="#ffffff"')
})

test('the derived SVG escapes the mark instead of allowing it to become markup', () => {
  const clinic = tenant('clinicas')
  const svg = iconSvg({ ...clinic, brand_mark: '<&' })

  expect(brandSymbol({ ...clinic, brand_mark: '<&' })).toBe('<&')
  expect(svg).toContain('>&lt;&amp;</text>')
  expect(svg).not.toContain('><&</text>')
})

test('the social card rasterises as a real PNG', async () => {
  const png = await socialPng(tenant('clinicas'))
  expect(png, 'a derived card must be rasterisable before the head advertises it').not.toBeNull()
  expect(png?.subarray(1, 4).toString('ascii')).toBe('PNG')
})

test('the social title keeps long and Unicode names inside at most three lines', async () => {
  const clinic = tenant('clinicas')
  const unicodeName = `${'Clínica Ñandú 🚑 '.repeat(7)}Salud`
  const unicodeSvg = socialSvg({ ...clinic, brand_name: unicodeName })

  expect(unicodeSvg).toContain('Clínica Ñandú 🚑')

  for (const [caseName, glyph] of [['widest uppercase', 'W'], ['wide lowercase', 'm']] as const) {
    const longName = glyph.repeat(120)
    const slug = `long-social-${glyph}`
    const layout = socialTitleLayout(longName)
    const svg = socialSvg({ ...clinic, slug, brand_name: longName })
    const png = await socialPng({ ...clinic, slug, brand_name: longName })

    expect(layout.lines, caseName).toHaveLength(3)
    expect(layout.lines.join('').replace(/\s/gu, ''), caseName).toBe(longName)
    expect(svg.match(/<tspan /gu), caseName).toHaveLength(3)
    expect(png, caseName).not.toBeNull()
    expect(await sharp(png!).metadata(), caseName).toMatchObject({ width: 1200, height: 630 })

    const { data, info } = await sharp(png!).raw().toBuffer({ resolveWithObject: true })
    const background = [15, 118, 110]
    let maxTitleX = -1
    for (let y = 360; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const offset = (y * info.width + x) * info.channels
        if (background.some((channel, index) => Math.abs(data[offset + index]! - channel) > 2)) {
          maxTitleX = Math.max(maxTitleX, x)
        }
      }
    }
    expect(maxTitleX, `${caseName}: title must be drawn`).toBeGreaterThan(72)
    expect(maxTitleX, `${caseName}: title must stay inside its box`).toBeLessThanOrEqual(1128)
  }
})

test('the raster cache retries a transient failure and retains only the current tenant version', async () => {
  const clinic = tenant('clinicas')
  let attempts = 0
  const cache = new SocialRasterCache(async (svg) => {
    attempts += 1
    if (attempts === 1) throw new Error('transient raster failure')
    return Buffer.from(svg)
  }, 2)

  expect(await cache.get({ ...clinic, slug: 'retry-raster' })).toBeNull()
  expect(await cache.get({ ...clinic, slug: 'retry-raster' })).not.toBeNull()
  await cache.get({ ...clinic, slug: 'retry-raster', brand_name: 'Renamed clinic' })

  expect(attempts).toBe(3)
  expect(cache.entryCount).toBe(1)
})

test('the raster cache evicts the least recently used tenant at its bound', async () => {
  const clinic = tenant('clinicas')
  let attempts = 0
  const cache = new SocialRasterCache(async (svg) => {
    attempts += 1
    return Buffer.from(svg)
  }, 2)

  await cache.get({ ...clinic, slug: 'cache-a' })
  await cache.get({ ...clinic, slug: 'cache-b' })
  await cache.get({ ...clinic, slug: 'cache-c' })
  await cache.get({ ...clinic, slug: 'cache-a' })

  expect(cache.entryCount).toBe(2)
  expect(attempts).toBe(4)
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

test('the symbol derivation has one owner in src', () => {
  const files = sourceFiles('src').filter((path) => /\.(?:ts|astro)$/.test(path))
  const owners = files.filter((path) => readFileSync(path, 'utf8').includes('function brandSymbol('))

  expect(owners, 'a second symbol derivation would drift from the two asset routes').toEqual([
    'src/lib/tenant-brand-assets.ts',
  ])
})
