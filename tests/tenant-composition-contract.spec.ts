import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createServer as createHttpServer, type Server } from 'node:http'
import { join } from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { getWithHost } from './helpers/http-host'

const ROOT = process.cwd()
const FIXTURE_PATH = join(ROOT, 'tests/fixtures/service-lead-site.json')

type SiteTenantFixture = {
  slug: string
  brand_name: string
  brand_mark: string | null
  brand_wordmark: string | null
  domain: string
  locales: string[]
  default_locale: string
  home_template: 'platform-commerce' | 'service-lead'
  theme: { accent: string; accent_contrast: string; display_font: string }
  destinations: { docs: string | null; app: string | null; support: string | null; status: string | null }
  pages: string[]
  google_site_verification: string | null
  indexable: boolean
}

type SiteFixture = {
  tenant: SiteTenantFixture
  pagesResponse: {
    success: boolean
    data: {
      slug: string
      locale: string
      pages: unknown[]
      messages: Record<string, string>
    }
    msg: string
  }
}

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as SiteFixture
const DIRECTORY_HOST = 'directory.example'
const NON_HOME_HOST = 'single-non-home.example'
const NON_HOME_DIRECTORY_HOST = 'directory-no-home.example'
const PROBE_HOST = 'consultorio-aurora.example'
const BILINGUAL_HOST = 'centro-bilingue.example'

type CompositionSource = { path: string; source: string }

function compositionViolations(files: CompositionSource[]): string[] {
  const forbidden = /clinicas|clínica|ClinicasHome|tenant\.slug\s*===/i
  return files.flatMap(({ path, source }) => {
    const violations: string[] = []
    if (forbidden.test(path)) violations.push(`${path}: tenant-specific component path`)
    if (forbidden.test(source)) violations.push(`${path}: tenant-specific selector or copy`)
    return violations
  })
}

function rgbContrast(left: number[], right: number[]): number {
  const luminance = ([red, green, blue]: number[]) => {
    const channels = [red, green, blue].map((value) => {
      const channel = value / 255
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    })
    return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2])
  }
  const first = luminance(left)
  const second = luminance(right)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

function focusRingColors(boxShadow: string): number[][] {
  return [...boxShadow.matchAll(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/g)]
    .map((match) => [Number(match[1]), Number(match[2]), Number(match[3])])
}

