import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

/**
 * The serving contract, read out of the container's own configuration.
 *
 * WHY THIS IS A TEXT TEST AND NOT A REQUEST TEST
 * ----------------------------------------------
 * The real proof is a probe against a running container, and that probe was
 * run — the whole `nginx.conf` was written against measurements from one:
 *
 *   /                            nosniff=1  cache-control: public, max-age=0, must-revalidate
 *   /_astro/BaseLayout.*.css     nosniff=1  cache-control: public, max-age=31536000, immutable
 *   /favicon.svg                 nosniff=1  cache-control: public, max-age=86400
 *   /sitemap-0.xml               nosniff=1  cache-control: public, max-age=0, must-revalidate
 *   GET /pricing            ->   301  Location: /pricing/
 *   Host: inventado.example ->   404 (never another tenant's page)
 *   Host: www.…             ->   301 https://<apex>/…
 *
 * But that probe needs Docker, a full image build and two processes, which is
 * not what a browser suite is for and not something a reviewer will re-run.
 * These assertions are the cheap, always-on half: they catch the edits that
 * silently break the contract, and every one of them corresponds to a mistake
 * that was actually made while writing that file.
 *
 * ⚠️ IT DOES NOT PROVE THE HEADERS ARE SERVED. It proves the configuration says
 * they should be. `/verify-epic-e2e` is where the container itself is probed.
 */

const NGINX = 'deploy/docker/nginx.conf'
const PROXY = 'deploy/docker/proxy-to-node.conf'

function conf(path: string): string {
  return readFileSync(path, 'utf8')
}

/** Every `location` block, with its body. Comments stripped so a commented-out
 *  directive can never satisfy an assertion about a real one. */
function locations(): { header: string; body: string }[] {
  const text = conf(NGINX)
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n')
  const out: { header: string; body: string }[] = []
  const re = /location\s+([^{]+)\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    let depth = 1
    let i = re.lastIndex
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') depth--
      i++
    }
    out.push({ header: m[1].trim(), body: text.slice(re.lastIndex, i - 1) })
  }
  return out
}

test('the proxy forwards the visitor Host — the line the whole epic rests on', () => {
  // Without this, nginx sends `Host: $proxy_host` (the upstream address) because
  // that is nginx's DEFAULT, not an oversight. On this server the Host chooses
  // the TENANT, so every domain would arrive as `127.0.0.1:4321`, resolve to no
  // tenant, and the entire site — every client at once — would answer 404.
  expect(conf(PROXY)).toMatch(/proxy_set_header\s+Host\s+\$host\s*;/)
})

test('every location block actually proxies — none falls through to a root that does not exist', () => {
  const blocks = locations()
  // Floor: a parser that found nothing would pass every assertion below.
  expect(blocks.length, 'the config should declare several location blocks').toBeGreaterThanOrEqual(4)

  for (const { header, body } of blocks) {
    expect(
      body,
      `location ${header} does not include the proxy — nginx would look for a file, ` +
        `and this image has no document root, so it would answer 404 with the site healthy`,
    ).toContain('include /etc/nginx/proxy-to-node.conf;')
  }
})

test('every location repeats nosniff, because add_header does NOT accumulate', () => {
  // The trap the original file documents: an `add_header` in a child block
  // DISCARDS every one inherited from the parent. A gate that only probes `/`
  // would call that fine while `/_astro/`, the fonts and the sitemap went out
  // without the header.
  for (const { header, body } of locations()) {
    expect(
      body,
      `location ${header} does not repeat X-Content-Type-Options; the server-level ` +
        `add_header is DISCARDED inside a block that declares any add_header of its own`,
    ).toMatch(/add_header\s+X-Content-Type-Options\s+"nosniff"\s+always\s*;/)
  }
})

