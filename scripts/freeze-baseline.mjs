#!/usr/bin/env node
/**
 * Freezes what `1platform.pro` SERVES, so a change to it has to be declared.
 *
 * WHY THIS WAS REWRITTEN (issue #112)
 * -----------------------------------
 * The first version walked `dist/` and hashed every emitted file. That worked
 * while the site was a static build: `dist/` WAS the answer, one HTML file per
 * route, and the route set fell out of the directory tree.
 *
 * With `output: 'server'` there is no answer in `dist/` any more — measured on
 * this tree, `npm run build` emits `dist/client/` and `dist/server/` and NOT ONE
 * `.html`. Re-freezing the old way would therefore have written a baseline of
 * **zero routes**, and a comparator with zero routes reports "0 differing" and
 * exits 0. The gate would have gone green by having nothing left to measure,
 * which is worse than the red it was in: a red gate is ignored, a vacuous green
 * one is believed.
 *
 * So the subject moved and the instrument moved with it. The baseline is now
 * the RESPONSE the server gives for each route — status, and the body when
 * there is one — captured over HTTP with an explicit `Host`, from the same
 * standalone adapter production runs.
 *
 * WHAT IT CAPTURES
 * ----------------
 *   · status, for every route. A route that answers 301 today is frozen AS a
 *     301 with its destination: the redirects in `astro.config.mjs` are
 *     deliberate, and a gate that cannot express "this URL is retired on
 *     purpose" can only report them as 47 failures forever.
 *   · the body, byte for byte, for every route that has one — written under
 *     `tests/baseline/html/` and COMMITTED. That directory is the other half of
 *     the gate: the comparator needs both sides to apply a normaliser to both
 *     sides, and `--explain` needs them to point at the first divergence.
 *
 * Committing the bodies also retires a time bomb. The comparison used to get
 * its "before" by checking out the commit the baseline was frozen from and
 * running `npm ci && npm run build` on it, in CI, on every pull request — a
 * gate that depends on an old lockfile still installing is a gate with an
 * expiry date nobody wrote down.
 *
 * THE ROUTE SET
 * -------------
 * The union of two sources, because each covers the other's blind spot:
 *   · every route already in the baseline — so a page cannot leave the gate by
 *     being deleted, which is the regression the gate most needs to catch;
 *   · every `<loc>` in the served sitemap — so a page added later enters the
 *     gate without anyone remembering to add it.
 *
 * The served HTML is deterministic: two requests for the same route on the same
 * build are byte-identical (measured on `/`, `/es/`, `/blog/`, `/pricing/` and
 * `/changelog/`), so a hash is a fair instrument.
 *
 * USAGE
 *   npm run build
 *   HOST=127.0.0.1 PORT=4331 SITE_MANIFEST_SOURCE=repo node dist/server/entry.mjs &
 *   node scripts/freeze-baseline.mjs --base http://127.0.0.1:4331 --host 1platform.pro
 *
 * `SITE_MANIFEST_SOURCE=repo` is the mode the gate runs in — the only one that
 * can serve tenant #1 without a live API, and the same choice
 * `playwright.config.ts` makes for CI.
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

const OUT = join('tests', 'baseline', 'baseline.json')
const HTML_DIR = join('tests', 'baseline', 'html')

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : fallback
}
const BASE = arg('--base', 'http://127.0.0.1:4331')
const HOST = arg('--host', '1platform.pro')

/** `/` -> index.html · `/es/about/` -> es/about/index.html · `/404.html` -> 404.html */
function fileOf(route) {
  if (route === '/') return 'index.html'
  const rel = route.replace(/^\//, '')
  return rel.endsWith('/') ? `${rel}index.html` : rel
}

/**
 * A GET that can actually set `Host`.
 *
 * `fetch` cannot: `Host` is a forbidden header name and it is dropped
 * SILENTLY, so the request goes out under whatever hostname `--base` connects
 * to — `127.0.0.1`, which no tenant owns. The same note in
 * `scripts/compare-served.mjs` has the measurement.
 */
function get(url, host) {
  const target = new URL(url)
  const transport = target.protocol === 'https:' ? httpsRequest : httpRequest
  return new Promise((resolve, reject) => {
    const req = transport(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        method: 'GET',
        headers: { host, connection: 'close' },
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            location: res.headers.location ?? null,
            body: Buffer.concat(chunks),
            // A body that stopped mid-flight is NOT a body. Freezing one would
            // bake the very defect #117 fixed into the thing that is supposed
            // to detect defects.
            truncated: false,
          }),
        )
        const cutShort = () =>
          resolve({
            status: res.statusCode ?? 0,
            location: res.headers.location ?? null,
            body: Buffer.concat(chunks),
            truncated: true,
          })
        res.on('aborted', cutShort)
        res.on('error', cutShort)
      },
    )
    req.on('error', reject)
    req.end()
  })
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

