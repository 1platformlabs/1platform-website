import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { chromium, expect, test as base, type Browser, type Page } from '@playwright/test'

import { openTenantPage, computedProperty } from './helpers/tenant-browser'
import { getWithHost } from './helpers/http-host'
import { repoTenants } from '../src/data/site-tenants'

/**
 * Issues #93 and #94: tokens must reach rendered elements, not just CSS text.
 * The photographic landing supersedes the platform home. CommerceOrbit remains
 * a supported composition, so its original cross-tenant regressions run against
 * two explicit platform-commerce manifests through the normal API resolver.
 * Standard page chrome and the new landing are also checked on their real repo
 * tenant routes. This fixture is a component integration check, not local E2E.
 */

const CLINIC_HOST = 'clinicas.1platform.dev'
const PLATFORM_HOST = '1platform.pro'

type LegacyCommerce = {
  open: (host: string) => Promise<{ browser: Browser; page: Page }>
}

type ExportedPage = { route: string; locale: string; published: boolean; blocks: Record<string, string> }

async function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      const address = server.address()
      if (!address || typeof address === 'string') return reject(new Error('No local TCP port assigned'))
      resolve(address.port)
    })
  })
}

async function close(server: Server): Promise<void> {
  if (!server.listening) return
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

async function stop(app: ChildProcessWithoutNullStreams | undefined): Promise<void> {
  if (!app || app.exitCode !== null) return
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => { app.kill('SIGKILL'); resolve() }, 3000)
    app.once('exit', () => { clearTimeout(timer); resolve() })
    app.kill('SIGTERM')
  })
}

const test = base.extend<{}, { legacyCommerce: LegacyCommerce }>({
  legacyCommerce: [async ({}, use) => {
    const directory = mkdtempSync(join(tmpdir(), 'website-commerce-colors-'))
    const exportPath = join(directory, 'site-content.json')
    let app: ChildProcessWithoutNullStreams | undefined
    const manifests = repoTenants()
      .filter((tenant) => [PLATFORM_HOST, CLINIC_HOST].includes(tenant.domain))
      .map((tenant) => ({ ...tenant, home_template: 'platform-commerce' as const }))
    let documents: ExportedPage[] = []
    const api = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://fixture')
      response.setHeader('content-type', 'application/json')
      if (url.pathname === '/api/v1/sites/by-host') {
        const tenant = manifests.find((item) => item.domain === url.searchParams.get('host'))
        if (tenant) return void response.end(JSON.stringify({ success: true, data: tenant, msg: 'ok' }))
      }
      const match = /^\/api\/v1\/sites\/([^/]+)\/pages$/.exec(url.pathname)
      const tenant = match && manifests.find((item) => item.slug === match[1])
      const locale = url.searchParams.get('locale') ?? tenant?.default_locale
      if (tenant && locale && tenant.locales.includes(locale)) {
        const pages = documents.filter((item) => item.locale === locale)
        const messages = Object.assign({}, ...pages.map((item) => item.blocks)) as Record<string, string>
        return void response.end(JSON.stringify({ success: true, data: { slug: tenant.slug, locale, pages, messages }, msg: 'ok' }))
      }
      response.statusCode = 404
      response.end(JSON.stringify({ success: false, data: null, msg: 'not found' }))
    })
    try {
      expect(manifests).toHaveLength(2)
      execFileSync(process.execPath, ['scripts/export-site-content.mjs', '--out', exportPath], { stdio: 'pipe' })
      documents = (JSON.parse(readFileSync(exportPath, 'utf8')) as { documents: ExportedPage[] }).documents
      const apiPort = await listen(api)
      const reservation = createServer()
      const port = await listen(reservation)
      await close(reservation)
      app = spawn(process.execPath, ['dist/server/entry.mjs'], {
        env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), SITE_MANIFEST_SOURCE: 'api', SITE_API_BASE_URL: `http://127.0.0.1:${apiPort}` },
        stdio: 'pipe',
      })
      let logs = ''
      app.stdout.on('data', (chunk) => { logs = (logs + String(chunk)).slice(-8192) })
      app.stderr.on('data', (chunk) => { logs = (logs + String(chunk)).slice(-8192) })
      const deadline = Date.now() + 30_000
      let ready = false
      while (Date.now() < deadline) {
        if (app.exitCode !== null) throw new Error(`Commerce fixture exited early: ${logs}`)
        try { ready = (await getWithHost(`http://127.0.0.1:${port}/`, PLATFORM_HOST)).status === 200 } catch { /* Adapter startup. */ }
        if (ready) break
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      if (!ready) throw new Error(`Commerce fixture did not become ready: ${logs}`)
      await use({ open: async (host) => {
        const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${host} 127.0.0.1`] })
        try {
          const page = await browser.newPage()
          const response = await page.goto(`http://${host}:${port}/`)
          expect(response?.status()).toBe(200)
          await expect(page.locator('.orbit-card')).toHaveCount(4)
          return { browser, page }
        } catch (error) {
          await browser.close()
          throw error
        }
      } })
    } finally {
      await stop(app)
      await close(api)
      rmSync(directory, { recursive: true, force: true })
    }
  }, { scope: 'worker' }],
})

