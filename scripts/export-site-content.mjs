#!/usr/bin/env node
/**
 * Export this repository's message catalogues as the seed fixture for the API.
 *
 * WHY THIS EXISTS
 * ---------------
 * F3 moves the copy of `1platform.pro` out of this repository and into
 * `1platform-api`. The central acceptance criterion of the epic is that the
 * site does not regress while that happens — byte for byte where it can be, and
 * with every difference enumerated where it cannot. That is only checkable if
 * the seeded content is DERIVED from the catalogues rather than retyped from
 * them, so this script is the derivation and its output is an artifact somebody
 * can diff.
 *
 * WHY IT WRITES JSON INSTEAD OF TALKING TO THE API
 * ------------------------------------------------
 * The two repositories share no code and must not start to: this site's only
 * coupling to `1platform-api` is HTTP. A seed that ran from here would need
 * platform credentials in this repository's toolchain. Instead this emits a
 * file, `1platform-api` commits it under `scripts/fixtures/`, and the seeding
 * is done by a script that lives beside the database it writes to — the same
 * split `scripts/fixtures/preset_*.json` already uses over there.
 *
 * HOW A CATALOGUE BECOMES A ROUTE
 * -------------------------------
 * `SitePage` is keyed by (tenant, route, locale). Seventeen catalogues belong
 * to a page; the other seven belong to no single URL and are read by every
 * page, so they take an `@`-prefixed name. The mapping is written out rather
 * than derived, because it is NOT derivable: `solutions-ads` becomes
 * `/solutions/ads/` while `for-agencies` stays `/for-agencies/`, and any rule
 * that gets one right gets the other wrong. Written out, it is also checkable —
 * and this script checks it, in both directions, before writing anything.
 *
 * ⚠️ THE ROUTE IS THE CANONICAL, ENGLISH-ROOTED PATH, NOT THE URL.
 * `/pricing/` covers both `/pricing/` and `/es/precios/`: one catalogue, two
 * locales, one route. The locale prefix and the Spanish slug are STRUCTURE and
 * stay in this repository (`src/i18n/routes.ts`), because they describe URL
 * shape rather than what a page says. Storing the translated URL as the route
 * would give a tenant two documents for one page and make `SiteTenant.pages`
 * ambiguous about which of them it published.
 *
 * Usage:
 *   node scripts/export-site-content.mjs --out <path.json> [--slug oneplatform]
 *   node scripts/export-site-content.mjs --check     # verify the map, write nothing
 */

import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { transformSync } from 'esbuild'

const MESSAGES_DIR = 'src/i18n/messages'
const PAGES_DIR = 'src/pages'

/**
 * Catalogue module path (relative to `src/i18n/messages`) → the route it holds.
 *
 * Every entry is asserted below: a page route must have a file in `src/pages`
 * that publishes it, and every catalogue on disk must appear here. A catalogue
 * that nobody maps would otherwise be dropped from the export in silence, and
 * dropping `common.ts` alone would take the entire chrome of every page with
 * it — 65 keys, including the nav labels and the copyright line.
 */
const ROUTE_OF = {
  // — Pages: the route is the canonical English-rooted path —
  'pages/home.ts': '/',
  'pages/about.ts': '/about/',
  'pages/contact.ts': '/contact/',
  'pages/cookies.ts': '/cookies/',
  'pages/for-agencies.ts': '/for-agencies/',
  'pages/for-developers.ts': '/for-developers/',
  'pages/not-found.ts': '/404/',
  'pages/payments-invoicing.ts': '/payments-invoicing/',
  'pages/pricing.ts': '/pricing/',
  'pages/privacy.ts': '/privacy/',
  'pages/solutions.ts': '/solutions/',
  'pages/solutions-ads.ts': '/solutions/ads/',
  'pages/solutions-content.ts': '/solutions/content/',
  'pages/solutions-deliveries.ts': '/solutions/deliveries/',
  'pages/solutions-online-store.ts': '/solutions/online-store/',
  'pages/solutions-whitelabel.ts': '/solutions/whitelabel/',
  'pages/terms.ts': '/terms/',

  // — Shared: read by every page, so they belong to no single URL —
  'common.ts': '@common',
  'content.ts': '@content',
  'components/card.ts': '@components/card',
  'components/comparison-table.ts': '@components/comparison-table',
  'components/hero.ts': '@components/hero',
  'components/interconnect-diagram.ts': '@components/interconnect-diagram',
  'components/process-spine.ts': '@components/process-spine',
}