test('every location that sets Cache-Control hides the upstream one first', () => {
  // The trap that is NEW with the proxy, and it was measured: `add_header` SUMS
  // with what the upstream already sent. Astro sets its own Cache-Control on
  // static assets, so without `proxy_hide_header` the client receives TWO
  // Cache-Control headers with different values and each intermediate cache
  // picks for itself. Measured on the real container before this was fixed:
  // `/robots.txt` came back with two `X-Content-Type-Options`, same shape.
  for (const { header, body } of locations()) {
    if (!/add_header\s+Cache-Control/.test(body)) continue
    expect(
      body,
      `location ${header} adds Cache-Control without hiding the upstream's — the ` +
        `response would carry two of them`,
    ).toMatch(/proxy_hide_header\s+Cache-Control\s*;/)
  }
})

test('the page family lets the application override the cache policy on purpose', () => {
  // The static families REPLACE whatever the upstream said: there the contract
  // decides and Astro has no opinion worth keeping. Pages are not that case.
  //
  // D-22's 503 carries `no-store` DELIBERATELY — "the API is down, come back in
  // 30s" must not be cached for a moment — and a flat `proxy_hide_header` plus
  // a fixed value would have rewritten it to `max-age=0, must-revalidate`,
  // which permits storing it. The map keeps the application's value when it set
  // one and supplies the contract's when it did not, and either way exactly one
  // header goes out.
  //
  // Verified against the running container, in `api` mode with an unreachable
  // API: `HTTP/1.1 503`, `Cache-Control: no-store`, `retry-after: 30`, and the
  // Cache-Control header count was 1.
  const text = conf(NGINX)
  expect(text, 'the map must exist and be in the http context, outside the server block').toMatch(
    /map\s+\$upstream_http_cache_control\s+\$page_cache_control\s*\{/,
  )
  const root = locations().find((l) => l.header === '/')
  expect(root, 'there should be a location / block').toBeTruthy()
  expect(
    root!.body,
    'location / must use the map, not a literal — a literal overwrites the 503 no-store',
  ).toMatch(/add_header\s+Cache-Control\s+\$page_cache_control\s+always\s*;/)
})

test('the sitemaps, robots.txt and the feeds still reach the application', () => {
  // nginx evaluates REGEX locations before the `/` prefix, and since F4 these
  // are rendered ROUTES rather than files. A regex block without its own proxy
  // include would take them and answer 404 with everything else healthy.
  const xmlish = locations().find((l) => l.header.includes('html|xml|txt|json'))
  expect(xmlish, 'the .html/.xml/.txt/.json block should exist').toBeTruthy()
  expect(xmlish!.body).toContain('include /etc/nginx/proxy-to-node.conf;')
})

test('gzip covers the type the sitemaps and feeds actually send', () => {
  // Measured against the running server: Astro emits `application/xml` for the
  // sitemap and the feeds. nginx used to type them from the file extension, so
  // `text/xml` was enough; with the proxy the type comes from the upstream and
  // these two lines are what keeps six documents compressed.
  const text = conf(NGINX)
  const gzipBlock = text.slice(text.indexOf('gzip_types'), text.indexOf(';', text.indexOf('gzip_types')))
  expect(gzipBlock).toContain('application/xml')
  expect(gzipBlock).toContain('application/rss+xml')
})

test('no filesystem rule survived the move to a proxy', () => {
  const text = conf(NGINX)
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n')

  // `if (-d $request_filename)` was the DirectorySlash rule. Under SSR there is
  // no directory per page, so it is silently always-false — no error, and
  // `/pricing` stops redirecting. It is not rewritten, it is REPLACED by the
  // adapter's own 301 (measured: GET /pricing -> 301 Location: /pricing/).
  expect(text, 'a filesystem test cannot work without a document root').not.toMatch(/-d\s+\$request_filename/)
  expect(text, 'try_files needs a root this image does not have').not.toMatch(/try_files/)
  expect(text, 'no document root is served any more').not.toMatch(/^\s*root\s+/m)
})

test('one server block, accepting any Host — an alta must not edit this file', () => {
  const text = conf(NGINX)
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n')

  const servers = text.match(/^\s*server\s*\{/gm) ?? []
  expect(servers.length, 'exactly one server block: N brands, one container (D-2)').toBe(1)

  // The named block and the 444 catch-all are gone on purpose. If a tenant's
  // hostname ever appears here, adding a client became "edit config and
  // redeploy" — the thing this epic exists to remove.
  expect(text, 'a tenant hostname in the config means an alta touches the container').not.toMatch(
    /server_name\s+[^_;]+;/,
  )
  expect(text, 'the 444 catch-all cannot discriminate any more (D-24)').not.toMatch(/return\s+444/)
})

test('the www to apex redirect is generic, so it serves every tenant', () => {
  // It changes the HOST, which is why it does not trip the hard rule about
  // never forcing https on the SAME host behind Cloudflare's flexible mode.
  expect(conf(NGINX)).toMatch(/if\s*\(\$host\s*~\*\s*\^www\\\.\(\.\+\)\$\)/)
  expect(conf(NGINX)).toMatch(/return\s+301\s+https:\/\/\$1\$request_uri/)
  // And it must not name a tenant.
  expect(conf(NGINX)).not.toMatch(/return\s+301\s+https:\/\/1platform\.pro/)
})

test('the container carries a runtime for the application it now proxies to', () => {
  const dockerfile = readFileSync('Dockerfile', 'utf8')
  // The base stays the nginx image whose binary is MEASURED to start on the
  // dedicated host's 3.10 kernel; Node is added to it. Starting from
  // node:24-alpine instead would bring an nginx from the 1.28/1.29 family,
  // which is the family that does not start there.
  expect(dockerfile).toMatch(/FROM nginx:1\.27-alpine AS runtime/)
  expect(dockerfile, 'the runtime stage must install Node').toMatch(/apk add --no-cache nodejs/)
  expect(dockerfile, 'the server bundle must be copied').toMatch(/COPY --from=build \/app\/dist/)
  expect(dockerfile, 'node_modules is needed at runtime, not only at build').toMatch(
    /COPY --from=build \/app\/node_modules/,
  )
  // sharp is a devDependency and `/_image` needs it at REQUEST time; without
  // this line the site starts perfectly and every image answers 500.
  expect(dockerfile, 'sharp must survive --omit=dev').toMatch(/sharp/)
  expect(dockerfile, 'derived social cards need a deterministic runtime font').toMatch(/font-dejavu/)
})

test('the container has a channel for its configuration', () => {
  // Measured before this existed: the compose file declared no `environment:`
  // and no `env_file:`, and the deploy wrote an EMPTY `.env.prod`. The site
  // read `process.env` and got nothing — with no error anywhere, because
  // `docker compose --env-file` feeds the compose file's own interpolation, not
  // the container's environment.
  const compose = readFileSync('docker-compose.prod.yml', 'utf8')
  expect(compose).toMatch(/env_file:/)
  expect(compose).toMatch(/SITE_API_BASE_URL/)

  // All three links of the chain, or the value arrives empty with no error.
  const prod = readFileSync('.github/workflows/prod.yml', 'utf8')
  expect(prod, 'the step must put it in its own env').toMatch(/SITE_API_BASE_URL:\s*\$\{\{\s*vars\./)
  expect(prod, "the ssh-action's envs allow-list is what actually exports it").toMatch(
    /envs:.*SITE_API_BASE_URL/,
  )
  expect(prod, 'and something has to write it into .env.prod').toMatch(/SITE_API_BASE_URL=\$\{SITE_API_BASE_URL\}/)
})

test('the deploy validates the artifact the build actually produces', () => {
  const prod = readFileSync('.github/workflows/prod.yml', 'utf8')
  // This gate is what would have failed on the first push to main after the
  // merge: `astro build` with a server output emits no `.html` at all, so
  // `[ ! -f "dist/index.html" ]` failed, `build` went red, and `deploy_hetzner`
  // — which requires `needs.build.result == 'success'` — was skipped. Nothing
  // in the PR could have shown it: prod.yml does not run on pull_request.
  expect(prod).toMatch(/dist\/server\/entry\.mjs/)
  expect(prod).toMatch(/dist\/client\/_astro/)
  // And the gate in the other direction: a reappearing dist/index.html means
  // someone went back to static or prerendered a route, and a prerendered route
  // is served to every tenant with no middleware able to gate it.
  expect(prod).toMatch(/if \[ -f "dist\/index\.html" \]/)
})
