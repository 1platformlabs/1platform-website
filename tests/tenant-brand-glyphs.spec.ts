import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'
import sharp from 'sharp'

import { repoTenants } from '../src/data/site-tenants'
import { BRAND_FONT_BASE64, BRAND_FONT_FILES } from '../src/lib/brand-fonts.generated'
import { outlineText } from '../src/lib/brand-glyphs'
import type { SiteTenant } from '../src/lib/site-api'
import { appleTouchIconSvg, iconSvg, socialSvg } from '../src/lib/tenant-brand-assets'

/**
 * The favicon, the touch icon and the social card are drawn in the tenant's
 * display face — the one the page draws its logo mark in.
 *
 * Reported on medipago.1platform.pro: the page's mark was Space Grotesk while
 * all three derived assets were DejaVu Sans, the only face the runtime image
 * installs. The social card is what a WhatsApp preview shows, so a doctor's
 * first contact with the brand was the one drawing that did not match it.
 */

const clinic = repoTenants().find((candidate) => candidate.slug === 'clinicas')!

function withFont(display: SiteTenant['theme']['display_font'], mark = 'M'): SiteTenant {
  return { ...clinic, brand_name: 'Medipago', brand_mark: mark, theme: { ...clinic.theme, display_font: display } }
}

test('the embedded faces are byte-identical to the ones the page loads', () => {
  for (const [key, path] of Object.entries(BRAND_FONT_FILES)) {
    const embedded = BRAND_FONT_BASE64[key as keyof typeof BRAND_FONT_FILES]
    expect(embedded, `${key} drifted from ${path}: run node scripts/generate-brand-fonts.mjs`)
      .toBe(readFileSync(path).toString('base64'))
  }
})

test('a font-backed display face outlines the mark in all three derived assets', () => {
  const tenant = withFont('space-grotesk')
  for (const svg of [iconSvg(tenant), appleTouchIconSvg(tenant), socialSvg(tenant)]) {
    expect(svg).not.toContain('DejaVu')
    expect(svg).not.toContain('<text')
    expect(svg).toMatch(/<path transform="translate\([-\d. ]+\)" fill="#ffffff" d="M[^"]+"\/>/)
  }
})

test('different display faces draw different marks', () => {
  const grotesk = outlineText('M', 'space-grotesk', 52)
  const serif = outlineText('M', 'instrument-serif', 52)
  expect(grotesk).not.toBeNull()
  expect(serif).not.toBeNull()
  expect(grotesk!.d).not.toBe(serif!.d)
})

test('a system stack and a character the face lacks both fall back to the text run', () => {
  expect(iconSvg(withFont('system-sans'))).toContain('>M</text>')
  // U+1F3E5 (hospital) is not in the latin subset: a tofu box would be worse.
  expect(outlineText('\u{1F3E5}', 'space-grotesk', 52)).toBeNull()
  expect(iconSvg(withFont('space-grotesk', '\u{1F3E5}'))).toContain('\u{1F3E5}</text>')
})

test('the outlined mark is centred by its ink inside the icon', async () => {
  const svg = iconSvg(withFont('space-grotesk'))
  const { data, info } = await sharp(Buffer.from(svg)).resize(128, 128).raw().toBuffer({ resolveWithObject: true })
  // White ink on a teal ground: the ink is every pixel with a bright red channel.
  let minX = 128, maxX = -1, minY = 128, maxY = -1
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels] > 200) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x)
        minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      }
    }
  }
  expect(maxX, 'the mark must actually be drawn').toBeGreaterThan(minX)
  expect(Math.abs((minX + maxX) / 2 - 63.5)).toBeLessThanOrEqual(1.5)
  expect(Math.abs((minY + maxY) / 2 - 63.5)).toBeLessThanOrEqual(1.5)
})

test('an outlined social title never leaves the 1056px title box', () => {
  const long = { ...withFont('space-grotesk'), brand_name: 'WWWWWWWWWWWWWWWWWWWWWWWW' }
  const outline = outlineText('WWWWWWWWWWWWWWWWWWWWWWWW', 'space-grotesk', 74)
  expect(outline!.width, 'this case only means something if the estimate would overflow').toBeGreaterThan(1056)

  const svg = socialSvg(long)
  const title = [...svg.matchAll(/<path transform="translate\(72 (\d+)\)"[^>]*d="([^"]+)"/g)]
  expect(title.length).toBe(1)
  const xs = [...title[0]![2]!.matchAll(/[MLQC]([-\d. ]+)/g)]
    .flatMap((match) => match[1]!.trim().split(' ').filter((_, index) => index % 2 === 0).map(Number))
  expect(Math.max(...xs)).toBeLessThanOrEqual(1056)
})