/**
 * Routes that legitimately have no file in `src/pages` publishing them.
 *
 * `/404/` is Astro's error page: it exists as `src/pages/404.astro` and is
 * reachable, but it is never a published route and `src/lib/site-routes.ts`
 * excludes it from the sitemap for that reason. Listing it here is what lets
 * the cross-check below be strict about everything else.
 */
const NOT_PUBLISHED = new Set(['/404/'])

function walk(dir, base = dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full, base))
    else out.push(relative(base, full))
  }
  return out
}

/**
 * Read one catalogue module without a bundler and without a type-checker.
 *
 * The modules are `export default defineMessages({ en: {...}, es: {...} })`
 * with one import. esbuild strips the types; the import is replaced by a local
 * identity function, because `defineMessages` exists to give TypeScript a
 * constraint and does nothing at runtime — verified in `src/i18n/ui.ts`.
 *
 * Evaluating rather than parsing is deliberate: these files contain template
 * literals and comments, and a regex that handles those correctly is a
 * JavaScript parser written badly. The input is this repository's own source,
 * committed and reviewed, so evaluating it is no more trusting than importing
 * it — which is what the site itself does on every request.
 */
function readCatalogue(file) {
  const source = readFileSync(file, 'utf8')
  const withoutImport = source.replace(
    /^import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?\s*$/m,
    'const defineMessages = (x) => x;',
  )
  const js = transformSync(withoutImport, { loader: 'ts', format: 'cjs' }).code
  const module = { exports: {} }
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', js)(module, module.exports)
  const value = module.exports.default ?? module.exports
  if (!value || typeof value !== 'object' || !value.en || !value.es) {
    throw new Error(`${file}: expected a default export with 'en' and 'es' objects`)
  }
  return value
}

