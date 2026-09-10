import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { openTenantPage, computedProperty } from './helpers/tenant-browser'

/**
 * Issues #93 and #94 — the chrome reads the platform's palette, not the
 * tenant's accent, and the tenant's declared display font never reaches an
 * element either.
 *
 * WHY THIS FILE VERIFIES COMPUTED STYLE, NOT SOURCE OR SERVED TEXT
 * ------------------------------------------------------------------
 * `tests/tenant-theme.spec.ts` already proves `themeDeclarations()` emits the
 * right CSS text and that the text reaches the served HTML. Neither proves it
 * reaches an ELEMENT: a custom property is only resolved once a browser lays
 * out the page, and — measured while building this fix — the tenant's
 * `<style>` block was losing the cascade to `global.css`'s own `<link>`
 * regardless of DOM order (see BaseLayout.astro's comment by `{themeCss && ...}`
 * and `tenant-theme.ts`'s `:root:root`). A test that stops at "the string is in
 * the body" would have stayed green through that bug. This one reads
 * `getComputedStyle` in a real Chromium instance instead.
 *
 * WHY SOME OF THE TEN ARE CROSS-TENANT AND SOME ARE PLATFORM-ONLY
 * ------------------------------------------------------------------
 * The clinic (the only non-platform fixture) does not render every one of the
 * ten sites issue #93 lists. Its explicit mark now exercises `.logo__mark` in
 * both header and footer, but its manifest has no `destinations.app`, so D-7
 * correctly renders no `.btn--footer`. That site is verified as a
 * NO-REGRESSION on the platform instead. `ProcessSpine.astro` and
 * `Changelog.astro` get the same treatment: the
 * clinic's repo-manifest fixture publishes only `/` (`site-tenants.ts` —
 * deliberately, until a later phase writes its vertical's pages), and neither
 * component is mounted on that route.
 *
 * `InterconnectDiagram.astro`'s `.motif__spine rect` is the one site with NO
 * live verification at all, on either tenant: `Hero`'s `motif` prop defaults
 * to `false` and no page in `src/page-content/` passes `true` — measured, the
 * component's CSS does not appear in ANY built `dist/client/_astro/*.css`
 * chunk, so Astro's own bundler has already determined it renders nowhere.
 * The token rename there is applied per issue #93's explicit list and
 * verified by the shared-mechanism argument above (same `--color-accent`,
 * same `:root` cascade, proven live everywhere else it is reachable) plus a
 * source check below — not a claim that this fix made it reachable. Whether
 * to wire `motif={true}` somewhere or remove the component is a separate,
 * pre-existing question outside these three issues.
 */

const CLINIC_HOST = 'clinicas.1platform.dev'
const PLATFORM_HOST = '1platform.pro'

test.describe('cross-tenant: elements reachable on both tenants\' home page', () => {
  const cases: Array<{ name: string; selector: string; property: string }> = [
    { name: 'store preview image (accent-soft wash)', selector: '.store-preview__image', property: 'background-color' },
    { name: 'store preview card edge (accent)', selector: '.store-preview__image span', property: 'border-color' },
    { name: 'payment card (accent color-mix)', selector: '.payment-card', property: 'background-color' },
    { name: 'inverse event label (accent-bright)', selector: '.orbit-card__event--inverse strong', property: 'color' },
  ]

  for (const { name, selector, property } of cases) {
    test(`${name}: the clinic's own accent reaches it, and differs from the platform's`, async () => {
      const platform = await openTenantPage(PLATFORM_HOST, '/')
      const clinic = await openTenantPage(CLINIC_HOST, '/')
      try {
        const platformValue = await computedProperty(platform.page, selector, property)
        const clinicValue = await computedProperty(clinic.page, selector, property)

        expect(platformValue, `${selector} did not render on the platform's home page — broken probe`).toBeTruthy()
        expect(clinicValue, `${selector} did not render on the clinic's home page — broken probe`).toBeTruthy()
        expect(
          clinicValue,
          `${selector}'s ${property} is identical on both tenants (${platformValue}) — the clinic's ` +
            `own accent (#0f766e) is not reaching this element`,
        ).not.toBe(platformValue)
      } finally {
        await platform.browser.close()
        await clinic.browser.close()
      }
    })
  }

  test('the clinic\'s edge colour IS its declared accent, literally', async () => {
    // The one property above with no color-mix() in between (Logo.astro's
    // sibling usage: a plain `border: 1px solid var(--color-accent)`), so the
    // computed value can be pinned to the exact hex the manifest declares —
    // stronger than "differs from the platform".
    const { browser, page } = await openTenantPage(CLINIC_HOST, '/')
    try {
      const border = await computedProperty(page, '.store-preview__image span', 'border-color')
      expect(border).toBe('rgb(15, 118, 110)') // #0f766e
    } finally {
      await browser.close()
    }
  })

  test('the platform is untouched: every accent-carrying property is still the compiled cobalt', async () => {
    const { browser, page } = await openTenantPage(PLATFORM_HOST, '/')
    try {
      expect(await computedProperty(page, '.logo__mark', 'background-color')).toBe('rgb(23, 72, 167)') // #1748a7
      expect(await computedProperty(page, '.store-preview__image span', 'border-color')).toBe('rgb(23, 72, 167)')
      expect(await computedProperty(page, '.orbit-card__event--inverse strong', 'color')).toBe('rgb(120, 166, 255)') // #78a6ff
    } finally {
      await browser.close()
    }
  })
})

