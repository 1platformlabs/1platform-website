import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

import { getWithHost } from './helpers/http-host'
import { surface } from './helpers/site-surface'

/**
 * Rules 3 and 4 of `scripts/check-tells.sh`, over the SERVED HTML of EVERY
 * tenant. (issue #101)
 *
 * WHY THIS EXISTS
 * ----------------
 * Rule 3 (no fabricated prices or vanity metrics) and rule 4 (no numbered
 * replace-count claim) scan `$SRC $PROSE` — the source tree. F3 moved a
 * tenant's copy out of that tree and into `1platform-api`, the same move that
 * made rule 10 (provider names) blind and produced
 * `no-leak-across-tenants.spec.ts` as its replacement. Rules 3 and 4 never got
 * that replacement: `npm run check` stayed green because both rules were
 * measuring an EMPTY question — a price seeded into a tenant's API content
 * cannot appear in any file `check-tells.sh` reads, and the guard has no way
 * to say so.
 *
 * This is that replacement, built the same way: the patterns are READ OUT OF
 * `check-tells.sh` (never re-typed) so the source-tree rule and the
 * served-surface rule can never drift, and the surface is DERIVED from the
 * padrón (`./helpers/site-surface`, shared with `no-leak-across-tenants.spec.ts`)
 * so a tenant added tomorrow is scanned without anybody remembering to add it.
 *
 * WHAT STAYS ON THE TREE
 * -----------------------
 * `check-tells.sh` rules 3 and 4 are NOT removed or narrowed: a price or a
 * numbered claim hand-written into a `.astro` component is still a defect —
 * it would leak into every tenant that renders it, including the platform's
 * own composed pages that are not yet API content — and the tree is exactly
 * where that kind of mistake is caught before it ships. This file adds the
 * surface the tree scan structurally cannot see; it does not replace it.
 *
 * ⚠️ AN EMPTY SURFACE IS AN ERROR, NOT A PASS — same floor as the sibling
 * file, for the same reason: a scanner that quietly starts walking nothing is
 * indistinguishable, from its own output, from an estate with no defects.
 */

/**
 * The two patterns as `check-tells.sh` currently runs them, not as this file
 * remembers them. A rule that is edited in the guard and not here would
 * silently stop being enforced on served content while `npm run check` still
 * reports it green.
 */
function fabricatedPricingPattern(): RegExp {
  const guard = readFileSync('scripts/check-tells.sh', 'utf8')
  // The only `-rnE` (no `i`) grep against BOTH `$SRC` and `$PROSE` in the
  // file — rule 10 is the only other rule scanning both directories, and it
  // uses `-rniE`, so this cannot match rule 10's line by accident.
  const m = guard.match(/grep -rnE '([^']+)' \$SRC \$PROSE/)
  expect(m, 'could not read rule 3 (fabricated pricing) out of check-tells.sh').not.toBeNull()
  return new RegExp(m![1])
}

function replaceCountPatterns(): { en: RegExp; es: RegExp } {
  const guard = readFileSync('scripts/check-tells.sh', 'utf8')
  const candidates = [...guard.matchAll(/grep -rniE '([^']+)' \$SRC\b/g)].map((m) => m[1])
  const en = candidates.find((p) => p.includes('vendors'))
  const es = candidates.find((p) => p.includes('herramientas'))
  expect(en, 'could not read rule 4 (English replace-count) out of check-tells.sh').toBeDefined()
  expect(es, 'could not read rule 4 (Spanish replace-count) out of check-tells.sh').toBeDefined()
  return { en: new RegExp(en!, 'i'), es: new RegExp(es!, 'i') }
}

const PORT = process.env.PLAYWRIGHT_PORT ?? '4321'
const BASE = `http://127.0.0.1:${PORT}`

/**
 * Rule 4 scans `$SRC` only in the tree — never `$PROSE` — and check-tells.sh
 * says why: "An article observing that teams juggle several tools is
 * editorial context, not the site claiming it replaces them. Pointing those
 * rules at prose produces false positives that teach people to ignore the
 * script." Measured here before this exclusion existed: the blog posts on
 * automating a pipeline and launching a store, and the changelog (in both
 * languages), all matched — legitimate editorial copy, not a marketing claim.
 * The served surface has no tree to stop at, so this mirrors the same
 * boundary by route instead of by directory.
 */
const PROSE_ROUTE = /^\/blog(\/|$)|^\/changelog\/$/

test('the two patterns still catch what they are named for', () => {
  // The control the whole file rests on: a pattern that rotted into matching
  // nothing would report every page clean, forever — the exact failure mode
  // this file exists to close for rules 3 and 4.
  const price = fabricatedPricingPattern()
  expect(price.test('Plans start around $19/mo'), 'must still catch a seeded price').toBe(true)

  const { en, es } = replaceCountPatterns()
  expect(en.test('replaces four vendors'), 'must still catch a seeded English count').toBe(true)
  expect(es.test('reemplaza seis herramientas distintas'), 'must still catch a seeded Spanish count').toBe(
    true,
  )
})

test('no tenant serves a fabricated price or vanity metric, on any page, in any language', async () => {
  const banned = fabricatedPricingPattern()
  const leaks: string[] = []
  let scanned = 0

  for (const page of surface()) {
    const res = await getWithHost(BASE + page.url, page.host)
    expect(res.status, `${page.host}${page.url} is published but answered ${res.status}`).toBe(200)
    scanned += 1
    if (banned.test(res.body)) leaks.push(`${page.host}${page.url}`)
  }

  expect(scanned, 'nothing was scanned — a broken probe is not a pass').toBeGreaterThan(40)
  expect(leaks, `a fabricated price or vanity metric is being served on: ${leaks.join(', ')}`).toEqual([])
})

test('no tenant serves an unverifiable "replaces N tools" claim, in either language', async () => {
  const { en, es } = replaceCountPatterns()
  const leaks: string[] = []
  let scanned = 0
  let excluded = 0

  for (const page of surface()) {
    if (PROSE_ROUTE.test(page.route)) {
      excluded += 1
      continue
    }
    const res = await getWithHost(BASE + page.url, page.host)
    expect(res.status, `${page.host}${page.url} is published but answered ${res.status}`).toBe(200)
    scanned += 1
    if (en.test(res.body) || es.test(res.body)) leaks.push(`${page.host}${page.url}`)
  }

  // Both floors matter: a probe that scans nothing is not a pass, and neither
  // is one whose exclusion silently ate the whole surface.
  expect(scanned, 'nothing was scanned — a broken probe is not a pass').toBeGreaterThan(15)
  expect(excluded, 'the prose exclusion matched nothing — blog/changelog routes moved?').toBeGreaterThan(0)
  expect(leaks, `a numbered replace-count claim is being served on: ${leaks.join(', ')}`).toEqual([])
})
