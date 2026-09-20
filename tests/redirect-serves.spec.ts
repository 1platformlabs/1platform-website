import { createServer as createHttpServer, type Server } from 'node:http'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'

/**
 * THE WIRING: that `src/middleware.ts` actually consults the rule, answers a
 * real 301, and does so BEFORE it spends anything on a body it will not send.
 *
 * `site-redirect.spec.ts` asks the rule its questions directly. That is
 * necessary and not sufficient: a correct rule nobody calls is indistinguishable
 * from no rule at all, and this ecosystem has shipped that exact shape more than
 * once — a guard declared, tested, and never reached.
 *
 * Driven in `api` mode against a stub, cloning `tenant-404-is-the-tenants.spec.ts`,
 * for a reason worth stating: the browser suite runs `SITE_MANIFEST_SOURCE=repo`,
 * and the repo catalogue has no `redirect_to` on any tenant. Adding one there to
 * make this testable would mean every other spec that walks the padrón started
 * receiving 301s with no body — the scanners would go quiet and stay green.
 */

const ROOT = process.cwd()

/** The site as it exists the day after its own domain was promoted. */
const TENANT = {
  slug: 'medipago',
  brand_name: 'Medipago',
  brand_mark: 'M',
  brand_wordmark: 'Medipago',
  // The PROMOTED domain: what the platform address now points at.
  domain: 'medipago.gt',
  locales: ['es'],
  default_locale: 'es',
  home_template: 'service-lead',
  theme: { accent: '#0f766e', accent_contrast: '#ffffff', display_font: 'system-sans' },
  destinations: { docs: null, app: null, support: null, status: null },
  brand_assets: null,
  pages: ['/'],
  google_site_verification: null,
  indexable: true,
  redirect_to: 'medipago.gt',
}

const PLATFORM_HOST = 'medipago.1platform.pro'

/** What the stub was asked for, so "it never fetched the copy" is measurable. */
let pageRequests = 0

function startStubApi(redirecting: boolean): Promise<{ server: Server; base: string }> {
  const server = createHttpServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://stub')
    res.setHeader('content-type', 'application/json')
    if (url.pathname.endsWith('/sites/by-host')) {
      // The negative control is the SAME manifest with the one field removed.
      // Anything else — a different tenant, a different host — would let a pass
      // come from something other than the field under test.
      const { redirect_to, ...withoutRedirect } = TENANT
      res.end(JSON.stringify({ success: true, data: redirecting ? TENANT : withoutRedirect }))
      return
    }
    if (url.pathname.includes('/pages')) {
      pageRequests += 1
      res.end(
        JSON.stringify({
          success: true,
          data: {
            slug: TENANT.slug,
            locale: 'es',
            pages: [{ route: '@common', locale: 'es', blocks: {} }],
            messages: {},
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

async function startHarness(redirecting: boolean) {
  pageRequests = 0
  api = await startStubApi(redirecting)
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
}

async function stopHarness() {
  await vite?.close()
  api?.server.close()
  vite = null
  api = null
}

/** Drive the real middleware for one address on one host. */
async function requestAs(
  host: string,
  pathAndQuery: string,
): Promise<{ status: number; headers: Headers; rendered: boolean }> {
  const mod = (await vite!.ssrLoadModule('/src/middleware.ts')) as unknown as Middleware
  const url = new URL(`https://${host}${pathAndQuery}`)
  let rendered = false
  const res = await mod.onRequest(
    { url, request: new Request(url, { headers: { host } }), locals: {} },
    async () => {
      rendered = true
      return new Response('<html>rendered</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    },
  )
  return { status: res.status, headers: res.headers, rendered }
}

test.describe('with redirect_to on the manifest', () => {
  test.beforeAll(() => startHarness(true))
  test.afterAll(stopHarness)

  test('the platform address answers a real 301 to the promoted domain', async () => {
    const res = await requestAs(PLATFORM_HOST, '/')
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('https://medipago.gt/')
    expect(res.rendered).toBe(false)
  })

  test('the path and the query survive the move', async () => {
    // A redirect that drops them sends every deep link and every campaign to
    // the home page, which looks like it works and silently loses the traffic
    // the link was for.
    const res = await requestAs(PLATFORM_HOST, '/contacto/?utm_source=x&q=a%20b')
    expect(res.headers.get('location')).toBe('https://medipago.gt/contacto/?utm_source=x&q=a%20b')
  })

  test('the 301 is cacheable but bounded', async () => {
    const res = await requestAs(PLATFORM_HOST, '/')
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
  })

  test('it redirects BEFORE fetching the copy', async () => {
    // The ordering claim from the middleware, measured instead of asserted in a
    // comment: a response with no body must not have paid for one. It also
    // matters for availability — the copy fetch can answer 503 on its own, and a
    // site that has moved should still redirect while its old copy is briefly
    // unreachable.
    pageRequests = 0
    await requestAs(PLATFORM_HOST, '/')
    expect(pageRequests).toBe(0)
  })

  test('the promoted domain itself is served, not bounced', async () => {
    // The loop guard, end to end. The manifest names `medipago.gt` and the
    // request arrives on `medipago.gt`, so this is the exact input that a
    // missing self-comparison would turn into an infinite redirect.
    const res = await requestAs('medipago.gt', '/')
    expect(res.status).toBe(200)
    expect(res.rendered).toBe(true)
  })
})

test.describe('the negative control: the same manifest without the field', () => {
  test.beforeAll(() => startHarness(false))
  test.afterAll(stopHarness)

  test('the platform address is served normally', async () => {
    // Without this, every assertion above could be satisfied by a middleware
    // that redirects unconditionally.
    const res = await requestAs(PLATFORM_HOST, '/')
    expect(res.status).toBe(200)
    expect(res.rendered).toBe(true)
    expect(res.headers.get('location')).toBeNull()
  })
})