test.describe('explicit tenant mark and platform-only regression sites', () => {
  /**
   * Mark and wordmark are separate manifest data. A letter-led brand may
   * deliberately declare a symbol; the component must render that complete
   * lockup without cutting the first character out of the wordmark.
   */
  test('the clinic draws its declared mark with its own header and footer palette', async () => {
    const { browser, page } = await openTenantPage(CLINIC_HOST, '/')
    try {
      const marks = page.locator('.logo__mark')
      expect(await marks.allTextContents()).toEqual(['C', 'C'])
      expect(await computedProperty(page, '.site-header .logo__mark', 'background-color')).toBe(
        'rgb(15, 118, 110)',
      )
      expect(await computedProperty(page, '.site-footer .logo__mark', 'background-color')).toBe(
        'rgb(149, 195, 191)',
      )
    } finally {
      await browser.close()
    }
  })

  test('the footer logo mark and CTA still carry the compiled --cobalt-bright on the platform', async () => {
    const { browser, page } = await openTenantPage(PLATFORM_HOST, '/')
    try {
      expect(await computedProperty(page, '.site-footer .logo__mark', 'background-color')).toBe('rgb(120, 166, 255)')
      expect(await computedProperty(page, '.btn--footer', 'background-color')).toBe('rgb(120, 166, 255)')
      expect(await computedProperty(page, '.btn--footer', 'border-color')).toBe('rgb(120, 166, 255)')
    } finally {
      await browser.close()
    }
  })

  test('the process spine node still carries the compiled accent, on a page the clinic does not publish', async () => {
    const { browser, page } = await openTenantPage(PLATFORM_HOST, '/pricing/')
    try {
      expect(await computedProperty(page, '.spine__node', 'background-color')).toBe('rgb(23, 72, 167)')
    } finally {
      await browser.close()
    }
  })

  test('the changelog entry node still carries the compiled accent, on a page the clinic does not publish', async () => {
    const { browser, page } = await openTenantPage(PLATFORM_HOST, '/changelog/')
    try {
      expect(await computedProperty(page, '.entry__node', 'background-color')).toBe('rgb(23, 72, 167)')
    } finally {
      await browser.close()
    }
  })
})

test('the unreachable interconnect motif stays on the bridged primitive — measured, not assumed', async () => {
  // No page passes `motif` to Hero, so `.motif__spine` renders nowhere and no
  // computed-style probe above can reach it. This is the only one of the ten
  // sites verified by reading the component's OWN source rather than a
  // rendered page — the exception rule 5 warns about (a <style> is not
  // verified by reading its source) does not apply to code nothing builds.
  const css = readFileSync('src/components/InterconnectDiagram.astro', 'utf8')
  expect(css, 'the platform component must retain its byte-stable primitive').toContain(
    'var(--cobalt)',
  )

  const { repoTenants } = await import('../src/data/site-tenants')
  const { themeDeclarations } = await import('../src/lib/tenant-theme')
  const clinic = repoTenants().find((tenant) => tenant.slug === 'clinicas')!
  expect(
    themeDeclarations(clinic),
    'a non-default tenant must rebind the primitive used by unreachable legacy chrome',
  ).toContain(`--cobalt:${clinic.theme.accent}`)
})

/**
 * Issue #94 — `.logo`'s `font-family` is the one accent-carrying rule that IS
 * reachable on both tenants' home page (Logo mounts in Header AND Footer of
 * every page), so display_font gets the same live, cross-tenant proof the
 * color tokens got above.
 */
test.describe('display_font reaches the element (issue #94)', () => {
  test('the clinic\'s declared serif reaches .logo, and the platform keeps Space Grotesk', async () => {
    const platform = await openTenantPage(PLATFORM_HOST, '/')
    const clinic = await openTenantPage(CLINIC_HOST, '/')
    try {
      const platformFont = await computedProperty(platform.page, '.logo', 'font-family')
      const clinicFont = await computedProperty(clinic.page, '.logo', 'font-family')

      expect(platformFont, 'tenant #1 must still title in the compiled default').toContain('Space Grotesk')
      expect(
        clinicFont,
        `the clinic declares system-serif but .logo computed to "${clinicFont}" — the same as the platform`,
      ).not.toContain('Space Grotesk')
      expect(clinicFont).toContain('Georgia')
    } finally {
      await platform.browser.close()
      await clinic.browser.close()
    }
  })
})
