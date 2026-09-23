import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createServer as createHttpServer, request as httpRequest, type Server } from 'node:http'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

/**
 * What a visitor is handed when the site cannot be rendered (issue #117).
 *
 * MEASURED ON `origin/main`, against this same stub API:
 *
 *   curl -H 'Host: <a published site with no copy>' http://127.0.0.1:…/
 *     -> HTTP 200, 21 bytes, body "Internal server error", socket destroyed
 *
 * Two independent things have to be wrong for that to happen, so both are
 * fixed and both are measured here:
 *
 *   1. `{"messages": {}}` counted as COPY. A valid shape carrying no words
 *      went to the renderer instead of being read as "this site has none".
 *   2. The status was already on the wire. The Node adapter writes the head
 *      before it reads the first chunk, so a render that throws halfway can
 *      only append an error string to a response it already called a success.
 *
 * Fixing only (1) would leave the lie one missing key away — which is why the
 * short-dictionary case below exists and why it is not a hypothetical: the
 * copy of a site is written key by key by a person.
 *
 * ⚠️ THE CONTROLS ARE LOAD-BEARING. A middleware that answered 503 to
 * everything would satisfy every "must not be 200" assertion in this file, so
 * the same server, the same stub and the same manifest serve a tenant WITH
 * copy and must answer a real page. And the degraded body is asserted to carry
 * no brand at all: the tempting fix — render a pretty error page — can only be
 * drawn with the platform's own chrome, which is the cross-tenant leak this
 * epic exists to close.
 */

const ROOT = process.cwd()
const FIXTURE_PATH = join(ROOT, 'tests/fixtures/service-lead-site.json')

type SiteFixture = {
  tenant: Record<string, unknown> & { slug: string; domain: string; brand_name: string }
  pagesResponse: { success: boolean; data: { slug: string; locale: string; pages: unknown[]; messages: Record<string, string> }; msg: string }
}

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as SiteFixture

const WITH_COPY = 'con-copia.example'
const NO_COPY = 'sin-copia.example'
const SHORT_COPY = 'copia-corta.example'

const BRAND_WITH_COPY = fixture.tenant.brand_name

/** The full dictionary the fixture ships, which renders the home page. */
const FULL = fixture.pagesResponse.data.messages
/** One key of it. Enough to be a valid non-empty answer, nowhere near enough to render. */
const SHORT = Object.fromEntries(Object.entries(FULL).slice(0, 1))

const SITES: Record<string, { slug: string; brand: string; messages: Record<string, string> }> = {
  [WITH_COPY]: { slug: 'con-copia', brand: BRAND_WITH_COPY, messages: FULL },
  [NO_COPY]: { slug: 'sin-copia', brand: 'Sin Copia', messages: {} },
  [SHORT_COPY]: { slug: 'copia-corta', brand: 'Copia Corta', messages: SHORT },
}

function manifestFor(host: string): Record<string, unknown> | null {
  const site = SITES[host]
  if (!site) return null
  return {
    ...fixture.tenant,
    slug: site.slug,
    domain: host,
    brand_name: site.brand,
    brand_mark: site.brand.slice(0, 1),
    brand_wordmark: site.brand,
    // Not indexable: these are probes, and the assertion is about the status
    // line, not about anything a crawler should ever see.
    indexable: false,
  }
}

function siteBySlug(slug: string): { host: string; messages: Record<string, string> } | null {
  for (const [host, site] of Object.entries(SITES)) {
    if (site.slug === slug) return { host, messages: site.messages }
  }
  return null
}

/**
 * A GET that survives the server hanging up mid-response.
 *
 * This is not incidental plumbing — it IS the defect's shape. When the render
 * dies after the head is out, the adapter destroys the socket, so a client
 * that only listens for `end` never resolves and the failure reads as a
 * timeout instead of as "it answered 200 and then gave up". `truncated` makes
 * the real verdict visible in the assertion diff.
 */
