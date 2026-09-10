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
