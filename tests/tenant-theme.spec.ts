import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { repoTenants } from '../src/data/site-tenants'
import { DISPLAY_FONTS, type DisplayFont } from '../src/lib/site-api'
import {
  COMPILED_DEFAULTS,
  DISPLAY_FONT_STACKS,
  deriveAccentRamp,
  themeDeclarations,
} from '../src/lib/tenant-theme'
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
const CLINIC_HOST = 'clinicas.1platform.dev'

interface ColorVector {
  name: string
  accent: string
  tokens: ReturnType<typeof deriveAccentRamp>
}

const colorVectors = JSON.parse(
  readFileSync('tests/fixtures/site_theme_color_vectors.json', 'utf8'),
) as { vectors: ColorVector[] }

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

  const displayStack = css.match(/--font-display:\s*([^;]+);/)?.[1]?.trim()
  expect(displayStack, 'global.css no longer declares --font-display').toBeTruthy()
  expect(
    displayStack,
    'global.css changed its display stack but COMPILED_DEFAULTS did not — tenant #1 would emit a redundant override',
  ).toBe(DISPLAY_FONT_STACKS[COMPILED_DEFAULTS.display_font])
})

test('the display-font map is exhaustive and contains only closed stacks', () => {
  expect(Object.keys(DISPLAY_FONT_STACKS)).toEqual([...DISPLAY_FONTS])
  for (const font of DISPLAY_FONTS) {
    expect(DISPLAY_FONT_STACKS[font], `${font} has no concrete CSS stack`).toBeTruthy()
  }
})

