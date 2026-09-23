#!/usr/bin/env node
/**
 * Compares what the SERVER answers against the frozen baseline.
 *
 * WHY THIS EXISTS
 * ---------------
 * The central acceptance criterion of `website-multitenant` is that
 * `1platform.pro` does not regress, so something has to hold the server's
 * answers against a frozen set — and it has to be able to say NO, or it is
 * decoration.
 *
 * WHAT "THE BASELINE" IS NOW (issue #112)
 * ---------------------------------------
 * It was the bytes of a STATIC build: one file per route, every route a 200.
 * The conversion to a server broke both halves of that — `dist/` holds no HTML
 * at all, and 46 of the 100 frozen routes legitimately answer 301 because
 * `astro.config.mjs` retires them. Against a baseline that could only express
 * "200 with these bytes", those 46 read as failures, on every pull request,
 * including ones that touched nothing but a workflow file. A gate that is red
 * for reasons unrelated to the change is a gate nobody reads.
 *
 * So the baseline is now the RESPONSE: status for every route, destination for
 * the redirects, and bytes for the routes that have a body — frozen from the
 * server itself by `scripts/freeze-baseline.mjs` and committed under
 * `tests/baseline/html/`.
 *
 * ON NORMALISATION
 * ----------------
 * The audit's open objection (section 5, objective 3) is the right one: if the
 * normalisation tolerates too much, the criterion cannot fail. So the rule here
 * is that normalisation is EARNED, never assumed:
 *
 *   - The default run compares raw bytes.
 *   - Every normaliser is named, is off unless listed in NORMALISERS, carries
 *     the reason it exists, and is applied to BOTH sides equally.
 *   - `--explain` prints, for each differing route, the first divergence with
 *     context, so a tolerance is added because someone read the diff — not
 *     because the number was inconvenient.
 *
 * The control negative for the normalisation itself is `--self-test`: it feeds
 * the normalisers a pair that differs in a way they must NOT forgive (a changed
 * word) and a pair that differs in a way they must (whitespace between tags),
 * and fails if either verdict is wrong. A normaliser that forgives everything
 * is caught there.
 *
 * ON `Host` (issue #95)
 * ----------------------
 * This used `fetch()`, which cannot set `Host`: it is a forbidden header name
 * and fetch drops it SILENTLY, sending the request under whatever hostname
 * `--base` connects to. In `api` mode that hostname is how this server decides
 * which TENANT a request belongs to (`src/lib/resolve-tenant.ts`), so a bare
 * `fetch` against `--base` can only ever measure the tenant that happens to own
 * that address — never `1platform.pro` behind a loopback `--base`, and never
 * any other tenant. Measured, same binary, same baseline, only the mode
 * changed: `SITE_MANIFEST_SOURCE=repo` gave 51 identical/2 differing; `api`
 * mode (production's default) gave 53 UNFETCHED — every route 404, because the
 * server saw `Host: 127.0.0.1` and no tenant owns that host.
 * `--host <hostname>` sends an explicit `Host` header over `node:http`
 * (the same technique as `tests/helpers/http-host.ts`, which documents the
 * `fetch` failure for the browser suite) instead of the one `--base`'s own
 * address would produce, so the comparator can measure a specific tenant
 * regardless of which address it connects to.
 *
 * USAGE
 *   node scripts/compare-served.mjs --base http://127.0.0.1:4331 --bodies <dir>
 *   node scripts/compare-served.mjs --base ... --bodies <dir> --host 1platform.pro
 *   node scripts/compare-served.mjs --base ... --bodies <dir> --explain
 *   node scripts/compare-served.mjs --self-test
 *
 * `npm run check:baseline` wraps the first form with the correct arguments —
 * see scripts/check-no-regression.sh for why `--bodies` is not optional.
 */

import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

const BASELINE = join('tests', 'baseline', 'baseline.json')

/**
 * Each normaliser must state what it forgives and why that difference is
 * legitimate rather than a regression. Anything not listed here is a real diff.
 */
