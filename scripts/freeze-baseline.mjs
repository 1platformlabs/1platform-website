#!/usr/bin/env node
/**
 * Freezes the baseline of what 1platform.pro serves, so the multi-tenant
 * conversion can be proven not to have changed it.
 *
 * WHY THIS EXISTS
 * ---------------
 * The epic `website-multitenant` turns this site from a static build into a
 * long-lived server that resolves a tenant per request. The central acceptance
 * criterion is that `1platform.pro` does not regress. That is only checkable
 * against a baseline captured BEFORE anything moves — hence F0, and hence this
 * file being committed.
 *
 * WHAT IT CAPTURES
 * ----------------
 * Every file the build emits, with its sha256, plus the route path each HTML
 * file answers. Raw bytes, no normalisation: normalising here would bake a
 * tolerance into the baseline itself, and a tolerance you cannot see is a gate
 * that cannot fail. Whatever legitimately differs under the server adapter gets
 * MEASURED in F1 and enumerated in the comparator, where it is reviewable.
 *
 * The build is deterministic: two consecutive `npm ci && npm run build` runs on
 * the same commit produced 153/153 byte-identical files, so a hash is a fair
 * instrument.
 *
 * USAGE
 *   node scripts/freeze-baseline.mjs            # write tests/baseline/baseline.json
 *   node scripts/freeze-baseline.mjs --check    # compare dist/ against it, exit 1 on drift
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const DIST = 'dist'
const OUT = join('tests', 'baseline', 'baseline.json')

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, acc)
    else acc.push(full)
  }
  return acc
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

/** dist/es/about/index.html -> /es/about/  ·  dist/404.html -> /404.html */
function routeOf(distPath) {
  const rel = relative(DIST, distPath).split(sep).join('/')
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length)
  if (rel === 'index.html') return '/'
  return '/' + rel
}

function collect() {
  if (!existsSync(DIST)) {
    console.error('freeze-baseline: no dist/ — run `npm run build` first')
    process.exit(2)
  }
  const files = walk(DIST).sort()
  const entries = files.map((f) => {
    const rel = relative(DIST, f).split(sep).join('/')
    const isHtml = rel.endsWith('.html')
    return {
      file: rel,
      sha256: sha256(f),
      bytes: statSync(f).size,
      ...(isHtml ? { route: routeOf(f) } : {}),
    }
  })
  return {
    // `commit` is stamped by the caller (CI or the human running it), not read
    // here: this script must stay pure so its output is diffable.
    generator: 'scripts/freeze-baseline.mjs',
    total_files: entries.length,
    html_files: entries.filter((e) => e.route).length,
    entries,
  }
}

const check = process.argv.includes('--check')
const current = collect()

if (!check) {
  mkdirSync(join('tests', 'baseline'), { recursive: true })
  writeFileSync(OUT, JSON.stringify(current, null, 2) + '\n')
  console.log(
    `freeze-baseline: wrote ${OUT} — ${current.total_files} files, ${current.html_files} HTML routes`,
  )
  process.exit(0)
}

// --check: the instrument has to be able to say NO, so it reports three
// distinct failures instead of one boolean.
if (!existsSync(OUT)) {
  console.error(`freeze-baseline --check: ${OUT} does not exist; nothing to compare against`)
  process.exit(2)
}
const baseline = JSON.parse(readFileSync(OUT, 'utf8'))
const byFile = (list) => new Map(list.map((e) => [e.file, e]))
const was = byFile(baseline.entries)
const now = byFile(current.entries)

const missing = [...was.keys()].filter((f) => !now.has(f))
const added = [...now.keys()].filter((f) => !was.has(f))
const changed = [...now.keys()].filter((f) => was.has(f) && was.get(f).sha256 !== now.get(f).sha256)

for (const f of missing) console.error(`  GONE     ${f}`)
for (const f of added) console.error(`  NEW      ${f}`)
for (const f of changed) console.error(`  CHANGED  ${f}`)

if (missing.length || added.length || changed.length) {
  console.error(
    `freeze-baseline --check: FAIL — ${missing.length} gone, ${added.length} new, ${changed.length} changed`,
  )
  process.exit(1)
}
console.log(`freeze-baseline --check: OK — ${current.total_files} files identical to the baseline`)
