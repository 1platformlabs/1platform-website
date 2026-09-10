import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'
import sharp from 'sharp'

import { repoTenants } from '../src/data/site-tenants'
import { fetchTenantByHost } from '../src/lib/site-api'
import {
  appleTouchIconIsAvailable,
  appleTouchIconPng,
  appleTouchIconSvg,
  brandSymbol,
  BrandRasterCache,
  iconSvg,
  resolveAppleTouchIcon,
  resolveIcon,
  resolveLogo,
  resolveSocial,
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
  expect(resolveAppleTouchIcon(platform)).toBe('/logo-oauth-120x120.png')
  expect(resolveIcon(clinic)).toBe('/brand/icon.svg')
  expect(resolveSocial(clinic)).toBe('/brand/social.png')
  expect(resolveAppleTouchIcon(clinic)).toBe('/brand/apple-touch-icon.png')
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
  const cache = new BrandRasterCache(async (svg) => {
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
  const cache = new BrandRasterCache(async (svg) => {
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

/**
 * Issue #107. The home screen is the only surface where the wrong brand does
 * not merely get served — it gets SAVED, and stays after the tab is closed.
 */
test('no tenant can be handed the platform touch icon it did not declare', () => {
  const clinic = tenant('clinicas')

  for (const assets of [null, undefined, {}, { icon: '/assets/clinic-icon.svg' }, { apple_touch_icon: '' }]) {
    const candidate = { ...clinic, brand_assets: assets } as typeof clinic
    expect(resolveAppleTouchIcon(candidate), JSON.stringify(assets)).toBe('/brand/apple-touch-icon.png')
  }

  // And the shape check is the same one the other two assets get: a value that
  // is not a publishable same-origin path derives rather than being emitted.
  for (const hostile of ['https://evil.example/icon.png', '//evil.example/icon.png', 'javascript:alert(1)']) {
    const candidate = { ...clinic, brand_assets: { apple_touch_icon: hostile } } as typeof clinic
    expect(resolveAppleTouchIcon(candidate), hostile).toBe('/brand/apple-touch-icon.png')
  }
})

test('the derived touch icon is a full-bleed 180px square carrying the tenant symbol', async () => {
  const clinic = tenant('clinicas')
  const svg = appleTouchIconSvg({ ...clinic, brand_mark: 'CD' })

  expect(svg).toContain('>CD</text>')
  expect(svg).toContain('fill="#0f766e"')
  // No `rx`: iOS masks the icon itself, and rounded corners underneath that
  // mask render as transparent — black on a dark home screen.
  expect(svg, 'a touch icon must not round its own corners').not.toContain('rx=')

  const png = await appleTouchIconPng({ ...clinic, slug: 'touch-square' })
  expect(png).not.toBeNull()
  expect(png?.subarray(1, 4).toString('ascii')).toBe('PNG')
  expect(await sharp(png!).metadata()).toMatchObject({ width: 180, height: 180 })
})

test('the touch-icon type ramp keeps a three-glyph and an emoji mark inside the square', async () => {
  const clinic = tenant('clinicas')
  const sizeOf = (svg: string) => Number(/font-size="(\d+)"/.exec(svg)?.[1])

  expect(sizeOf(appleTouchIconSvg({ ...clinic, brand_mark: 'C' }))).toBe(104)
  expect(sizeOf(appleTouchIconSvg({ ...clinic, brand_mark: 'CD' }))).toBe(78)
  expect(sizeOf(appleTouchIconSvg({ ...clinic, brand_mark: 'CDE' }))).toBe(58)
  // One visible glyph, two UTF-16 units: `.length` would have picked 78.
  expect(sizeOf(appleTouchIconSvg({ ...clinic, brand_mark: '\u{1F691}' }))).toBe(104)

  // The mark is escaped here exactly as it is in the other derived asset.
  expect(appleTouchIconSvg({ ...clinic, brand_mark: '<&' })).toContain('>&lt;&amp;</text>')
})

test('an unrasterisable touch icon is omitted rather than advertised, and a declared one needs no raster', async () => {
  const clinic = tenant('clinicas')

  // A declared path is answered without touching the rasteriser at all, which
  // is what lets tenant #1 keep its compiled PNG.
  expect(await appleTouchIconIsAvailable(tenant('oneplatform'))).toBe(true)
  expect(await appleTouchIconIsAvailable(clinic)).toBe(true)

  const failing = new BrandRasterCache(async () => {
    throw new Error('raster unavailable')
  }, 2, appleTouchIconSvg)
  expect(await failing.get(clinic), 'a failure must be null, not a platform fallback').toBeNull()
})
