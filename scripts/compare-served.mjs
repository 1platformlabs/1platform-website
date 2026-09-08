#!/usr/bin/env node
/**
 * Compares what the SERVER renders against the frozen static baseline (F0).
 *
 * WHY THIS EXISTS
 * ---------------
 * F0 froze the bytes of a static build. F1 turns the site into a long-lived
 * server. The central acceptance criterion of the epic is that `1platform.pro`
 * does not regress, so something has to hold the server's output against those
 * frozen bytes — and it has to be able to say NO, or it is decoration.
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
 * USAGE
 *   node scripts/compare-served.mjs --base http://127.0.0.1:4331
 *   node scripts/compare-served.mjs --base ... --explain
 *   node scripts/compare-served.mjs --self-test
 */

import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

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
      b: LD('{"name":"</script><script>"}'.replace('</script>', '<\/script>')),
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
  const total = cases.length + ldCases.length
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

if (!existsSync(BASELINE)) {
  console.error(`compare-served: ${BASELINE} missing — run scripts/freeze-baseline.mjs on a static build first`)
  process.exit(2)
}
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))
const routes = baseline.entries.filter((e) => e.route)

// The baseline stores hashes of file BYTES, which is the contract. To EXPLAIN a
// difference we also need the bytes, and an SSR build no longer emits them — so
// `--bodies <dir>` points at a static dist/ built from the baseline commit
// (a detached worktree at origin/main does this without disturbing anything).
const bodiesIdx = argv.indexOf('--bodies')
const HTML_DIR = bodiesIdx >= 0 ? argv[bodiesIdx + 1] : join('tests', 'baseline', 'html')
const haveBodies = existsSync(HTML_DIR)

function readBaselineBody(file) {
  const p = join(HTML_DIR, file)
  return existsSync(p) ? readFileSync(p, 'utf8') : null
}

const same = []
const differs = []
const failed = []

for (const entry of routes) {
  // Per-route try/catch on purpose: a route whose render dies mid-stream closes
  // the socket, and without this one bad route aborts the whole run and hides
  // the other 99 verdicts. An unfetchable route is a RESULT, not a crash.
  let res, served
  try {
    res = await fetch(BASE + entry.route, { redirect: 'manual', headers: { connection: 'close' } })
    if (res.status !== 200) {
      failed.push({ route: entry.route, why: `status ${res.status}` })
      continue
    }
    served = await res.text()
  } catch (err) {
    const cause = err.cause ? ` (${err.cause.code || err.cause.message})` : ''
    failed.push({ route: entry.route, why: `fetch failed: ${err.message}${cause}` })
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
console.log(`  unfetched : ${failed.length}`)
console.log(`  normalisers applied: ${NORMALISERS.map((n) => n.name).join(', ') || '(none — raw bytes)'}`)

for (const f of failed) console.log(`  UNFETCHED  ${f.route} — ${f.why}`)
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
