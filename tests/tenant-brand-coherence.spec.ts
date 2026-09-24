import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { repoTenants } from '../src/data/site-tenants'
import type { SiteTenant } from '../src/lib/site-api'
import { ogLocaleOf } from '../src/lib/site-locale'
import {
  COMPILED_SUCCESS,
  paintsCompiledAccent,
  successFollowsAccent,
  themeColorOf,
  themeDeclarations,
} from '../src/lib/tenant-theme'
import { getWithHost } from './helpers/http-host'

/**
 * What medipago.1platform.pro said about itself against what it showed.
 * Reported on the live site (2026-09-24), one test per mismatch:
 *
 *   - the address bar was white on a teal brand (`theme-color` hard-coded);
 *   - `og:locale` was `es_ES` on a Guatemalan site;
 *   - the only product picture was 1Platform's own cobalt render;
 *   - brand teal and status green sat 19° apart on the same cards.
 *
 * (The fourth — favicon, touch icon and social card in DejaVu Sans — lives in
 * `tenant-brand-glyphs.spec.ts`.) Each fix keeps tenant #1 byte-identical.
 */

const PORT = process.env.PLAYWRIGHT_PORT ?? '4321'
const BASE = `http://127.0.0.1:${PORT}`

const platform = repoTenants().find((t) => t.slug === 'oneplatform')!
const clinic = repoTenants().find((t) => t.slug === 'clinicas')!

function withAccent(accent: string): SiteTenant {
  return { ...clinic, theme: { ...clinic.theme, accent } }
}

test('the address bar follows a repainted accent and stays white for tenant #1', () => {
  expect(themeColorOf(platform)).toBe('#FFFFFF')
  expect(themeColorOf(withAccent('#0F766E'))).toBe('#0f766e')
  // A value that never reaches the stylesheet never reaches the head either.
  expect(themeColorOf(withAccent('red;x'))).toBe('#FFFFFF')
})

test('og:locale carries the declared region and nothing changes without one', () => {
  expect(ogLocaleOf('es', clinic)).toBe('es_ES')
  expect(ogLocaleOf('es', platform)).toBe('es_ES')
  expect(ogLocaleOf('en', platform)).toBe('en_US')
  expect(ogLocaleOf('es', { ...clinic, region: 'GT' })).toBe('es_GT')
  expect(ogLocaleOf('en', { ...clinic, region: 'GT' })).toBe('en_GT')
  expect(ogLocaleOf('es', { ...clinic, region: null })).toBe('es_ES')
  for (const junk of ['gt', 'GTM', 'G1', '"><x', '']) {
    expect(ogLocaleOf('es', { ...clinic, region: junk }), junk).toBe('es_ES')
  }
})

test('the success green is the one global.css compiles', () => {
  const css = readFileSync('src/styles/global.css', 'utf8')
  expect(/--color-success:\s*(#[0-9a-fA-F]{6})/.exec(css)?.[1]?.toLowerCase()).toBe(COMPILED_SUCCESS)
})

test('status follows the brand only when the two greens would read as one', () => {
  expect(successFollowsAccent('#0f766e'), 'the reported pair, 19° apart').toBe(true)
  expect(successFollowsAccent('#1748a7'), 'cobalt').toBe(false)
  expect(successFollowsAccent('#b4291f'), 'a red brand still needs a green "Pagado"').toBe(false)
  expect(successFollowsAccent('#6b7280'), 'a grey has no hue to compare').toBe(false)

  const teal = themeDeclarations(withAccent('#0f766e'))
  expect(teal).toContain('--color-success:#0f766e')
  expect(teal).toContain('--color-success-bg:')
  expect(themeDeclarations(withAccent('#b4291f'))).not.toContain('--color-success')
  expect(themeDeclarations(platform)).toBe('')
})

test('only the compiled palette gets the platform artwork', () => {
  expect(paintsCompiledAccent(platform)).toBe(true)
  expect(paintsCompiledAccent(clinic)).toBe(false)
})

test('the SERVED heads and homes carry each fix, and tenant #1 keeps its own', async () => {
  const platformHome = await getWithHost(`${BASE}/`, platform.domain)
  expect(platformHome.status).toBe(200)
  expect(platformHome.body).toContain('<meta name="theme-color" content="#FFFFFF">')
  expect(platformHome.body).toContain('platform-modules')
  expect(platformHome.body).not.toContain('tools-scene')

  const clinicHome = await getWithHost(`${BASE}/`, clinic.domain)
  expect(clinicHome.status).toBe(200)
  expect(clinicHome.body).toContain(`<meta name="theme-color" content="${clinic.theme.accent}">`)
  expect(clinicHome.body).not.toContain('platform-modules')
  expect(clinicHome.body).toContain('class="tools-scene')
  expect(clinicHome.body).toContain('--color-success:#0f766e')
})
