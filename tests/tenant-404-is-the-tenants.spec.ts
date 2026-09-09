import { createServer as createHttpServer, type Server } from 'node:http'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'

/**
 * THE 404 PAGE BELONGS TO THE TENANT, and this file is what makes that true.
 *
 * ── The defect this catches ────────────────────────────────────────────────
 * `src/middleware.ts` populated `context.locals.messages` — the tenant's copy —
 * AFTER the published-route check. The check answers an unpublished route by
 * rewriting to `/404`, and it returned from there, so the 404 render ran with
 * `locals.messages` still unset. `useI18n` then took its documented
 * `?? DICTIONARIES[locale]` branch and answered with the REPO catalogues: the
 * platform's own words, under the customer's domain.
 *
 * Measured on the live QA API before the fix, same process, same Host:
 *
 *   clinicas.1platform.dev/          -> "© 2026 Clínica Delta. …"
 *   clinicas.1platform.dev/pricing/  -> "© 2026 1Platform Labs. …"
 *
 * Nine platform-brand strings on that page: <title>, og:title, twitter:title,
 * the description, both logo aria-labels and the footer copyright.
 *
 * It is not an edge: a tenant that publishes one route serves this page at
 * EVERY other address on its domain.
 *
 * ── ⚠️ WHY THIS TEST CANNOT LIVE IN THE BROWSER SUITE ──────────────────────
 * The Playwright server runs `SITE_MANIFEST_SOURCE=repo`, where the middleware
 * sets `locals.messages = dictionaryFor(locale)` — the very object the buggy
 * fallback reached for. Right source and wrong source are IDENTICAL there, so
 * no HTTP assertion in that harness can tell them apart, and none did: the
 * existing "a refusal is the rendered 404 PAGE" test stayed green throughout,
 * satisfied by `og:site_name`, which comes from the manifest and never leaked.
 *
 * So this drives the middleware in `api` mode against a stub API whose copy is
 * DELIBERATELY distinguishable from the repo catalogues, and asserts on what
 * the 404 render was actually handed.
 */

const ROOT = process.cwd()

/** A string no repo catalogue contains, so a fallback cannot fake a pass. */
const TENANT_ONLY = 'COPY-DEL-INQUILINO-NO-DEL-REPO'

const TENANT = {
  slug: 'stub',
  brand_name: 'Stub Brand',
  brand_mark: 'Stub Brand',
  domain: 'stub.example',
  locales: ['es'],
  default_locale: 'es',
  theme: { accent: '#0f766e', accent_contrast: '#ffffff', display_font: 'system-serif' },
  destinations: { docs: null, app: null, support: null, status: null },
  // One published route, which is exactly the shape that makes the 404 the
  // page this tenant serves almost everywhere.
  pages: ['/'],
  google_site_verification: null,
  indexable: false,
}

/** The stub API: a manifest, and a dictionary whose every value is marked. */
function startStubApi(): Promise<{ server: Server; base: string }> {
  const server = createHttpServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://stub')
    res.setHeader('content-type', 'application/json')
    if (url.pathname.endsWith('/sites/by-host')) {
      res.end(JSON.stringify({ success: true, data: TENANT }))
      return
    }
    if (url.pathname.includes('/pages')) {
      res.end(
        JSON.stringify({
          success: true,
          data: {
            slug: TENANT.slug,
            locale: 'es',
            // The real endpoint returns both: `pages` (per route) and
            // `messages`, the flattened dictionary the site actually reads.
            pages: [{ route: '@common', locale: 'es', blocks: { 'probe.marker': TENANT_ONLY } }],
            messages: { 'probe.marker': TENANT_ONLY },
          },
        }),
      )
      return
    }
    res.statusCode = 404
    res.end(JSON.stringify({ success: false }))
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve({ server, base: `http://127.0.0.1:${port}` })
    })
  })
}

type Middleware = {
  onRequest: (
    ctx: { url: URL; request: Request; locals: Record<string, unknown> },
    next: (route?: string) => Promise<Response>,
  ) => Promise<Response>
}

let vite: ViteDevServer | null = null
let api: { server: Server; base: string } | null = null

test.beforeAll(async () => {
  api = await startStubApi()
  // `api` mode is the default, and it is what production runs. Set explicitly
  // so this file does not inherit whatever the shell happened to export.
  delete process.env.SITE_MANIFEST_SOURCE
  process.env.SITE_API_BASE_URL = api.base

  vite = await createServer({
    configFile: false,
    root: ROOT,
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    resolve: {
      alias: {
        '@i18n/': join(ROOT, 'src/i18n/'),
        '@lib/': join(ROOT, 'src/lib/'),
        '@components/': join(ROOT, 'src/components/'),
        '@layouts/': join(ROOT, 'src/layouts/'),
      },
    },
  })
})

test.afterAll(async () => {
  await vite?.close()
  api?.server.close()
  vite = null
  api = null
})

/**
 * Drive the middleware for one address and report what the render was handed.
 *
 * `next` is the render, so whatever `locals` holds when it is called is exactly
 * what every component on the page will see. Capturing it there — rather than
 * after `onRequest` returns — is the whole point: the buggy version DID set
 * `messages` on some paths, just never before this one.
 */
async function localsAtRender(pathname: string): Promise<{
  status: number
  rewrittenTo: string | undefined
  messages: Record<string, string> | undefined
}> {
  const mod = (await vite!.ssrLoadModule('/src/middleware.ts')) as unknown as Middleware
  const url = new URL(`https://${TENANT.domain}${pathname}`)
  const locals: Record<string, unknown> = {}
  let rewrittenTo: string | undefined
  let seen: Record<string, string> | undefined

  const res = await mod.onRequest(
    {
      url,
      request: new Request(url, { headers: { host: TENANT.domain } }),
      locals,
    },
    async (route?: string) => {
      rewrittenTo = route
      seen = locals.messages as Record<string, string> | undefined
      return new Response('<html>rendered</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    },
  )

  return { status: res.status, rewrittenTo, messages: seen }
}

test('an unpublished route renders the 404 with the TENANT’s copy, not the repo’s', async () => {
  const refused = await localsAtRender('/pricing/')

  // Preconditions, so a green cannot come from the request never getting here.
  expect(refused.status, 'an unpublished route must be a 404').toBe(404)
  expect(refused.rewrittenTo, 'the refusal must rewrite to the site’s own 404 page').toBe('/404')

  // The assertion. `undefined` is the bug: it is what sends `useI18n` to the
  // repo catalogues, i.e. to the platform's words under this tenant's domain.
  expect(
    refused.messages,
    'the 404 render was handed NO dictionary — useI18n will fall back to the repo catalogues, ' +
      'which are the platform’s own words being served under a customer’s domain',
  ).toBeDefined()
  expect(
    refused.messages?.['probe.marker'],
    'the 404 render was handed a dictionary, but not this tenant’s',
  ).toBe(TENANT_ONLY)
})

test('CONTROL: a published route was already getting it right', async () => {
  // The other half. Without this, a fix that simply stopped rewriting — or a
  // middleware that 503s everything — would satisfy the test above by making
  // the interesting path unreachable.
  const served = await localsAtRender('/')

  expect(served.status, 'the one published route must be served').toBe(200)
  expect(served.rewrittenTo, 'a published route is not a rewrite').toBeUndefined()
  expect(served.messages?.['probe.marker'], 'the published route always had the tenant’s copy').toBe(
    TENANT_ONLY,
  )
})