function get(url: string, host: string): Promise<{ status: number; body: string; truncated: boolean }> {
  const target = new URL(url)
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        method: 'GET',
        headers: { host, connection: 'close' },
      },
      (res) => {
        const chunks: Buffer[] = []
        const status = res.statusCode ?? 0
        res.on('data', (c) => chunks.push(c as Buffer))
        res.on('end', () => resolve({ status, body: Buffer.concat(chunks).toString('utf8'), truncated: false }))
        const cutShort = () =>
          resolve({ status, body: Buffer.concat(chunks).toString('utf8'), truncated: true })
        res.on('aborted', cutShort)
        res.on('error', cutShort)
      },
    )
    req.on('error', reject)
    req.end()
  })
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
      const manifest = manifestFor(url.searchParams.get('host') ?? '')
      if (manifest) {
        response.end(JSON.stringify({ success: true, data: manifest, msg: 'Site resolved' }))
        return
      }
      response.statusCode = 404
      response.end(JSON.stringify({ success: false, data: null, msg: 'Site not found' }))
      return
    }

    const match = /\/sites\/([^/]+)\/pages$/.exec(url.pathname)
    if (match) {
      const site = siteBySlug(decodeURIComponent(match[1]))
      if (site) {
        const locale = url.searchParams.get('locale') ?? 'es'
        // 200 with whatever dictionary this site has, EMPTY INCLUDED. That is
        // what the real API answers for a published site with no content
        // documents, and reproducing it is the entire point of this stub.
        response.end(
          JSON.stringify({
            success: true,
            data: { slug: decodeURIComponent(match[1]), locale, pages: [], messages: site.messages },
            msg: 'ok',
          }),
        )
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
    if (app.exitCode !== null) throw new Error(`server exited early\n${logs()}`)
    try {
      const response = await get(`${baseUrl}/`, WITH_COPY)
      if (response.status === 200) return
    } catch {
      // The standalone adapter has not bound its socket yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`server did not become ready\n${logs()}`)
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

test('CONTROL: the same server, stub and manifest serve a site that HAS copy', async () => {
  const response = await get(`${appBaseUrl}/`, WITH_COPY)

  expect({ status: response.status, truncated: response.truncated }).toEqual({
    status: 200,
    truncated: false,
  })
  expect(response.body).toContain(BRAND_WITH_COPY)
  expect(
    response.body.length,
    'a "page" of a few hundred bytes is the truncation, not a render',
  ).toBeGreaterThan(5_000)
})

test('a published site with NO copy answers 503, never a 200', async () => {
  const response = await get(`${appBaseUrl}/`, NO_COPY)

  expect(
    { status: response.status, truncated: response.truncated },
    'origin/main answers {status: 200, truncated: true} here, with the body ' +
      '"Internal server error" — a success code wrapping a failure',
  ).toEqual({ status: 503, truncated: false })
  expect(response.body.trim()).toBe('Service Unavailable')
})

test('a site whose copy is SHORT BY A KEY also answers 5xx, not a truncated 200', async () => {
  // The render gets far enough to start streaming and then throws on the first
  // key the dictionary does not carry. Nothing upstream can predict which key
  // a page needs, so this is caught where it surfaces: the response is held
  // until it is complete, and an incomplete one never gets a 2xx.
  const response = await get(`${appBaseUrl}/`, SHORT_COPY)

  expect(response.truncated, 'the visitor was handed a body that stops mid-document').toBe(false)
  expect(
    response.status,
    'a render that died is a server error; saying 2xx makes a crawler index the wreck as healthy',
  ).toBeGreaterThanOrEqual(500)
  expect(response.status).toBeLessThan(600)
})

test('the degraded body carries no brand — not the platform\'s, not another tenant\'s', async () => {
  for (const host of [NO_COPY, SHORT_COPY]) {
    const response = await get(`${appBaseUrl}/`, host)
    const body = response.body

    // The platform. Serving 1Platform's words and chrome under a customer's
    // domain is the exact leak the multi-tenant work exists to close, and an
    // error page is not an exception to it.
    expect(body, `${host}: the platform's name leaked into the error body`).not.toMatch(/1platform/i)
    // Any other tenant on this server.
    expect(body, `${host}: another tenant's brand leaked into the error body`).not.toContain(BRAND_WITH_COPY)
    // And no chrome at all: a document would have to be drawn with somebody's
    // stylesheet, and every stylesheet here belongs to somebody.
    expect(body, `${host}: the error body is a document`).not.toContain('<html')
    expect(body, `${host}: the error body pulls build assets`).not.toContain('/_astro/')
  }
})

test('the degraded response is not cacheable and asks for a retry', async () => {
  // A 503 an edge cache kept would outlive the minute it took someone to paste
  // the site's copy in.
  const target = new URL(`${appBaseUrl}/`)
  const headers = await new Promise<Record<string, string | string[] | undefined>>((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: target.hostname,
        port: target.port,
        path: '/',
        method: 'GET',
        headers: { host: NO_COPY, connection: 'close' },
      },
      (res) => {
        res.resume()
        res.on('end', () => resolve(res.headers))
      },
    )
    req.on('error', reject)
    req.end()
  })

  expect(headers['cache-control']).toBe('no-store')
  expect(headers['retry-after']).toBe('30')
  expect(headers['content-type']).toContain('text/plain')
})
