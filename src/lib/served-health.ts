/**
 * `GET /api/health` — which build this container is serving, for any Host.
 *
 * The contract is the one `bower-dashboard` already serves in production and
 * the platform reads to detect its own deploys (epic
 * `telemetria-silencio-por-despliegue`, TSD-01 / D-1):
 *
 *   {"status":"ok","service":"site","version":"<deploy tag>"|null}
 *
 * - `service` is a NEUTRAL id on purpose. This process answers on tenant
 *   domains (white-label), so the platform's own name must not appear there.
 * - `version` is stamped by the DEPLOY (`GIT_SHA`, written into `.env.prod` by
 *   `prod.yml` from the commit it resets the host to) — never `package.json`,
 *   which is frozen and lies. Read per request, like `apiBaseUrl()`, so a test
 *   can change it without reloading the module.
 * - Anything that does not look like a release tag degrades to `null`: the
 *   reader on the other end treats `null` as "unknown", while an arbitrary
 *   string from the environment would be echoed onto a public host.
 *
 * Tenant-independent by design: the middleware lets this path through BEFORE
 * resolving the tenant, so a host that resolves to no tenant still says which
 * build answered — that is exactly what the reader needs to tell a deploy from
 * a fallback.
 */

export const HEALTH_PATHS: ReadonlySet<string> = new Set(['/api/health', '/api/health/'])

/** The shape every frontend of the platform validates its tag against. */
const RELEASE_SHAPE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

/** The deploy tag, or `null` when absent or not shaped like one. */
export function servedVersion(raw: string | undefined | null): string | null {
  const value = (raw ?? '').trim()
  return RELEASE_SHAPE.test(value) ? value : null
}

/** Reads `GIT_SHA` from the process at call time. */
export function deployedRelease(): string | null {
  const raw = typeof process === 'undefined' ? undefined : process.env?.GIT_SHA
  return servedVersion(raw)
}

export function healthResponse(): Response {
  const body = JSON.stringify({ status: 'ok', service: 'site', version: deployedRelease() })
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}