/** Routes the previous baseline already covered. Absent on a first freeze. */
function previousRoutes() {
  if (!existsSync(OUT)) return []
  try {
    const previous = JSON.parse(readFileSync(OUT, 'utf8'))
    return (previous.entries ?? []).filter((e) => e.route).map((e) => e.route)
  } catch {
    return []
  }
}

/** Every `<loc>` the server publishes for this host, as paths. */
async function sitemapRoutes() {
  const res = await get(`${BASE}/sitemap-0.xml`, HOST)
  if (res.status !== 200) {
    console.error(
      `freeze-baseline: ${BASE}/sitemap-0.xml answered ${res.status} for Host: ${HOST} — ` +
        'the route set would be the previous baseline alone, which silently freezes out every ' +
        'page added since. Refusing rather than under-measuring.',
    )
    process.exit(2)
  }
  const xml = res.body.toString('utf8')
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
}

const routes = [...new Set([...previousRoutes(), ...(await sitemapRoutes())])].sort()
if (routes.length === 0) {
  console.error('freeze-baseline: no routes to freeze — refusing to write an empty baseline')
  process.exit(2)
}

// A stale body left behind from a route that no longer exists would keep
// answering for it, so the directory is rebuilt rather than merged into.
rmSync(HTML_DIR, { recursive: true, force: true })
mkdirSync(HTML_DIR, { recursive: true })

const entries = []
const counts = { ok: 0, redirect: 0, other: 0 }

for (const route of routes) {
  const res = await get(BASE + route, HOST)

  if (res.truncated) {
    console.error(
      `freeze-baseline: ${route} answered ${res.status} and then hung up mid-body. That is a ` +
        'defect in the site, not a baseline — fix it before freezing (issue #117).',
    )
    process.exit(2)
  }

  if (res.status >= 300 && res.status < 400) {
    entries.push({ route, status: res.status, location: res.location })
    counts.redirect++
    continue
  }

  const file = fileOf(route)
  mkdirSync(dirname(join(HTML_DIR, file)), { recursive: true })
  writeFileSync(join(HTML_DIR, file), res.body)
  entries.push({ route, status: res.status, file, sha256: sha256(res.body), bytes: res.body.length })
  if (res.status === 200) counts.ok++
  else counts.other++
}

writeFileSync(
  OUT,
  JSON.stringify(
    {
      // `commit` is stamped by whoever runs it, not read here: this script stays
      // pure so its output is diffable.
      generator: 'scripts/freeze-baseline.mjs',
      subject: 'the response of the standalone Node adapter, SITE_MANIFEST_SOURCE=repo',
      host: HOST,
      bodies: HTML_DIR.split(/[\\/]/).join('/'),
      total_routes: entries.length,
      ok_routes: counts.ok,
      redirect_routes: counts.redirect,
      other_routes: counts.other,
      entries,
    },
    null,
    2,
  ) + '\n',
)

console.log(
  `freeze-baseline: wrote ${OUT} and ${HTML_DIR}/ — ${entries.length} routes ` +
    `(${counts.ok} ok, ${counts.redirect} redirect, ${counts.other} other) for Host: ${HOST}`,
)
