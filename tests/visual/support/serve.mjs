import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createServer, request } from 'node:http'

const host = '127.0.0.1'
const clinicHost = 'clinicas.1platform.dev'
const platformPort = numberFromEnv('PLAYWRIGHT_PLATFORM_PORT', 4321)
const clinicPort = numberFromEnv('PLAYWRIGHT_CLINIC_PORT', 4322)
const apiPort = numberFromEnv('PLAYWRIGHT_STUB_API_PORT', 4397)
const readyPort = numberFromEnv('PLAYWRIGHT_VISUAL_READY_PORT', 4398)

const fixture = JSON.parse(
  readFileSync(new URL('../../fixtures/service-lead-site.json', import.meta.url), 'utf8'),
)
assertFixture(fixture)

const api = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${host}`)
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')

  if (url.pathname === '/api/v1/sites/by-host') {
    if (url.searchParams.get('host') !== clinicHost) return json(res, 404, absent())
    return json(res, 200, {
      success: true,
      data: fixture.tenant,
      msg: 'Site resolved',
    })
  }

  if (url.pathname === `/api/v1/sites/${fixture.tenant.slug}/pages`) {
    if (url.searchParams.get('locale') !== fixture.tenant.default_locale) {
      return json(res, 404, absent())
    }
    return json(res, 200, fixture.pagesResponse)
  }

  return json(res, 404, absent())
})

await listen(api, apiPort)

let readiness = null
const children = [
  startWebsite(platformPort, {
    SITE_MANIFEST_SOURCE: 'repo',
  }),
  startWebsite(clinicPort, {
    SITE_MANIFEST_SOURCE: 'api',
    SITE_API_BASE_URL: `http://${host}:${apiPort}`,
  }),
]

let shuttingDown = false
for (const child of children) {
  child.once('exit', (code, signal) => {
    if (shuttingDown) return
    console.error(`[visual] website exited before shutdown code=${code} signal=${signal}`)
    void shutdown(1)
  })
}

await Promise.all([
  waitForHttp(platformPort, 'localhost'),
  waitForHttp(clinicPort, clinicHost),
])

readiness = createServer((req, res) => {
  if (req.url === '/ready') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('ready\n')
    return
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
  res.end('not found\n')
})
await listen(readiness, readyPort)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => void shutdown(0))
}

async function shutdown(code) {
  if (shuttingDown) return
  shuttingDown = true
  readiness?.close()
  api.close()
  for (const child of children) child.kill('SIGTERM')
  await Promise.all(children.map(waitForExit))
  process.exit(code)
}

function startWebsite(port, extraEnv) {
  return spawn(process.execPath, ['dist/server/entry.mjs'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      HOST: host,
      PORT: String(port),
      ...extraEnv,
    },
  })
}

function waitForHttp(port, requestHost) {
  const deadline = Date.now() + 90_000
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = request(
        {
          hostname: host,
          port,
          path: '/',
          method: 'GET',
          headers: { host: requestHost, connection: 'close' },
        },
        (res) => {
          res.resume()
          if ((res.statusCode ?? 500) < 500) return resolve()
          retry(`HTTP ${res.statusCode}`)
        },
      )
      req.once('error', (error) => retry(error.message))
      req.end()
    }
    const retry = (why) => {
      if (Date.now() >= deadline) {
        reject(new Error(`visual server ${requestHost}:${port} was not ready: ${why}`))
        return
      }
      setTimeout(probe, 100)
    }
    probe()
  })
}

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve()
  return new Promise((resolve) => child.once('exit', resolve))
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, resolve)
  })
}

function json(res, status, body) {
  res.statusCode = status
  res.end(JSON.stringify(body))
}

function absent() {
  return { success: false, data: null, msg: 'Site not found' }
}

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`${name} must be a valid TCP port`)
  }
  return value
}

function assertFixture(value) {
  if (!value || typeof value !== 'object') throw new Error('visual fixture must be an object')
  if (!value.tenant || typeof value.tenant !== 'object') {
    throw new Error('visual fixture needs tenant')
  }
  if (value.tenant.domain !== clinicHost || value.tenant.home_template !== 'service-lead') {
    throw new Error('visual fixture must exercise the clinic service-lead contract')
  }
  if (!value.pagesResponse || typeof value.pagesResponse !== 'object') {
    throw new Error('visual fixture needs pagesResponse')
  }
}