const NORMALISERS = [
  {
    name: 'trailing-newline',
    why: 'The static writer terminates a file; an HTTP body has no such convention. Not observable by a reader.',
    apply: (s) => s.replace(/\n+$/, ''),
  },
  {
    name: 'json-ld-whitespace',
    why:
      'The Organization block stopped being an inline literal and became a value the ' +
      'layout serialises, because under N brands a literal named the platform on every ' +
      "client's page. A literal is pretty-printed and a serialiser is not, so the bytes " +
      'differ on every page while the JSON is the same document. This normaliser reformats ' +
      'BOTH sides through the same parser, so a difference in VALUE still fails — proven ' +
      'by the self-test case below, which changes a name and must not be forgiven.',
    apply: (s) =>
      s.replace(
        /(<script type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g,
        (whole, open_, body, close) => {
          try {
            return open_ + JSON.stringify(JSON.parse(body)) + close
          } catch {
            // Unparseable JSON-LD is a real defect (D-32), not noise. Left
            // untouched so it shows up as a difference instead of being tidied away.
            return whole
          }
        },
      ),
  },
  {
    name: 'scoped-style-order',
    why:
      'F3 added one import (the tenant origin helper) to fourteen components, and Astro ' +
      'concatenates every component\'s scoped CSS into ONE <style> block in module-graph ' +
      'order — so eighteen pages changed only in WHERE each component\'s rules sit inside ' +
      'that block. Measured on /about/: 9485 bytes of CSS on both sides, 69 rules on both ' +
      'sides, identical as a sorted set, and all 69 carry a data-astro-cid across 6 ' +
      'component scopes — so no two components\' rules can match the same element and ' +
      'their relative order cannot change the cascade.\n' +
      'It therefore sorts by SCOPE and keeps each scope\'s rules in their original order, ' +
      'which is stronger than sorting rules outright: a component that emits a base rule ' +
      'and then its :hover keeps that order, so an intra-component cascade change is still ' +
      'visible.\n' +
      'WHAT IT CANNOT SEE, stated rather than discovered later: two components whose rules ' +
      'genuinely do collide, if Astro ever emitted an UNSCOPED rule. That is why an ' +
      'unscoped rule makes this normaliser decline to touch the document at all rather ' +
      'than sort around it.',
    apply: (s) =>
      s.replace(/<style>([\s\S]*?)<\/style>/g, (whole, css) => {
        // Top-level rules, by brace depth — a regex cannot do this because
        // @media blocks nest.
        const rules = []
        let depth = 0
        let start = 0
        for (let i = 0; i < css.length; i++) {
          if (css[i] === '{') depth++
          else if (css[i] === '}') {
            depth--
            if (depth === 0) {
              const r = css.slice(start, i + 1).trim()
              if (r) rules.push(r)
              start = i + 1
            }
          }
        }
        if (depth !== 0 || rules.length === 0) return whole

        // Every rule must name a component scope, or this normaliser declines:
        // an unscoped rule is the one case where order could matter across
        // components, and silently sorting around it is how a tolerance starts
        // forgiving a real regression.
        const groups = new Map()
        for (const rule of rules) {
          const m = rule.match(/data-astro-cid-([a-z0-9]+)/)
          if (!m) return whole
          if (!groups.has(m[1])) groups.set(m[1], [])
          groups.get(m[1]).push(rule)
        }
        const ordered = [...groups.keys()].sort().map((cid) => groups.get(cid).join(''))
        return `<style>${ordered.join('')}</style>`
      }),
  },
]

function normalise(html) {
  return NORMALISERS.reduce((acc, n) => n.apply(acc), html)
}

const sha = (s) => createHash('sha256').update(s).digest('hex')

function firstDivergence(a, b) {
  const len = Math.min(a.length, b.length)
  let i = 0
  while (i < len && a[i] === b[i]) i++
  const from = Math.max(0, i - 90)
  return {
    at: i,
    baseline: JSON.stringify(a.slice(from, i + 90)),
    served: JSON.stringify(b.slice(from, i + 90)),
  }
}

/**
 * A GET that can actually choose `Host` — see the "ON `Host`" note above.
 * `manual` redirect handling comes for free: `node:http`/`node:https` never
 * follow a redirect on their own, so a 301/302 surfaces as `res.statusCode`
 * exactly like `fetch(url, { redirect: 'manual' })` used to.
 */
function getWithHost(url, host) {
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
            body: Buffer.concat(chunks).toString('utf8'),
            truncated: false,
          }),
        )
        // A body that stops mid-flight is the shape of issue #117: the head
        // said 200 and the render died after it. Resolving instead of hanging
        // is what lets that be REPORTED rather than time out.
        const cutShort = () =>
          resolve({
            status: res.statusCode ?? 0,
            location: res.headers.location ?? null,
            body: Buffer.concat(chunks).toString('utf8'),
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

// ---------------------------------------------------------------- self-test
if (process.argv.includes('--self-test')) {
  const base = '<p>hello</p>\n'
  const cases = [
    {
      name: 'forgives a trailing newline',
      other: '<p>hello</p>',
      mustMatch: true,
    },
    {
      name: 'does NOT forgive a changed word',
      other: '<p>goodbye</p>\n',
      mustMatch: false,
    },
    {
      name: 'does NOT forgive whitespace between tags',
      other: '<p>hello</p>\n<span></span>\n',
      mustMatch: false,
    },
    {
      name: 'does NOT forgive an added attribute',
      other: '<p class="x">hello</p>\n',
      mustMatch: false,
    },
  ]
  const LD = (body) => `<script type="application/ld+json">${body}</script>`
  const ldCases = [
    {
      name: 'forgives JSON-LD reformatting (same document, different whitespace)',
      a: LD('\n  {\n    "@type": "Organization",\n    "name": "X"\n  }\n  '),
      b: LD('{"@type":"Organization","name":"X"}'),
      mustMatch: true,
    },
    {
      name: 'does NOT forgive a changed JSON-LD VALUE',
      a: LD('{"@type":"Organization","name":"X"}'),
      b: LD('{"@type":"Organization","name":"Y"}'),
      mustMatch: false,
    },
    {
      name: 'does NOT forgive a REMOVED JSON-LD field',
      a: LD('{"@type":"Organization","name":"X","logo":"/a.svg"}'),
      b: LD('{"@type":"Organization","name":"X"}'),
      mustMatch: false,
    },
    {
      name: 'does NOT forgive unparseable JSON-LD (the D-32 failure)',
      a: LD('{"name":"X"}'),
      // Built by concatenation so this FILE never contains the literal
      // sequence, which is the whole point of the case. The previous form was
      // `.replace('</script>', '<\/script>')` — and in JavaScript `'<\/script>'`
      // IS `'</script>'`, so it replaced the string with itself and the literal
      // stayed in the source anyway. A no-op that looked like an escape.
      b: LD('{"name":"<' + '/script><script>"}'),
      mustMatch: false,
    },
  ]
  const S = (...rules) => `<head><style>${rules.join('')}</style></head>`
  const A1 = '.a[data-astro-cid-aaa]{color:red}'
  const A2 = '.a[data-astro-cid-aaa]:hover{color:pink}'
  const B1 = '.b[data-astro-cid-bbb]{color:blue}'
  const styleCases = [
    {
      name: 'forgives two component SCOPES in a different order',
      a: S(A1, A2, B1),
      b: S(B1, A1, A2),
      mustMatch: true,
    },
    {
      name: 'does NOT forgive a CHANGED declaration',
      a: S(A1, B1),
      b: S('.a[data-astro-cid-aaa]{color:green}', B1),
      mustMatch: false,
    },
    {
      name: 'does NOT forgive a REMOVED rule',
      a: S(A1, A2, B1),
      b: S(A1, B1),
      mustMatch: false,
    },
    {
      name: 'does NOT forgive an ADDED rule',
      a: S(A1, B1),
      b: S(A1, B1, '.c[data-astro-cid-ccc]{display:none}'),
      mustMatch: false,
    },
    {
      name: 'does NOT forgive reordering INSIDE one component (base vs :hover)',
      a: S(A1, A2),
      b: S(A2, A1),
      mustMatch: false,
    },
    {
      name: 'declines to touch a block holding an UNSCOPED rule',
      a: S(A1, 'h1{color:red}'),
      b: S('h1{color:red}', A1),
      mustMatch: false,
    },
    {
      name: 'does NOT forgive markup changing outside the style block',
      a: `<style>${A1}</style><h1>Title</h1>`,
      b: `<style>${A1}</style><h1>Other</h1>`,
      mustMatch: false,
    },
  ]
  let bad = 0
  for (const c of cases) {
    const matched = sha(normalise(base)) === sha(normalise(c.other))
    const ok = matched === c.mustMatch
    if (!ok) bad++
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${c.name} (matched=${matched}, expected=${c.mustMatch})`)
  }
  for (const c of ldCases) {
    const matched = sha(normalise(c.a)) === sha(normalise(c.b))
    const ok = matched === c.mustMatch
    if (!ok) bad++
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${c.name} (matched=${matched}, expected=${c.mustMatch})`)
  }
  for (const c of styleCases) {
    const matched = sha(normalise(c.a)) === sha(normalise(c.b))
    const ok = matched === c.mustMatch
    if (!ok) bad++
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${c.name} (matched=${matched}, expected=${c.mustMatch})`)
  }
  const total = cases.length + ldCases.length + styleCases.length
  console.log(
    bad === 0
      ? `compare-served --self-test: OK — ${total} assertions, normalisers: ${NORMALISERS.map((n) => n.name).join(', ') || '(none)'}`
      : `compare-served --self-test: FAIL — ${bad} assertion(s) wrong`,
  )
  process.exit(bad === 0 ? 0 : 1)
}

// ----------------------------------------------------------------- compare
const argv = process.argv.slice(2)
const baseIdx = argv.indexOf('--base')
const BASE = baseIdx >= 0 ? argv[baseIdx + 1] : 'http://127.0.0.1:4331'
const EXPLAIN = argv.includes('--explain')
const hostIdx = argv.indexOf('--host')

if (!existsSync(BASELINE)) {
  console.error(`compare-served: ${BASELINE} missing — run scripts/freeze-baseline.mjs against a running server first`)
  process.exit(2)
}
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))
const routes = baseline.entries.filter((e) => e.route)

// The baseline records WHICH HOST it was frozen under, so the comparison
// defaults to measuring the same tenant instead of whatever `--base` resolves
// to. Passing `--host` still overrides it, which is how another tenant gets
// measured against a baseline of its own.
const HOST_OVERRIDE = hostIdx >= 0 ? argv[hostIdx + 1] : (baseline.host ?? null)

// The baseline stores hashes of the frozen BYTES, which is the contract. To
// compare at all we also need those bytes on hand, and a normaliser is only
// meaningful applied to BOTH sides — so the frozen bodies live next to the
// baseline, in `tests/baseline/html/`, and are committed (issue #112).
//
// Bodies are NOT optional (issue #99). Without them the run falls through to
// comparing a NORMALISED served page against the baseline's RAW hash, which
// cannot match unless every normaliser is a no-op, so every route a normaliser
// was supposed to forgive is misreported as a regression: measured on a clean
// tree, 1 identical / 52 differing — a catastrophe that is not one.
//
// They used to be obtained by checking out the commit the baseline was frozen
// from and building it, which stopped being possible the moment that commit
// built a SERVER (no `.html` in `dist/` at all) and was a gate with an expiry
// date besides — it needed an old lockfile to keep installing, forever.
const bodiesIdx = argv.indexOf('--bodies')
const HTML_DIR = bodiesIdx >= 0 ? argv[bodiesIdx + 1] : (baseline.bodies ?? join('tests', 'baseline', 'html'))
if (!HTML_DIR || !existsSync(HTML_DIR)) {
  console.error(
    `compare-served: the frozen bodies are missing (${HTML_DIR}). They are committed alongside ` +
      'tests/baseline/baseline.json; if the directory is gone, re-freeze with ' +
      'scripts/freeze-baseline.mjs against a running server rather than running this bare — ' +
      'without both sides a legitimate normalisation cannot be told from a real regression ' +
      '(issue #99).',
  )
  process.exit(2)
}
const haveBodies = true

function readBaselineBody(file) {
  const p = join(HTML_DIR, file)
  return existsSync(p) ? readFileSync(p, 'utf8') : null
}

const same = []
const differs = []
const failed = []

for (const entry of routes) {
  // The status is part of the frozen answer, not a precondition for reading it
  // (issue #112). A route that answers 301 today does so because
  // `astro.config.mjs` retires it ON PURPOSE, and a gate that can only say
  // "expected 200" reports 47 deliberate redirects as 47 failures — which is
  // how it came to be red on every pull request for two days running and
  // stopped being read at all.
  const expectedStatus = entry.status ?? 200

  // Per-route try/catch on purpose: a route whose render dies mid-stream closes
  // the socket, and without this one bad route aborts the whole run and hides
  // the other 99 verdicts. An unfetchable route is a RESULT, not a crash.
  let served
  try {
    const url = BASE + entry.route
    // The Host `--base`'s own address would produce, unless `--host` (or the
    // baseline itself) names a specific tenant — see the "ON `Host`" note.
    const host = HOST_OVERRIDE ?? new URL(url).host
    const res = await getWithHost(url, host)

    if (res.status !== expectedStatus) {
      failed.push({ route: entry.route, why: `status ${res.status}, baseline says ${expectedStatus}` })
      continue
    }
    if (res.truncated) {
      // The defect #117 closed: a head that promised a body the render never
      // finished. Reported loudly rather than hashed, because hashing half a
      // document would freeze the truncation in as the expected answer.
      failed.push({ route: entry.route, why: `answered ${res.status} and hung up mid-body` })
      continue
    }
    if (expectedStatus >= 300 && expectedStatus < 400) {
      if (res.location === entry.location) same.push(entry.route)
      else failed.push({ route: entry.route, why: `redirects to ${res.location}, baseline says ${entry.location}` })
      continue
    }
    served = res.body
  } catch (err) {
    const cause = err.cause ? ` (${err.cause.code || err.cause.message})` : ''
    failed.push({ route: entry.route, why: `request failed: ${err.message}${cause}` })
    continue
  }
  // Raw bytes first: an exact match needs no tolerance and is the strongest
  // answer available.
  if (sha(served) === entry.sha256) {
    same.push(entry.route)
    continue
  }

  // Then the normalised comparison — but only when the baseline BODY is on hand,
  // because a normaliser has to be applied to BOTH sides to mean anything.
  // Comparing a normalised served page against a raw baseline HASH would just be
  // a second way to miss, and would quietly make every normaliser useless.
  const baselineBody = haveBodies ? readBaselineBody(entry.file) : null
  if (baselineBody !== null && sha(normalise(baselineBody)) === sha(normalise(served))) {
    same.push(entry.route)
    continue
  }
  if (baselineBody === null && sha(normalise(served)) === entry.sha256) {
    same.push(entry.route)
    continue
  }
  const rec = { route: entry.route, servedBytes: served.length, baselineBytes: entry.bytes }
  if (EXPLAIN && haveBodies) {
    const p = join(HTML_DIR, entry.file)
    if (existsSync(p)) rec.diff = firstDivergence(normalise(readFileSync(p, 'utf8')), normalise(served))
  }
  differs.push(rec)
}

console.log(`compare-served: ${routes.length} baseline routes against ${BASE}`)
console.log(`  identical : ${same.length}`)
console.log(`  differing : ${differs.length}`)
console.log(`  wrong     : ${failed.length}   (status, destination, or unreachable)`)
console.log(`  normalisers applied: ${NORMALISERS.map((n) => n.name).join(', ') || '(none — raw bytes)'}`)

for (const f of failed) console.log(`  WRONG      ${f.route} — ${f.why}`)
if (EXPLAIN) {
  for (const d of differs) {
    console.log(`  DIFFERS    ${d.route}  (baseline ${d.baselineBytes}B vs served ${d.servedBytes}B)`)
    if (d.diff) {
      console.log(`      first divergence at byte ${d.diff.at}`)
      console.log(`      baseline: ${d.diff.baseline}`)
      console.log(`      served  : ${d.diff.served}`)
    }
  }
} else if (differs.length) {
  console.log(`  (run with --explain for the first divergence of each)`)
  for (const d of differs.slice(0, 20)) console.log(`  DIFFERS    ${d.route}`)
  if (differs.length > 20) console.log(`  ... and ${differs.length - 20} more`)
}

process.exit(differs.length || failed.length ? 1 : 0)