function rgbColor(value: string): number[] | null {
  const match = /rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/.exec(value)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

const ROUTE_MESSAGE_SOURCES = [
  'src/components/AnnouncementBar.astro',
  'src/components/Breadcrumb.astro',
  'src/components/Footer.astro',
  'src/components/Header.astro',
  'src/components/LanguageSwitcher.astro',
  'src/components/Logo.astro',
  'src/i18n/feeds.ts',
  'src/layouts/BaseLayout.astro',
  'src/layouts/LegalLayout.astro',
  'src/page-content/Contact.astro',
  'src/page-content/NotFound.astro',
  'src/page-content/Terms.astro',
]

const ROUTE_MESSAGE_KEYS = [
  ...new Set(
    ROUTE_MESSAGE_SOURCES.flatMap((source) =>
      [...readFileSync(join(ROOT, source), 'utf8').matchAll(/\bt\(\s*(['"])([^'"]+)\1/g)]
        .map((match) => match[2]),
    ),
  ),
]

function routeMessages(locale: string): Record<string, string> {
  return Object.fromEntries(ROUTE_MESSAGE_KEYS.map((key) => [key, `${locale}:${key}`]))
}

function tenantFor(host: string): SiteTenantFixture | null {
  if (host === DIRECTORY_HOST) {
    return {
      ...fixture.tenant,
      slug: 'directory-probe',
      domain: DIRECTORY_HOST,
      pages: ['/', '/blog/'],
    }
  }
  if (host === NON_HOME_HOST) {
    return {
      ...fixture.tenant,
      slug: 'single-non-home',
      domain: NON_HOME_HOST,
      pages: ['/blog/'],
    }
  }
  if (host === NON_HOME_DIRECTORY_HOST) {
    return {
      ...fixture.tenant,
      slug: 'directory-no-home',
      domain: NON_HOME_DIRECTORY_HOST,
      pages: ['/solutions/', '/blog/'],
    }
  }
  if (host === PROBE_HOST) {
    return {
      ...fixture.tenant,
      slug: 'service-probe',
      brand_name: 'Consultorio Aurora',
      brand_mark: 'A',
      brand_wordmark: 'Consultorio Aurora',
      domain: PROBE_HOST,
    }
  }
  if (host === BILINGUAL_HOST) {
    return {
      ...fixture.tenant,
      slug: 'bilingual-default-es',
      brand_name: 'Centro Bilingüe',
      brand_mark: 'CB',
      brand_wordmark: 'Centro Bilingüe',
      domain: BILINGUAL_HOST,
      locales: ['es', 'en'],
      default_locale: 'es',
      pages: ['/', '/contact/', '/terms/', '/blog/', '/changelog/'],
      indexable: true,
    }
  }
  if (host === fixture.tenant.domain || host === '127.0.0.1') return fixture.tenant
  return null
}

function responseFor(tenant: SiteTenantFixture, locale: string): SiteFixture['pagesResponse'] {
  const response = structuredClone(fixture.pagesResponse)
  response.data.slug = tenant.slug
  response.data.locale = locale
  if (tenant.slug === 'service-probe') {
    response.data.messages = Object.fromEntries(
      Object.entries(response.data.messages).map(([key, value]) => [
        key,
        value.replaceAll('Clínica Delta', 'Consultorio Aurora'),
      ]),
    )
  }
  if (tenant.slug === 'directory-no-home') {
    response.data.messages = {
      ...response.data.messages,
      ...routeMessages(locale),
    }
  }
  if (tenant.slug === 'bilingual-default-es') {
    response.data.messages = {
      ...response.data.messages,
      ...routeMessages(locale),
    }
  }
  return response
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      const address = server.address()
      resolve(typeof address === 'object' && address ? address.port : 0)
    })
  })
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

async function unusedPort(): Promise<number> {
  const server = createHttpServer()
  const port = await listen(server)
  await close(server)
  return port
}

function startStubApi(): Promise<{ server: Server; baseUrl: string }> {
  const server = createHttpServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://stub')
    response.setHeader('content-type', 'application/json; charset=utf-8')

    if (url.pathname.endsWith('/sites/by-host')) {
      const tenant = tenantFor(url.searchParams.get('host') ?? '')
      if (tenant) {
        response.end(JSON.stringify({ success: true, data: tenant, msg: 'Site resolved' }))
        return
      }
      response.statusCode = 404
      response.end(JSON.stringify({ success: false, data: null, msg: 'Site not found' }))
      return
    }

    const contentMatch = /\/sites\/([^/]+)\/pages$/.exec(url.pathname)
    if (contentMatch) {
      const slug = decodeURIComponent(contentMatch[1])
      const tenant = [
        fixture.tenant,
        tenantFor(DIRECTORY_HOST),
        tenantFor(NON_HOME_HOST),
        tenantFor(NON_HOME_DIRECTORY_HOST),
        tenantFor(PROBE_HOST),
        tenantFor(BILINGUAL_HOST),
      ]
        .find((candidate) => candidate?.slug === slug)
      const locale = url.searchParams.get('locale') ?? tenant?.default_locale
      if (tenant && locale && tenant.locales.includes(locale)) {
        response.end(JSON.stringify(responseFor(tenant, locale)))
        return
      }
    }

    response.statusCode = 404
    response.end(JSON.stringify({ success: false, data: null, msg: 'Not found' }))
  })

  return listen(server).then((port) => ({ server, baseUrl: `http://127.0.0.1:${port}` }))
}

async function waitForSite(baseUrl: string, app: ChildProcessWithoutNullStreams, logs: () => string) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (app.exitCode !== null) throw new Error(`service-lead server exited early\n${logs()}`)
    try {
      const response = await getWithHost(`${baseUrl}/`, fixture.tenant.domain)
      if (response.status === 200) return
    } catch {
      // The standalone adapter has not bound its socket yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`service-lead server did not become ready\n${logs()}`)
}

async function stopProcess(app: ChildProcessWithoutNullStreams | null): Promise<void> {
  if (!app || app.exitCode !== null) return
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      app.kill('SIGKILL')
      resolve()
    }, 3_000)
    app.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
    app.kill('SIGTERM')
  })
}