test('the accent ramp matches the API golden vectors channel for channel', () => {
  expect(colorVectors.vectors.map((vector) => vector.name)).toEqual([
    'oneplatform',
    'clinicas',
    'round-half-up',
  ])
  for (const vector of colorVectors.vectors) {
    expect(deriveAccentRamp(vector.accent), vector.name).toEqual(vector.tokens)
  }
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
  for (const token of [
    '--color-accent-hover',
    '--color-accent-soft',
    '--color-accent-glow',
    '--color-accent-ring',
    // Issue #93: this one carries the accent onto the footer's dark chrome
    // (Footer.astro's .logo__mark and .btn--footer) — without it those two
    // elements stay on the platform's --cobalt-bright regardless of accent.
    '--color-accent-bright',
  ]) {
    expect(css, `${token} was not derived — the palette would be half one brand and half the other`).toContain(token)
  }
  for (const token of ['--cobalt', '--cobalt-deep', '--cobalt-bright', '--cobalt-wash']) {
    expect(css, `${token} was not bridged — legacy chrome would keep the platform palette`).toContain(token)
  }
  expect(css).toContain(
    '--shadow-glow-ring:0 0 0 2px var(--surface),0 0 0 5px var(--color-text)',
  )
  expect(css).toContain(`--color-accent-ink:${clinic!.theme.accent_contrast}`)
  expect(css).toContain(`--font-display:${DISPLAY_FONT_STACKS['instrument-serif']}`)
  expect(css).toContain('.logo__mark,.spine__node,.motif__spine')
  expect(css).toContain('.site-footer .logo__mark')
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
      // The compiled default font, so a hostile ACCENT is what is under test
      // here — a non-default font would add its own --font-display block and
      // the assertion below would fail for the wrong reason.
      theme: { accent, accent_contrast: '#ffffff', display_font: COMPILED_DEFAULTS.display_font },
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

/**
 * Issue #94 — `display_font` reaches the document too.
 *
 * The manifest declared it, the API validated it, and nothing rendered it:
 * tenant #1 declared `instrument-serif` while the site drew Space Grotesk, and
 * every tenant titled the same regardless of what it declared.
 */
test('tenant #1’s corrected font IS the compiled default, so it stays untouched', () => {
  // This is the other half of the byte-for-byte guarantee: fixing the DATA
  // (site-tenants.ts) rather than inventing a mapping is only safe if the
  // corrected value actually resolves to what global.css compiles.
  const platform = repoTenants().find((t) => t.slug === 'oneplatform')!
  expect(
    platform.theme.display_font,
    'tenant #1 must declare the family its own site draws, or this test would not catch a re-introduced mismatch',
  ).toBe(COMPILED_DEFAULTS.display_font)
  expect(themeDeclarations(platform)).toBe('')
})

test('a tenant with its own display_font emits --font-display', () => {
  const clinic = repoTenants().find((t) => t.slug === 'clinicas')!
  expect(
    clinic.theme.display_font,
    'this test needs a tenant whose font differs from the compiled default',
  ).not.toBe(COMPILED_DEFAULTS.display_font)

  const css = themeDeclarations(clinic)
  expect(css, 'display_font differs from the default but no --font-display was emitted').toContain('--font-display:')
})

test('display_font is a closed enum, not free text, inside the <style>', () => {
  // Same injection-sink reasoning as the accent: this string is interpolated
  // into a document. Unlike the accent there is no format to validate against
  // (a font family is not a fixed grammar), so the whole value must come from
  // a fixed set instead — anything else is refused rather than reaching the
  // page, exactly like a malformed accent.
  const clinic = repoTenants().find((t) => t.slug === 'clinicas')!
  const hostile = ['Arial', 'system-serif; } body { display:none', 'javascript:alert(1)', '']
  for (const display_font of hostile) {
    const css = themeDeclarations({
      ...clinic,
      theme: { ...clinic.theme, display_font: display_font as DisplayFont },
    })
    expect(css, `"${display_font}" reached the document via --font-display`).not.toContain('--font-display:')
  }

  // CONTROL: a recognised, non-default value DOES get through, or the
  // assertions above would pass on an emitter that refuses every font.
  const ok = themeDeclarations({ ...clinic, theme: { ...clinic.theme, display_font: 'instrument-serif' } })
  expect(ok, 'the emitter refuses every font — the hostile cases above prove nothing').toContain('--font-display:')
})

test('a manifest cannot write a stylesheet through accent ink or display font', () => {
  const clinic = repoTenants().find((t) => t.slug === 'clinicas')!
  const hostileInk = themeDeclarations({
    ...clinic,
    theme: { ...clinic.theme, accent_contrast: '#fff;}body{display:none' },
  })
  expect(hostileInk).toBe('')

  const hostileFont = themeDeclarations({
    ...clinic,
    theme: {
      ...clinic.theme,
      display_font: "serif;display:none" as DisplayFont,
    },
  })
  expect(hostileFont).toBe('')
})

test('Logo consumes the explicit lockup and never cuts the brand name', () => {
  const source = readFileSync('src/components/Logo.astro', 'utf8')
  expect(source).toContain('tenant.brand_mark')
  expect(source).toContain('tenant.brand_wordmark')
  expect(source, 'restoring slice() would render C + línica Delta again').not.toContain('.slice(')

  // CONTROL: the historical operation really does produce the reported bug.
  expect(['Clínica Delta'.slice(0, 1), 'Clínica Delta'.slice(1)]).toEqual([
    'C',
    'línica Delta',
  ])
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

test('the browser computes the clinic accent, ink and display face', async ({ browser }) => {
  const isolatedBrowser = await browser.browserType().launch({
    args: [`--host-resolver-rules=MAP ${CLINIC_HOST} 127.0.0.1`],
  })
  const context = await isolatedBrowser.newContext()
  const page = await context.newPage()

  try {
    const response = await page.goto(`http://${CLINIC_HOST}:${PORT}/`)
    expect(response?.status()).toBe(200)
    await page.evaluate(() => document.fonts.ready)

    const computed = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      const headerMark = document.querySelector<HTMLElement>('.site-header .logo__mark')
      const footerMark = document.querySelector<HTMLElement>('.site-footer .logo__mark')
      const logo = document.querySelector<HTMLElement>('.site-header .logo')
      const heading = document.querySelector<HTMLElement>('h1')
      if (!headerMark || !footerMark || !logo || !heading) {
        throw new Error('theme probes need header/footer lockups and an h1')
      }
      return {
        accent: root.getPropertyValue('--color-accent').trim(),
        legacyAccent: root.getPropertyValue('--cobalt').trim(),
        headerMarkBackground: getComputedStyle(headerMark).backgroundColor,
        headerMarkInk: getComputedStyle(headerMark).color,
        footerMarkBackground: getComputedStyle(footerMark).backgroundColor,
        footerMarkInk: getComputedStyle(footerMark).color,
        logoFamily: getComputedStyle(logo).fontFamily,
        headingFamily: getComputedStyle(heading).fontFamily,
        fontLoaded: document.fonts.check("400 16px 'Instrument Serif'"),
      }
    })

    expect(computed).toEqual({
      accent: '#0f766e',
      legacyAccent: '#0f766e',
      headerMarkBackground: 'rgb(15, 118, 110)',
      headerMarkInk: 'rgb(255, 255, 255)',
      footerMarkBackground: 'rgb(149, 195, 191)',
      footerMarkInk: 'rgb(19, 21, 26)',
      logoFamily: expect.stringContaining('Instrument Serif'),
      headingFamily: expect.stringContaining('Instrument Serif'),
      fontLoaded: true,
    })
  } finally {
    await context.close()
    await isolatedBrowser.close()
  }
})

/**
 * The brand chip in the hero's invoice mockup.
 *
 * It was the literal `1P` — the platform's mark drawn onto a client's landing
 * page. `aria-hidden`, so nothing announced it, but plainly visible, and no
 * sweep could have caught it: "1P" is far too short to blocklist.
 */
test('the invoice mockup carries the TENANT’s mark, not the platform’s', async () => {
  const { brandChip } = await import('../src/lib/tenant-theme')

  // Tenant #1 must be unchanged — `1P` is what the frozen baseline holds, and
  // every page carries this scene.
  const platform = repoTenants().find((t) => t.slug === 'oneplatform')!
  expect(brandChip(platform), 'tenant #1’s chip changed — that is the byte-for-byte baseline').toBe('1P')

  const clinic = repoTenants().find((t) => t.slug === 'clinicas')!
  expect(brandChip(clinic)).toBe('CD')

  // Both shapes of the rule, so neither branch is untested.
  expect(brandChip({ ...clinic, brand_mark: null, brand_name: 'Acme' })).toBe('Ac')
  expect(brandChip({ ...clinic, brand_mark: null, brand_name: 'Acme Health Group' })).toBe('AH')
  expect(brandChip({ ...clinic, brand_mark: null, brand_name: 'X' })).toBe('X')

  // And in the SERVED page, which is the only place it matters.
  for (const tenant of repoTenants()) {
    if (!tenant.pages.includes('/')) continue
    const res = await getWithHost(`${BASE}/`, tenant.domain)
    expect(res.status).toBe(200)
    const rendered = /invoice-preview__number"[^>]*>([^<]*)</.exec(res.body)?.[1]
    expect(rendered, `${tenant.slug}: the invoice mockup rendered no chip at all`).toBeTruthy()
    expect(rendered, `${tenant.slug} is serving somebody else’s mark`).toBe(brandChip(tenant))
  }
})
