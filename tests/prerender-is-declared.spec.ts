import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * A prerendered route is served to EVERY host, and no middleware can stop it.
 *
 * This is not a style rule. It was measured on this build:
 *
 *   a middleware that returns 403 for /blog/getting-started-5-minutes/
 *     -> the page still answers 200
 *   the same middleware returning 403 for /robots.txt
 *     -> the file still answers 200
 *   the same middleware, on an injected route (/_image)
 *     -> 400, so the middleware is definitely running
 *
 * `@astrojs/node` serves everything under `dist/client/` from its static
 * handler BEFORE the Astro application runs. So a page carrying
 * `export const prerender = true` is rendered ONCE at build time — with no real
 * request, therefore no Host, therefore no tenant — frozen, and then handed to
 * whoever asks, whatever domain they came in on.
 *
 * Under one container serving N brands that is a cross-tenant content leak by
 * construction: the clinic's visitors would be served 1Platform's blog.
 *
 * So every prerendered route has to be a DECISION, written down, with the
 * reason it is safe or the phase that will remove it. The list below is that
 * decision. It is allowed to shrink and it is not allowed to grow quietly.
 *
 * This test does not forbid prerendering. It forbids prerendering that nobody
 * agreed to.
 */

const PAGES_DIR = join('src', 'pages')

/**
 * Every route allowed to be prerendered, and why.
 *
 * `until` names the phase that must revisit it. An entry with an `until` is a
 * debt, not a design — it is here so the debt has an address.
 */
const DECLARED_PRERENDERS: Record<string, { why: string; until?: string }> = {
  // Empty, and that is the correct state.
  //
  // Two blog routes lived here for one commit. They came out when the chrome
  // started reading the tenant, because the build itself said why: a prerendered
  // page renders with no request, so `Astro.request.headers` is unavailable and
  // the tenant never resolves. The list did its job — it carried the debt with
  // an address instead of letting it settle in.
}

function pageFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) pageFiles(full, acc)
    else if (name.endsWith('.astro') || name.endsWith('.ts')) acc.push(full)
  }
  return acc
}

/** Strips comments so a line explaining the rule is not read as breaking it. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length))
}

test('every prerendered route is one somebody declared', () => {
  const files = pageFiles(PAGES_DIR)

  // Floor. A walker that stops finding pages would report "no undeclared
  // prerenders" forever, which reads exactly like a healthy tree.
  expect(
    files.length,
    'found almost no page files — the walk is broken, and a broken walk is not a pass',
  ).toBeGreaterThan(30)

  const found: string[] = []
  for (const file of files) {
    const source = withoutComments(readFileSync(file, 'utf8'))
    if (/\bexport\s+const\s+prerender\s*=\s*true\b/.test(source)) {
      found.push(relative(PAGES_DIR, file).split(sep).join('/'))
    }
  }

  const undeclared = found.filter((r) => !(r in DECLARED_PRERENDERS))
  expect(
    undeclared,
    `These routes are prerendered but nobody declared them:\n  ${undeclared.join('\n  ')}\n\n` +
      `A prerendered route is built once, without a request, and then served to EVERY host — no ` +
      `middleware can gate it (measured). Under one container serving N brands that is a ` +
      `cross-tenant leak. Either make the route dynamic, or add it to DECLARED_PRERENDERS with the ` +
      `reason it is tenant-independent and the phase that will remove it.`,
  ).toEqual([])

  // The list shrinks, it does not rot. An entry for a route that no longer
  // prerenders is a stale decision, and stale decisions are how a list like
  // this stops describing the code.
  const stale = Object.keys(DECLARED_PRERENDERS).filter((r) => !found.includes(r))
  expect(
    stale,
    `Declared as prerendered but no longer are:\n  ${stale.join('\n  ')}\nRemove them from DECLARED_PRERENDERS.`,
  ).toEqual([])
})