function main() {
  const args = process.argv.slice(2)
  const outIndex = args.indexOf('--out')
  const out = outIndex === -1 ? null : args[outIndex + 1]
  const slugIndex = args.indexOf('--slug')
  const slug = slugIndex === -1 ? 'oneplatform' : args[slugIndex + 1]
  const checkOnly = args.includes('--check')

  if (!out && !checkOnly) {
    console.error('usage: export-site-content.mjs --out <path.json> [--slug <slug>] | --check')
    process.exit(64)
  }

  const onDisk = walk(MESSAGES_DIR).filter((f) => f.endsWith('.ts')).sort()
  const mapped = Object.keys(ROUTE_OF).sort()

  // ── Cross-check 1: the map and the disk agree, in BOTH directions ──────
  // One direction alone is the classic half-check: "every mapped file exists"
  // stays green while a brand-new catalogue is silently never exported.
  const unmapped = onDisk.filter((f) => !(f in ROUTE_OF))
  const missing = mapped.filter((f) => !onDisk.includes(f))
  if (unmapped.length || missing.length) {
    for (const f of unmapped) console.error(`  catalogue on disk with no route: ${f}`)
    for (const f of missing) console.error(`  route mapped to a catalogue that does not exist: ${f}`)
    console.error(
      '\nThe route map and src/i18n/messages/ disagree. A catalogue with no route is ' +
        'dropped from the seed in silence, which is how a whole page ships with no copy.',
    )
    process.exit(1)
  }

  // ── Cross-check 2: every page route is actually published by a file ────
  const pageFiles = new Set(walk(PAGES_DIR))
  const unpublished = []
  for (const [file, route] of Object.entries(ROUTE_OF)) {
    if (!route.startsWith('/') || NOT_PUBLISHED.has(route)) continue
    // "/solutions/ads/" -> "solutions/ads.astro" or "solutions/ads/index.astro"
    const stem = route.replace(/^\/|\/$/g, '')
    const candidates = stem === ''
      ? ['index.astro']
      : [`${stem}.astro`, `${stem}/index.astro`]
    if (!candidates.some((c) => pageFiles.has(c))) {
      unpublished.push(`${file} -> ${route} (no ${candidates.join(' or ')} in ${PAGES_DIR})`)
    }
  }
  if (unpublished.length) {
    for (const line of unpublished) console.error(`  ${line}`)
    console.error('\nA route with copy and no page is content nobody can reach.')
    process.exit(1)
  }

  // ── Read every catalogue and assert parity while we still can ──────────
  const documents = []
  const perLocale = { en: new Set(), es: new Set() }
  let totalKeys = 0

  for (const file of onDisk) {
    const catalogue = readCatalogue(join(MESSAGES_DIR, file))
    const route = ROUTE_OF[file]
    for (const locale of ['en', 'es']) {
      const blocks = catalogue[locale]
      for (const [key, value] of Object.entries(blocks)) {
        if (typeof value !== 'string' || value.trim() === '') {
          console.error(`  ${file}: ${locale} value for ${key} is blank or not a string`)
          process.exit(1)
        }
        if (perLocale[locale].has(key)) {
          console.error(`  duplicate key across catalogues: ${key} (${locale}, at ${file})`)
          process.exit(1)
        }
        perLocale[locale].add(key)
      }
      totalKeys += Object.keys(blocks).length
      documents.push({ route, locale, published: true, blocks })
    }
  }

  const onlyEn = [...perLocale.en].filter((k) => !perLocale.es.has(k))
  const onlyEs = [...perLocale.es].filter((k) => !perLocale.en.has(k))
  if (onlyEn.length || onlyEs.length) {
    for (const k of onlyEn) console.error(`  missing from Spanish: ${k}`)
    for (const k of onlyEs) console.error(`  only in Spanish: ${k}`)
    process.exit(1)
  }

  // ── The tenant's full page set ─────────────────────────────────────────
  // `SiteTenant.pages` is what makes the page set a DATUM: a tenant does not
  // inherit `/pricing/` or the blog by existing. So it has to name every
  // canonical route this tenant publishes, not only the ones this fixture
  // carries copy for.
  //
  // The blog and the changelog are in that second group, and they are here for
  // the reason D-18 gives: their entries are 1Platform's, they stay in the
  // website's content collections, and a new tenant simply does not have them.
  // Their route still belongs on the list, or the site cannot tell "this tenant
  // has a blog" from "this tenant has an empty one".
  const blogRoutes = readdirSync('src/content/blog/en')
    .filter((f) => f.endsWith('.md'))
    .map((f) => `/blog/${f.replace(/\.md$/, '')}/`)
    .sort()

  const publishedRoutes = [
    ...new Set([
      ...Object.values(ROUTE_OF).filter((r) => r.startsWith('/') && !NOT_PUBLISHED.has(r)),
      '/blog/',
      '/changelog/',
      ...blogRoutes,
    ]),
  ].sort()

  const fixture = {
    // Named so the seed cannot be pointed at the wrong tenant by accident.
    tenant_slug: slug,
    // In the exact spelling `SiteTenant.pages` wants, so the manifest and the
    // content cannot disagree about the page set.
    published_routes: publishedRoutes,
    locales: ['en', 'es'],
    default_locale: 'en',
    documents: documents.sort((a, b) =>
      a.route === b.route ? a.locale.localeCompare(b.locale) : a.route.localeCompare(b.route),
    ),
  }

  console.log(
    `catalogues: ${onDisk.length}  documents: ${documents.length}  ` +
      `keys: ${perLocale.en.size} per locale (${totalKeys} total)  ` +
      `published routes: ${fixture.published_routes.length} ` +
      `(${fixture.published_routes.length - blogRoutes.length} pages + ` +
      `${blogRoutes.length} posts)`,
  )

  if (checkOnly) {
    console.log('check only — nothing written')
    return
  }

  writeFileSync(out, JSON.stringify(fixture, null, 2) + '\n')
  console.log(`wrote ${out}`)
}

main()
