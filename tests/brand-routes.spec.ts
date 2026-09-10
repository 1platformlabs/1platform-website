import { expect, test } from '@playwright/test'

import { getWithHost } from './helpers/http-host'

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4321)
const BASE = `http://127.0.0.1:${PORT}`

test('brand routes are available for resolved tenants and remain unavailable to unknown hosts', async () => {
  const [platform, clinic, unknown] = await Promise.all([
    getWithHost(`${BASE}/brand/icon.svg`, '1platform.pro'),
    getWithHost(`${BASE}/brand/icon.svg`, 'clinicas.1platform.dev'),
    getWithHost(`${BASE}/brand/icon.svg`, 'unknown-brand-route.example'),
  ])

  expect(platform.status, 'the infrastructure gate must not exclude tenant #1').toBe(200)
  expect(clinic.status).toBe(200)
  expect(unknown.status, 'middleware must reject unknown hosts before the route gate').toBe(404)
  expect(platform.headers['content-type']).toContain('image/svg+xml')
  expect(clinic.body, 'two tenants must not receive the same derived icon').not.toBe(platform.body)
})

test('a derived social card is an actual same-origin route', async () => {
  const clinic = await getWithHost(`${BASE}/brand/social.png`, 'clinicas.1platform.dev')
  expect(clinic.status).toBe(200)
  expect(clinic.headers['content-type']).toContain('image/png')
  expect(clinic.headers['cache-control']).toContain('max-age=86400')
})

test('the derived touch icon is a same-origin route, per tenant, and closed to unknown hosts', async () => {
  const [platform, clinic, unknown] = await Promise.all([
    getWithHost(`${BASE}/brand/apple-touch-icon.png`, '1platform.pro'),
    getWithHost(`${BASE}/brand/apple-touch-icon.png`, 'clinicas.1platform.dev'),
    getWithHost(`${BASE}/brand/apple-touch-icon.png`, 'unknown-brand-route.example'),
  ])

  expect(clinic.status).toBe(200)
  expect(clinic.headers['content-type']).toContain('image/png')
  expect(clinic.headers['cache-control']).toContain('max-age=86400')
  expect(unknown.status, 'middleware must reject unknown hosts before the route gate').toBe(404)
  // Tenant #1 declares its own touch icon and therefore never links here, but
  // the route must not become a hole in the infrastructure gate for it either.
  expect(platform.status).toBe(200)
  expect(clinic.body, 'two tenants must not receive the same derived touch icon').not.toBe(platform.body)
})

/**
 * Issue #107, on the SERVED surface: the element used to be a literal in
 * `BaseLayout`, so every tenant advertised 1Platform's compiled drawing as the
 * icon a device would save to its home screen.
 */
test('the served head gives each tenant its own touch icon and never leaks the platform PNG', async () => {
  const [platform, clinic] = await Promise.all([
    getWithHost(`${BASE}/`, '1platform.pro'),
    getWithHost(`${BASE}/`, 'clinicas.1platform.dev'),
  ])

  expect(platform.status).toBe(200)
  expect(clinic.status).toBe(200)

  const link = (html: string) => /<link rel="apple-touch-icon" href="([^"]+)">/.exec(html)?.[1]

  // The platform's byte contract: the exact literal the frozen baseline holds.
  expect(link(platform.body)).toBe('/logo-oauth-120x120.png')
  expect(link(clinic.body)).toBe('/brand/apple-touch-icon.png')
  expect(
    clinic.body,
    "a tenant's pages must not name the platform's compiled touch icon anywhere",
  ).not.toContain('logo-oauth-120x120.png')
})
