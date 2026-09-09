import { expect, test } from '@playwright/test'

import { repoTenants } from '../src/data/site-tenants'
import type { SiteTenant } from '../src/lib/site-api'
import {
  alternatesForTenantPath,
  canonicalPathForTenant,
  makeLocalizePath,
} from '../src/lib/site-locale'
import { getWithHost } from './helpers/http-host'

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4321)
const BASE = `http://127.0.0.1:${PORT}`
const CLINIC_HOST = 'clinicas.1platform.dev'

function tenants(): { platform: SiteTenant; clinic: SiteTenant } {
  const platform = repoTenants().find((tenant) => tenant.slug === 'oneplatform')
  const clinic = repoTenants().find((tenant) => tenant.slug === 'clinicas')
  expect(platform, 'the repo manifest needs the platform control').toBeTruthy()
  expect(clinic, 'the repo manifest needs the monolingual subject').toBeTruthy()
  return { platform: platform!, clinic: clinic! }
}

test('tenant #1 keeps its established alternate paths and order', () => {
  const { platform } = tenants()
  const alternates = alternatesForTenantPath(platform, '/pricing/')

  expect(Object.keys(alternates), 'alternate insertion order is part of the frozen HTML').toEqual([
    'en',
    'es',
  ])
  expect(alternates).toEqual({ en: '/pricing/', es: '/es/precios/' })
})

test('a monolingual tenant advertises no language destination', () => {
  const { clinic } = tenants()
  expect(alternatesForTenantPath(clinic, '/')).toEqual({})

  // Even a caller-supplied map cannot bypass the manifest.
  expect(alternatesForTenantPath(clinic, '/', { en: '/', es: '/es/' })).toEqual({})
})

test('a Spanish-default bilingual tenant derives both twins from one canonical route', () => {
  const { clinic } = tenants()
  const tenant: SiteTenant = {
    ...clinic,
    locales: ['es', 'en'],
    default_locale: 'es',
    pages: ['/', '/contact/'],
  }
  const localise = makeLocalizePath(tenant)

  expect(canonicalPathForTenant('/contacto/', tenant)).toBe('/contact/')
  expect(canonicalPathForTenant('/en/contact/', tenant)).toBe('/contact/')
  expect(localise('/contact/', 'es')).toBe('/contacto/')
  expect(localise('/contact/', 'en')).toBe('/en/contact/')
  expect(alternatesForTenantPath(tenant, '/contacto/')).toEqual({
    es: '/contacto/',
    en: '/en/contact/',
  })
  expect(alternatesForTenantPath(tenant, '/en/contact/')).toEqual({
    es: '/contacto/',
    en: '/en/contact/',
  })

  // CONTROL: the platform-only operation sees `/contacto/` as its own route,
  // so it would filter the real `/contact/` page out of the manifest.
  expect(tenant.pages).not.toContain('/contacto/')
})

test('explicit translated content alternates keep their slugs under reversed topology', () => {
  const { clinic } = tenants()
  const tenant: SiteTenant = {
    ...clinic,
    locales: ['es', 'en'],
    default_locale: 'es',
    pages: ['/blog/ai-content-best-practices/'],
  }

  expect(
    alternatesForTenantPath(tenant, '/blog/contenido-con-ia-buenas-practicas-seo/', {
      en: '/blog/ai-content-best-practices/',
      es: '/es/blog/contenido-con-ia-buenas-practicas-seo/',
    }),
  ).toEqual({
    es: '/blog/contenido-con-ia-buenas-practicas-seo/',
    en: '/en/blog/ai-content-best-practices/',
  })
})

test('served monolingual HTML has no alternate, x-default or locale detector', async () => {
  const response = await getWithHost(`${BASE}/`, CLINIC_HOST)
  expect(response.status).toBe(200)
  expect(response.body).not.toContain('rel="alternate"')
  expect(response.body).not.toContain('hreflang=')
  expect(response.body).not.toContain('__1pLangChecked')
  expect(response.body).toContain('<html lang="es"')
})

test('a fresh es-GT browser stays on the monolingual tenant root', async ({ browser }) => {
  const isolatedBrowser = await browser.browserType().launch({
    args: [`--host-resolver-rules=MAP ${CLINIC_HOST} 127.0.0.1`],
  })
  const context = await isolatedBrowser.newContext({ locale: 'es-GT' })
  const page = await context.newPage()

  try {
    const response = await page.goto(`http://${CLINIC_HOST}:${PORT}/`)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(`http://${CLINIC_HOST}:${PORT}/`)
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page.locator('h1')).toBeVisible()
    expect(await page.evaluate(() => '__1pLangChecked' in window)).toBe(false)
  } finally {
    await context.close()
    await isolatedBrowser.close()
  }
})