test.describe('cross-tenant: the same supported commerce composition under both palettes', () => {
  const cases: Array<{ name: string; selector: string; property: string }> = [
    { name: 'store preview image (accent-soft wash)', selector: '.store-preview__image', property: 'background-color' },
    { name: 'store preview card edge (accent)', selector: '.store-preview__image span', property: 'border-color' },
    { name: 'payment card (accent color-mix)', selector: '.payment-card', property: 'background-color' },
    { name: 'inverse event label (accent-bright)', selector: '.orbit-card__event--inverse strong', property: 'color' },
  ]

  for (const { name, selector, property } of cases) {
    test(`${name}: the clinic's own accent reaches it, and differs from the platform's`, async ({ legacyCommerce }) => {
      const platform = await legacyCommerce.open(PLATFORM_HOST)
      const clinic = await legacyCommerce.open(CLINIC_HOST)
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

  test('the commerce composition retains the platform palette when its manifest selects it', async ({ legacyCommerce }) => {
    const { browser, page } = await legacyCommerce.open(PLATFORM_HOST)
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

  test('the standard footer logo mark and CTA still carry the compiled --cobalt-bright on the platform', async () => {
    const { browser, page } = await openTenantPage(PLATFORM_HOST, '/about/')
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
 * reachable in both tenants' standard chrome (the platform's /about/ and
 * the clinic's legacy home), so display_font gets the same cross-tenant proof the
 * color tokens got above.
 */
test.describe('display_font reaches the element (issue #94)', () => {
  test('the clinic\'s declared serif reaches .logo, and the platform keeps Space Grotesk', async () => {
    const platform = await openTenantPage(PLATFORM_HOST, '/about/')
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


test('the photographic platform home uses its cobalt palette and Manrope without repainting standard pages', async () => {
  const { browser, page } = await openTenantPage(PLATFORM_HOST, '/')
  try {
    await expect(page.locator('body')).toHaveAttribute('data-home-template', 'photographic-service')
    await expect(page.locator('body')).toHaveAttribute('data-palette', 'brand')
    expect(await computedProperty(page, '.hero h1', 'font-family')).toContain('Manrope')
    expect(await computedProperty(page, '.brand-mark', 'color')).toBe('rgb(23, 72, 167)')
    expect(await computedProperty(page, '.button-teal', 'background-color')).toBe('rgb(23, 72, 167)')
    await page.goto(`http://${PLATFORM_HOST}:${process.env.PLAYWRIGHT_PORT ?? 4321}/about/`)
    expect(await computedProperty(page, '.logo', 'font-family')).toContain('Space Grotesk')
    expect(await computedProperty(page, '.logo__mark', 'background-color')).toBe('rgb(23, 72, 167)')
  } finally {
    await browser.close()
  }
})