let api: { server: Server; baseUrl: string } | null = null
let app: ChildProcessWithoutNullStreams | null = null
let appBaseUrl = ''
let appOutput = ''

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  expect(existsSync(join(ROOT, 'dist/server/entry.mjs')), 'build the standalone adapter before this suite').toBe(true)
  api = await startStubApi()
  const port = await unusedPort()
  appBaseUrl = `http://127.0.0.1:${port}`
  app = spawn(process.execPath, ['dist/server/entry.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      SITE_MANIFEST_SOURCE: 'api',
      SITE_API_BASE_URL: api.baseUrl,
    },
    stdio: 'pipe',
  })
  app.stdout.on('data', (chunk) => { appOutput += String(chunk) })
  app.stderr.on('data', (chunk) => { appOutput += String(chunk) })
  await waitForSite(appBaseUrl, app, () => appOutput)
})

test.afterAll(async () => {
  await stopProcess(app)
  if (api) await close(api.server)
  app = null
  api = null
})

test('the route edge selects a closed template catalogue and contains no tenant branch', () => {
  const routeFiles = ['src/pages/index.astro', 'src/pages/es/index.astro']
  const sources: CompositionSource[] = []
  for (const routeFile of routeFiles) {
    const source = readFileSync(join(ROOT, routeFile), 'utf8')
    sources.push({ path: routeFile, source })
    const templates = [...source.matchAll(/^\s*'([^']+)': \(\) => import\(/gm)].map((match) => match[1])
    expect(templates, `${routeFile} must expose exactly the approved strategies`).toEqual([
      'platform-commerce',
      'service-lead',
    ])
    expect(source).toContain('Astro.locals.tenant.home_template')
  }

  const serviceSource = readFileSync(join(ROOT, 'src/page-content/ServiceLeadHome.astro'), 'utf8')
  sources.push({ path: 'src/page-content/ServiceLeadHome.astro', source: serviceSource })
  expect(serviceSource).toContain('data-home-template="service-lead"')
  expect(serviceSource).not.toMatch(/CommerceOrbit|platform-modules|client:/)
  expect(compositionViolations(sources)).toEqual([])
})

test('control: a clinic-specific component or slug branch turns the composition guard red', () => {
  const routeSource = readFileSync(join(ROOT, 'src/pages/index.astro'), 'utf8')
  const componentSource = readFileSync(join(ROOT, 'src/page-content/ServiceLeadHome.astro'), 'utf8')
  const mutant = [
    {
      path: 'src/pages/index.astro',
      source: `${routeSource}\nif (Astro.locals.tenant.slug === 'clinicas') {}`,
    },
    {
      path: 'src/page-content/ClinicasHome.astro',
      source: componentSource,
    },
  ]

  expect(compositionViolations(mutant)).toEqual([
    'src/pages/index.astro: tenant-specific selector or copy',
    'src/page-content/ClinicasHome.astro: tenant-specific component path',
  ])
})

test('the API fixture rejects an unknown host instead of impersonating the clinic', async () => {
  if (!api) throw new Error('stub API was not started')
  const response = await fetch(`${api.baseUrl}/api/v1/sites/by-host?host=typo.example`)
  expect(response.status).toBe(404)
  expect(await response.json()).toMatchObject({ success: false, data: null })
})

test('a third tenant slug reuses service-lead without a layout or selector of its own', async () => {
  const response = await getWithHost(`${appBaseUrl}/`, PROBE_HOST)
  expect(response.status).toBe(200)
  expect(response.body).toContain('data-home-template="service-lead"')
  expect(response.body).toContain('Consultorio Aurora')
  expect(response.body).not.toContain('Clínica Delta')
})

