import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { request } from 'node:http'
import { expect, test } from '@playwright/test'

import { servedVersion } from '../src/lib/served-health'

/**
 * `GET /api/health` — the served-version contract (epic
 * `telemetria-silencio-por-despliegue`, TSD-01).
 *
 * The platform reads this path with the Host of every claimed domain, through
 * the front door, WITHOUT following redirects, and opens a deploy window when
 * `version` changes. So the three things that matter are: it answers 200 JSON
 * for ANY Host (tenant or not), `version` is exactly what the deploy stamped
 * (or `null`), and nothing caches it.
 *
 * The request tests drive the BUILT server (`dist/server/entry.mjs`, the
 * process production runs behind nginx) — not the handler — with a different
 * `GIT_SHA` per process, because the value is read from the environment and
 * that read is the thing under test. They go through `node:http` rather than
 * `fetch`: `fetch` refuses to set `Host`, and the Host is the whole point.
 *
 * The suffix-less path (`/api/health`) is answered by nginx's exact location,
 * which rewrites to `/api/health/`; the adapter itself answers `301` there
 * (measured, and asserted below so nobody deletes the nginx block thinking the
 * application covers it).
 */

const ENTRY = 'dist/server/entry.mjs'
const UNKNOWN_HOST = 'tsd-canary.invalid'

type Reply = { status: number; headers: Record<string, string | string[] | undefined>; body: string }

function get(port: number, path: string, host: string): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method: 'GET', headers: { host } }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }))
    })
    req.on('error', reject)
    req.end()
  })
}

async function waitUntilUp(port: number): Promise<void> {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      await get(port, '/api/health/', UNKNOWN_HOST)
      return
    } catch {
      await new Promise((r) => setTimeout(r, 150))
    }
  }
  throw new Error(`server on ${port} did not come up`)
}

async function serve(port: number, gitSha: string | undefined): Promise<ChildProcess> {
  const env: NodeJS.ProcessEnv = { ...process.env, HOST: '127.0.0.1', PORT: String(port), SITE_MANIFEST_SOURCE: 'repo' }
  if (gitSha === undefined) delete env.GIT_SHA
  else env.GIT_SHA = gitSha
  const child = spawn(process.execPath, [ENTRY], { env, stdio: 'ignore' })
  await waitUntilUp(port)
  return child
}

test.describe('against the built server', () => {
  test.describe.configure({ mode: 'serial' })
  // The webServer of the config has already built `dist/` before any test runs.
  test.skip(!existsSync(ENTRY), 'needs `npm run build` (the suite webServer does it)')

  const cases: { name: string; sha: string | undefined; expected: string | null; port: number }[] = [
    { name: 'a deploy tag is served verbatim', sha: 'abc123', expected: 'abc123', port: 4471 },
    { name: 'an EMPTY value (what compose ships when unset) is null', sha: '', expected: null, port: 4472 },
    { name: 'a malformed value is null, never echoed', sha: 'a b', expected: null, port: 4473 },
    { name: 'an absent variable is null', sha: undefined, expected: null, port: 4474 },
  ]

  for (const c of cases) {
    test(c.name, async () => {
      const child = await serve(c.port, c.sha)
      try {
        const reply = await get(c.port, '/api/health/', UNKNOWN_HOST)
        expect(reply.status).toBe(200)
        expect(reply.headers['location']).toBeUndefined()
        expect(String(reply.headers['cache-control'])).toBe('no-store')
        expect(String(reply.headers['content-type'])).toContain('application/json')
        // Literal JSON `null`, not the string "null".
        expect(JSON.parse(reply.body)).toEqual({ status: 'ok', service: 'site', version: c.expected })
      } finally {
        child.kill()
      }
    })
  }

  test('it answers for a host that resolves to NO tenant — the middleware lets it through first', async () => {
    const child = await serve(4475, 'v9.9.9')
    try {
      // Control: the same unknown host on a real page is the tenant 404.
      const page = await get(4475, '/', UNKNOWN_HOST)
      expect(page.status).toBe(404)
      const health = await get(4475, '/api/health/', UNKNOWN_HOST)
      expect(health.status).toBe(200)
      expect(JSON.parse(health.body).version).toBe('v9.9.9')
    } finally {
      child.kill()
    }
  })

  test('the adapter alone redirects the suffix-less path — that is why nginx has its own location', async () => {
    const child = await serve(4476, 'abc123')
    try {
      const reply = await get(4476, '/api/health', UNKNOWN_HOST)
      expect(reply.status).toBe(301)
      expect(reply.headers['location']).toBe('/api/health/')
    } finally {
      child.kill()
    }
  })
})

test('the release shape is the one every frontend of the platform validates', () => {
  expect(servedVersion('0123abcd')).toBe('0123abcd')
  expect(servedVersion('v0.1.258')).toBe('v0.1.258')
  expect(servedVersion('  abc  ')).toBe('abc')
  expect(servedVersion('-leading-dash')).toBeNull()
  expect(servedVersion('a'.repeat(65))).toBeNull()
  expect(servedVersion('<script>')).toBeNull()
  expect(servedVersion(undefined)).toBeNull()
})

/** The exact location, read as text with comments stripped (same convention as `serving-contract.spec.ts`). */
function healthLocation(): string {
  const text = readFileSync('deploy/docker/nginx.conf', 'utf8')
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n')
  const m = /location\s*=\s*\/api\/health\s*\{([^}]*)\}/.exec(text)
  expect(m, 'nginx.conf must declare `location = /api/health`').not.toBeNull()
  return m![1]
}

test('nginx answers /api/health without the trailing-slash redirect', () => {
  const body = healthLocation()
  expect(body).toMatch(/rewrite\s+\^\s+\/api\/health\/\s+break\s*;/)
  expect(body).toContain('include /etc/nginx/proxy-to-node.conf;')
  // The include already carries the proxy_pass; a second one stops nginx from starting.
  expect(body).not.toMatch(/proxy_pass/)
  // The route's `no-store` must reach the client untouched.
  expect(body).not.toMatch(/Cache-Control/i)
})

test('the deploy stamps GIT_SHA from the commit it resets to, and compose hands it to the process', () => {
  const prod = readFileSync('.github/workflows/prod.yml', 'utf8')
  expect(prod).toMatch(/echo "GIT_SHA=\$\{VERSION\}"/)
  expect(prod).toMatch(/envs:\s*[^\n]*\bVERSION\b/)
  const compose = readFileSync('docker-compose.prod.yml', 'utf8')
  expect(compose).toMatch(/GIT_SHA:\s*"\$\{GIT_SHA:-\}"/)
})
