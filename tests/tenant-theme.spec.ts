import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { repoTenants } from '../src/data/site-tenants'
import { COMPILED_DEFAULTS, themeDeclarations } from '../src/lib/tenant-theme'
import { getWithHost } from './helpers/http-host'

/**
 * WMT-05: a tenant's theme is a package of tokens, and the SERVED page reflects
 * it — "not just the config object", as the story puts it.
 *
 * The API half of the story shipped and the rendering half did not: the
 * manifest carried a validated `theme.accent` that nothing read, so every
 * tenant was drawn in 1Platform's cobalt. Measured on the served HTML of both
 * tenants before the fix: zero occurrences of either declared accent.
 */

const PORT = process.env.PLAYWRIGHT_PORT ?? '4321'
const BASE = `http://127.0.0.1:${PORT}`

/**
 * ⚠️ THE DUPLICATION GUARD.
 *
 * `COMPILED_DEFAULTS` restates a value that really lives in `global.css`, and
 * it has to: the emitter's whole job is to stay silent when a tenant's token
 * equals the compiled one, which is what keeps tenant #1 byte-identical
 * against the F0 baseline. If the stylesheet changes and this does not, the
 * emitter goes quietly wrong — it would suppress a token that is no longer the
 * default, and the tenant would render in a colour nobody chose.
 *
 * So the default is read back out of the stylesheet here. This is the test
 * that makes the duplication safe rather than merely convenient.
 */
test('the compiled default the emitter compares against is the one global.css actually sets', () => {
  const css = readFileSync('src/styles/global.css', 'utf8')

  // `--color-accent` is declared as `var(--cobalt)`, so resolve one hop.
  const alias = css.match(/--color-accent:\s*var\(([^)]+)\)/)?.[1]?.trim()
  expect(alias, 'global.css no longer declares --color-accent as a var() alias').toBeTruthy()

  const literal = new RegExp(`${alias!}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1]
  expect(literal, `could not resolve ${alias} to a literal in global.css`).toBeTruthy()
  expect(
    literal!.toLowerCase(),
    'global.css changed its accent but COMPILED_DEFAULTS did not — the emitter would now suppress a token that is no longer the default',
  ).toBe(COMPILED_DEFAULTS.accent)
})

test('a tenant whose accent IS the compiled one emits nothing', () => {
  // This is not a micro-optimisation: it is the byte-for-byte no-regression of
  // 1platform.pro. An unconditional block took the comparator from 51 identical
  // to 1 — measured, not feared.
  const platform = repoTenants().find((t) => t.slug === 'oneplatform')
  expect(platform, 'the platform tenant is missing from the repo manifest').toBeTruthy()
  expect(platform!.theme.accent.toLowerCase()).toBe(COMPILED_DEFAULTS.accent)
  expect(themeDeclarations(platform!)).toBe('')
})

test('a tenant with its own accent emits it, with its derivatives', () => {
  const clinic = repoTenants().find((t) => t.slug === 'clinicas')
  expect(clinic, 'the clinic is missing from the repo manifest').toBeTruthy()
  expect(
    clinic!.theme.accent.toLowerCase(),
    'this test needs a tenant whose accent differs from the default',
  ).not.toBe(COMPILED_DEFAULTS.accent)

  const css = themeDeclarations(clinic!)
  expect(css).toContain(`--color-accent:${clinic!.theme.accent}`)
  // The derivatives too: shipping the accent alone leaves hover and ring on the
  // platform's blue, which is a two-colour brand nobody asked for.
  for (const token of ['--color-accent-hover', '--color-accent-soft', '--color-accent-glow', '--color-accent-ring']) {
    expect(css, `${token} was not derived — the palette would be half one brand and half the other`).toContain(token)
  }
})

test('a manifest cannot write a stylesheet through the accent', () => {
  // The emitter interpolates into a <style>, so it is an injection sink. The
  // API validates on write, but this site does not own that API and the value
  // can also come from the repo manifest or a stale cache.
  const hostile = [
    'red;} body{display:none} .x{color:red',
    '#0f766e;} html{opacity:0',
    'javascript:alert(1)',
    '#0f76',
    '#0f766ee',
    'rgb(15,118,110)',
  ]
  for (const accent of hostile) {
    const css = themeDeclarations({
      ...(repoTenants().find((t) => t.slug === 'clinicas')!),
      theme: { accent, accent_contrast: '#ffffff', display_font: 'system-serif' },
    })
    expect(css, `"${accent}" reached the document`).toBe('')
  }

  // CONTROL: a well-formed accent that is not the default DOES get through, or
  // the assertions above would pass on an emitter that refuses everything.
  const ok = themeDeclarations({
    ...(repoTenants().find((t) => t.slug === 'clinicas')!),
    theme: { accent: '#0f766e', accent_contrast: '#ffffff', display_font: 'system-serif' },
  })
  expect(ok, 'the emitter refuses everything — the hostile cases prove nothing').toContain('#0f766e')
})

test('the SERVED page carries the tenant’s accent, and tenant #1 is untouched', async () => {
  // The story is explicit that the config object is not enough: it has to be in
  // what the browser receives.
  for (const tenant of repoTenants()) {
    const res = await getWithHost(`${BASE}/`, tenant.domain)
    expect(res.status, `${tenant.domain}/ must be served`).toBe(200)

    const isDefault = tenant.theme.accent.toLowerCase() === COMPILED_DEFAULTS.accent
    if (isDefault) {
      expect(
        res.body.includes(`--color-accent:${tenant.theme.accent}`),
        `${tenant.slug} declares the compiled accent, so it must add no block — that is the byte-for-byte baseline`,
      ).toBe(false)
    } else {
      expect(
        res.body,
        `${tenant.slug} declares ${tenant.theme.accent} and the served page does not carry it`,
      ).toContain(`--color-accent:${tenant.theme.accent}`)
    }
  }

  // Floor: with every tenant on the same side of that branch this proves nothing.
  const accents = new Set(repoTenants().map((t) => t.theme.accent.toLowerCase()))
  expect(accents.size, 'two tenants with the same accent cannot show that the theme is per-tenant').toBeGreaterThan(1)
})