test('the home shares one actionable support destination across header, hero and close', async ({ page }) => {
  const response = await page.goto(`${appBaseUrl}/`)
  expect(response?.status()).toBe(200)
  await expect(page.locator('[data-home-template="service-lead"]')).toBeVisible()

  const requiredPlacements = ['header', 'hero', 'closing', 'footer']
  for (const placement of requiredPlacements) {
    const cta = page.locator(`[data-support-cta="${placement}"]`)
    await expect(cta).toHaveCount(1)
    await expect(cta).toHaveAttribute('href', fixture.tenant.destinations.support!)
    await expect(cta).toHaveText(/Agendar una demostración/)
    await expect(cta).toHaveAccessibleName('Agendar una demostración con Clínica Delta')
  }

  await expect(page.locator('.site-header__nav')).toHaveCount(0)
  await expect(page.locator('#menu-toggle')).toHaveCount(0)
  await expect(page.locator('#mobile-menu')).toHaveCount(0)
  await expect(page.locator('.footer-cols')).toHaveCount(0)
  await expect(page.locator('footer[data-footer-layout="compact"]')).toHaveCount(1)

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  const tabbedPlacements: string[] = []
  for (let index = 0; index < 12 && tabbedPlacements.length < requiredPlacements.length; index += 1) {
    await page.keyboard.press('Tab')
    const placement = await page.evaluate(() =>
      document.activeElement?.getAttribute('data-support-cta') ?? null,
    )
    if (placement && !tabbedPlacements.includes(placement)) tabbedPlacements.push(placement)
  }
  expect(tabbedPlacements).toEqual(requiredPlacements)

  for (const placement of requiredPlacements) {
    const cta = page.locator(`[data-support-cta="${placement}"]`)
    await cta.focus()
    await expect(cta).toBeFocused()
    const cue = await cta.evaluate((element) => {
      const style = getComputedStyle(element)
      const surround = element.closest('section, footer, header')
      return {
        boxShadow: style.boxShadow,
        outlineStyle: style.outlineStyle,
        outlineColor: style.outlineColor,
        surroundColor: surround ? getComputedStyle(surround).backgroundColor : '',
      }
    })
    const colors = focusRingColors(cue.boxShadow)
    if (colors.length >= 2) {
      expect(
        rgbContrast(colors[0], colors[1]),
        `${placement} focus-ring layers need at least 3:1 contrast`,
      ).toBeGreaterThanOrEqual(3)
    } else {
      const outline = rgbColor(cue.outlineColor)
      const surround = rgbColor(cue.surroundColor)
      expect(cue.outlineStyle, `${placement} needs a visible outline or dual ring`).not.toBe('none')
      expect(outline, `${placement} outline colour must be measurable`).not.toBeNull()
      expect(surround, `${placement} surrounding colour must be measurable`).not.toBeNull()
      expect(
        rgbContrast(outline!, surround!),
        `${placement} outline needs at least 3:1 contrast against its surround`,
      ).toBeGreaterThanOrEqual(3)
    }
  }

  const heroCta = page.locator('[data-support-cta="hero"]')
  await heroCta.focus()

  await page.route('https://contacto.clinica.example/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Destino de contacto</h1>' }),
  )
  await page.keyboard.press('Enter')
  await page.waitForURL(fixture.tenant.destinations.support!)
})

test('the service composition tells Cobro → comprobante → factura without commerce artifacts', async ({ page }) => {
  await page.goto(`${appBaseUrl}/`)
  const flow = page.locator('.service-lead-flow')
  await expect(flow.locator('.service-lead-flow__label')).toHaveText(['01 · Cobro', '02 · Comprobante', '03 · Factura'])
  await expect(page.locator('.commerce-orbit')).toHaveCount(0)
  await expect(page.locator('img[src*="platform-modules"]')).toHaveCount(0)
  await expect(page.locator('.product-tools, .product-audiences, .product-faq')).toHaveCount(0)

  const headings = await page.locator('main h1, main h2, main h3').evaluateAll((nodes) =>
    nodes.map((node) => ({ level: Number(node.tagName.slice(1)), text: node.textContent?.trim() ?? '' })),
  )
  expect(headings.filter((heading) => heading.level === 1)).toHaveLength(1)
  expect(headings.every((heading) => heading.text.length > 0)).toBe(true)
})

test('one recovery destination produces a compact 404 with one main action', async ({ page }) => {
  const response = await page.goto(`${appBaseUrl}/pricing/`)
  expect(response?.status()).toBe(404)
  await expect(page.locator('[data-not-found-layout="compact"]')).toHaveCount(1)
  await expect(page.locator('main .error__cta')).toHaveCount(1)
  await expect(page.locator('main .error__nav')).toHaveCount(0)
  await expect(page.locator('main a')).toHaveCount(1)
  await expect(page.locator('#menu-toggle')).toHaveCount(0)
  await expect(page.locator('.footer-cols')).toHaveCount(0)
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
})

test('two recovery destinations restore the adaptive directory', async () => {
  const response = await getWithHost(`${appBaseUrl}/pricing/`, DIRECTORY_HOST)
  expect(response.status).toBe(404)
  expect(response.body).toContain('class="error__nav"')
  expect(response.body).not.toContain('data-not-found-layout="compact"')
  expect(response.body.match(/class="destination"/g)).toHaveLength(2)
})

