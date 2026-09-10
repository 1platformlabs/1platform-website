import { request as httpRequest } from 'node:http'

/**
 * An HTTP client that can actually set `Host`.
 *
 * `fetch` cannot. `Host` is a forbidden header name, and the failure is SILENT:
 * the header is dropped and the request goes out with the origin's own host.
 * Measured on this server:
 *
 *   fetch(url, { headers: { host: 'clinicas.1platform.dev' } })
 *     -> served the PLATFORM tenant (the server saw 127.0.0.1)
 *   curl -H 'Host: clinicas.1platform.dev'
 *     -> served the clinic tenant
 *
 * That matters more here than in most codebases, because `Host` is how this
 * server decides WHICH TENANT a request belongs to. A multi-tenant test written
 * with `fetch` does not test two tenants — it tests one, twice, and passes.
 * A suite that "interleaves two hosts" would be measuring nothing at all.
 *
 * `node:http` sets the header as given, which is what the real world does.
 */
export interface HostResponse {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

export function getWithHost(
  url: string,
  host: string,
  extraHeaders: Record<string, string> = {},
): Promise<HostResponse> {
  const target = new URL(url)
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        method: 'GET',
        headers: { host, connection: 'close', ...extraHeaders },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c as Buffer))
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        )
      },
    )
    req.on('error', reject)
    req.end()
  })
}