test('a sole non-home recovery uses its own label instead of claiming it is home', async () => {
  const response = await getWithHost(`${appBaseUrl}/pricing/`, NON_HOME_HOST)
  expect(response.status).toBe(404)
  expect(response.body).toContain('data-not-found-layout="compact"')
  expect(response.body).toContain('href="/blog/"')
  expect(response.body).toContain(`>${fixture.pagesResponse.data.messages['nav.blog']}</a>`)
  expect(response.body).not.toContain(fixture.pagesResponse.data.messages['notFound.cta'])
})

test('a directory with no published home omits the primary home action', async () => {
  const response = await Promise.race([
    getWithHost(`${appBaseUrl}/pricing/`, NON_HOME_DIRECTORY_HOST),
    new Promise<never>((_, reject) => setTimeout(
      () => reject(new Error(`directory response timed out\n${appOutput}`)),
      5_000,
    )),
  ])
  expect(response.status).toBe(404)
  expect(response.body.match(/class="destination"/g)).toHaveLength(2)
  expect(response.body).not.toContain('class="btn btn--primary error__cta"')
  expect(response.body).not.toContain('href="/"')
})

test('service-lead SEO names only the published, non-indexable service site', async ({ page }) => {
  await page.goto(`${appBaseUrl}/`)
  await expect(page).toHaveTitle(fixture.pagesResponse.data.messages['serviceLead.title'])
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    fixture.pagesResponse.data.messages['serviceLead.description'],
  )
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    `https://${fixture.tenant.domain}/`,
  )
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0)

  const structuredData = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
    scripts.flatMap((script) => {
      const value = JSON.parse(script.textContent ?? 'null')
      return Array.isArray(value) ? value : [value]
    }),
  )
  expect(structuredData.map((entry) => entry['@type']).sort()).toEqual(['Organization', 'WebSite'])
  expect(JSON.stringify(structuredData)).not.toMatch(/Product|Offer|pricing/)
})

test('default-es bilingual URLs keep their public topology through internal rewrites', async () => {
  const spanish = await getWithHost(`${appBaseUrl}/contacto/`, BILINGUAL_HOST)
  expect(spanish.status).toBe(200)
  expect(spanish.body).toContain('<html lang="es"')
  expect(spanish.body).toContain('es:contact.headline.pre')
  expect(spanish.body).toContain(
    `<link rel="canonical" href="https://${BILINGUAL_HOST}/contacto/">`,
  )
  expect(spanish.body).toContain(
    `<link rel="alternate" hreflang="es" href="https://${BILINGUAL_HOST}/contacto/">`,
  )
  expect(spanish.body).toContain(
    `<link rel="alternate" hreflang="en" href="https://${BILINGUAL_HOST}/en/contact/">`,
  )
  expect(spanish.body).toContain(
    `<link rel="alternate" hreflang="x-default" href="https://${BILINGUAL_HOST}/contacto/">`,
  )

  const english = await getWithHost(`${appBaseUrl}/en/contact/`, BILINGUAL_HOST)
  expect(english.status).toBe(200)
  expect(english.body).toContain('<html lang="en"')
  expect(english.body).toContain('en:contact.headline.pre')
  expect(english.body).toContain(
    `<link rel="canonical" href="https://${BILINGUAL_HOST}/en/contact/">`,
  )
  expect(english.body).toContain(
    `<link rel="alternate" hreflang="es" href="https://${BILINGUAL_HOST}/contacto/">`,
  )
  expect(english.body).toContain(
    `<link rel="alternate" hreflang="en" href="https://${BILINGUAL_HOST}/en/contact/">`,
  )

  const spanishTerms = await getWithHost(`${appBaseUrl}/terminos/`, BILINGUAL_HOST)
  expect(spanishTerms.status).toBe(200)
  expect(spanishTerms.body).toMatch(
    /<a href="\/terminos\/" class="legal__doc legal__doc--current" aria-current="page"[^>]*>/,
  )

  const englishTerms = await getWithHost(`${appBaseUrl}/en/terms/`, BILINGUAL_HOST)
  expect(englishTerms.status).toBe(200)
  expect(englishTerms.body).toMatch(
    /<a href="\/en\/terms\/" class="legal__doc legal__doc--current" aria-current="page"[^>]*>/,
  )
})

test('default-es sitemap and feeds advertise only public tenant-aware URLs', async () => {
  const sitemap = await getWithHost(`${appBaseUrl}/sitemap-0.xml`, BILINGUAL_HOST)
  expect(sitemap.status).toBe(200)
  const locations = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  expect(locations).toEqual([
    `https://${BILINGUAL_HOST}/`,
    `https://${BILINGUAL_HOST}/blog/`,
    `https://${BILINGUAL_HOST}/contacto/`,
    `https://${BILINGUAL_HOST}/en/`,
    `https://${BILINGUAL_HOST}/en/blog/`,
    `https://${BILINGUAL_HOST}/en/changelog/`,
    `https://${BILINGUAL_HOST}/en/contact/`,
    `https://${BILINGUAL_HOST}/en/terms/`,
    `https://${BILINGUAL_HOST}/novedades/`,
    `https://${BILINGUAL_HOST}/terminos/`,
  ])
  expect(sitemap.body).not.toContain(`https://${BILINGUAL_HOST}/es/`)
  expect(sitemap.body).not.toContain(`https://${BILINGUAL_HOST}/contact/`)

  const spanishFeed = await getWithHost(`${appBaseUrl}/rss.xml`, BILINGUAL_HOST)
  expect(spanishFeed.status).toBe(200)
  expect(spanishFeed.body).toContain('<language>es</language>')
  expect(spanishFeed.body).toContain('<title>es:blog.feed.title</title>')

  const englishFeed = await getWithHost(`${appBaseUrl}/en/rss.xml`, BILINGUAL_HOST)
  expect(englishFeed.status).toBe(200)
  expect(englishFeed.body).toContain('<language>en</language>')
  expect(englishFeed.body).toContain('<title>en:blog.feed.title</title>')

  const spanishChangelog = await getWithHost(
    `${appBaseUrl}/novedades/feed.xml`,
    BILINGUAL_HOST,
  )
  expect(spanishChangelog.status).toBe(200)
  expect(spanishChangelog.body).toContain('<language>es</language>')
  expect(spanishChangelog.body).toContain('<title>es:changelog.feed.title</title>')

  const englishChangelog = await getWithHost(
    `${appBaseUrl}/en/changelog/feed.xml`,
    BILINGUAL_HOST,
  )
  expect(englishChangelog.status).toBe(200)
  expect(englishChangelog.body).toContain('<language>en</language>')
  expect(englishChangelog.body).toContain('<title>en:changelog.feed.title</title>')
})

test('home and compact 404 pass Axe and reflow at mobile, desktop and 200% equivalent', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844, label: '390px' },
    { width: 1440, height: 900, label: '1440px' },
  ]) {
    await page.setViewportSize(viewport)
    for (const path of ['/', '/pricing/']) {
      await page.goto(`${appBaseUrl}${path}`)
      const results = await new AxeBuilder({ page }).analyze()
      expect(
        results.violations,
        `${path} at ${viewport.label}: ${JSON.stringify(results.violations)}`,
      ).toEqual([])
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflows, `${path} overflows at ${viewport.label}`).toBe(false)
      if (path === '/' && viewport.width === 390) {
        const targets = await page.locator('[data-support-cta]').evaluateAll((elements) =>
          elements.map((element) => {
            const box = element.getBoundingClientRect()
            return { width: box.width, height: box.height }
          }),
        )
        expect(targets.length).toBeGreaterThan(0)
        for (const target of targets) {
          expect(target.width).toBeGreaterThanOrEqual(44)
          expect(target.height).toBeGreaterThanOrEqual(44)
        }
      }
    }
  }

  // A 1440×900 display at browser zoom 200% exposes a 720×450 CSS-pixel
  // layout viewport. Drive that effective viewport explicitly so the reflow
  // assertion is deterministic in headless Chromium.
  await page.setViewportSize({ width: 720, height: 450 })
  for (const path of ['/', '/pricing/']) {
    await page.goto(`${appBaseUrl}${path}`)
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflows, `${path} overflows at the 200% zoom equivalent`).toBe(false)
  }

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${appBaseUrl}/`)
  const motion = await page.locator('[data-support-cta]').evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element)
      return `${style.transitionDuration}|${style.animationDuration}`
    }),
  )
  expect(motion.every((value) => value === '0s|0s')).toBe(true)
})
