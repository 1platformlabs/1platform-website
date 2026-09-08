import { test, expect } from '@playwright/test'

import { getWithHost } from './helpers/http-host'

/**
 * D-17 — every surface a tenant serves belongs to THAT tenant.
 *
 * WHAT WAS MEASURED, BEFORE THE FIX
 * ---------------------------------
 * Two files lived in `public/`, which the Node adapter copies into
 * `dist/client/` and serves from the STATIC handler — before the application
 * runs, so no middleware could gate them. Probed against the real server build,
 * one file, three hosts:
 *
 *   Host: 1platform.pro           /robots.txt -> 200, 1156 bytes
 *   Host: clinicas.1platform.dev  /robots.txt -> 200, 1156 bytes   (identical)
 *   Host: inventado.example       /robots.txt -> 200, 1156 bytes   (this host 404s on every page)
 *
 * and the same three answers, 53 bytes each, for
 * `/google1dd96c2b1cc5f482.html` — 1Platform's Search Console ownership proof.
 *
 * The robots leak is an SEO defect: a client's domain published the platform's
 * sitemap as its own, and a tenant whose domain is provisional was told
 * `Allow: /`. The token leak runs the other way from the usual one — it is not
 * our data escaping, it is our IDENTITY being lent out. Search Console's file
 * method verifies ownership of a property by fetching exactly that path from
 * exactly that host, so anyone pointing a domain at this container got the
 * platform's proof served under their hostname.
 *
 * Both are now ROUTES, which is the only place a tenant rule can run. This file
 * is what stops them from drifting back to files, or to a "sensible default".
 *
 * WHY EVERY CHECK COMES IN A PAIR
 * -------------------------------
 * Absence is also what a broken probe returns: a wrong Host, a 404 body, an
 * empty string. So every negative assertion here is paired with the POSITIVE
 * control on the host where the thing MUST appear. A scan with no positive side
 * reads exactly like a clean site.
 *
 * ⚠️ `getWithHost`, never `fetch`. `Host` is a forbidden header name for
 * `fetch` and is dropped SILENTLY — the request goes out with the origin's own
 * host. On this server `Host` selects the TENANT, so a multi-tenant file
 * written with `fetch` tests one tenant twice and passes. See helpers/http-host.
 */

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4321)
const BASE = `http://localhost:${PORT}`

/** The platform. Indexable, bilingual, declares a Search Console token. */
const PLATFORM_HOST = '1platform.pro'
/** The clinic. `indexable: false`, one page, no docs/app destinations, NO token. */
const CLINIC_HOST = 'clinicas.1platform.dev'
/** A host the manifest maps to nothing at all — the third row of the probe above. */
const UNKNOWN_HOST = 'inventado.example'

/** The platform's real Search Console token, as the manifest declares it. */
const TOKEN = 'google1dd96c2b1cc5f482'
const TOKEN_PATH = `/${TOKEN}.html`
/** The exact body Google's file method expects. No trailing newline — see below. */
const TOKEN_BODY = `google-site-verification: ${TOKEN}.html`

const serve = (host: string, path: string) => getWithHost(BASE + path, host)

// ─────────────────────────────────────────────────────────────────────────────
// robots.txt
// ─────────────────────────────────────────────────────────────────────────────

test('robots.txt is the TENANT\'s policy, not one file for everybody', async () => {
  const platform = await serve(PLATFORM_HOST, '/robots.txt')
  const clinic = await serve(CLINIC_HOST, '/robots.txt')

  // Both tenants get a crawl policy. If either of these is not 200 every
  // comparison below is between two error bodies and proves nothing.
  expect(platform.status, 'the platform must still publish robots.txt').toBe(200)
  expect(clinic.status, 'the clinic must still publish robots.txt').toBe(200)

  // THE measurement. Before the fix these were byte-identical, 1156 bytes each.
  expect(
    clinic.body,
    'the two tenants received the SAME robots.txt — that is the pre-fix defect ' +
      'exactly: one file in public/, served by the static handler, ahead of any ' +
      'middleware that could have varied it per tenant.',
  ).not.toBe(platform.body)

  // The platform: indexable, and nominates its OWN sitemap.
  expect(platform.body).toContain('Sitemap: https://1platform.pro/sitemap-index.xml')
  expect(platform.body).toMatch(/^User-agent: \*\nAllow: \/$/m)

  // The clinic: `indexable: false`, so it asks not to be crawled at all…
  expect(clinic.body).toMatch(/^User-agent: \*\nDisallow: \/$/m)
  expect(
    clinic.body,
    'a non-indexable tenant must not say Allow: / — that is what the shared ' +
      'file told the clinic before this was a route',
  ).not.toContain('Allow: /')

  // …and publishes NO sitemap line. Handing a crawler a list of URLs while
  // asking politely that they not be indexed is a contradiction crawlers
  // resolve in their own favour.
  expect(
    clinic.body,
    'the clinic robots.txt nominates a sitemap. Its own sitemap answers 404, so ' +
      'the only URL list it could name is somebody else\'s.',
  ).not.toMatch(/^Sitemap:/mi)

  // And nowhere in it does the platform's domain appear. This is the specific
  // byte that leaked: `Sitemap: https://1platform.pro/sitemap-index.xml` served
  // under a client's hostname is an instruction to index US from THEIR domain.
  expect(
    clinic.body,
    'the clinic robots.txt names the platform apex — the leak that made this a route',
  ).not.toContain('1platform.pro')

  // The half of the policy that is NOT tenant data: the AI-crawler block list
  // is a product decision and must be identical for both. Without this the
  // test above ("the bodies differ") could be satisfied by a robots.txt that
  // silently dropped the block list for one tenant.
  for (const body of [platform.body, clinic.body]) {
    expect(body).toContain('User-agent: GPTBot')
    expect(body).toContain('User-agent: ClaudeBot')
  }
})

test('robots.txt for a host that resolves to NO tenant is 404, not a crawl policy', async () => {
  const unknown = await serve(UNKNOWN_HOST, '/robots.txt')

  // Measured at 200 with 1156 bytes before the fix — a host this site answers
  // 404 for on every single page still received the platform's crawl policy.
  expect(
    unknown.status,
    'an unrouted host got a robots.txt. It was 200/1156 bytes before robots ' +
      'became a route; a file in public/ has no idea which host asked.',
  ).toBe(404)
  expect(unknown.body).not.toContain('User-agent')
  expect(unknown.body).not.toContain('Sitemap:')

  // POSITIVE CONTROL: the same path, same server, a host that DOES resolve.
  // Without this a server that 404s everything — a bad build, a wrong port —
  // would read as a pass.
  const platform = await serve(PLATFORM_HOST, '/robots.txt')
  expect(
    platform.status,
    'CONTROL: /robots.txt must still be 200 for a real tenant, or the 404 above ' +
      'is measuring a broken server rather than a working gate',
  ).toBe(200)
})

// ─────────────────────────────────────────────────────────────────────────────
// Search Console ownership verification
// ─────────────────────────────────────────────────────────────────────────────

test('the ownership token is served to the tenant that DECLARES it', async () => {
  const res = await serve(PLATFORM_HOST, TOKEN_PATH)

  expect(res.status, 'the platform must keep proving it owns its own domain').toBe(200)

  // Byte-exact, and the reason is not tidiness: Google fetches this path and
  // compares the body. An extra newline is a different body.
  expect(res.body).toBe(TOKEN_BODY)
  expect(
    Buffer.byteLength(res.body, 'utf8'),
    'the verification body must be exactly the 53 bytes of the file it replaces',
  ).toBe(53)
  expect(
    res.body.endsWith('\n'),
    'a trailing newline changes the body Google compares against and can fail ' +
      'the verification — the file this route replaces had none',
  ).toBe(false)
})

test('the ownership token is NOT served to a tenant that does not declare it', async () => {
  // The clinic declares `google_site_verification: null`. Absent is the answer;
  // falling back to the platform's token would hand ownership of the clinic's
  // domain to whoever holds the 1Platform Search Console property.
  const clinic = await serve(CLINIC_HOST, TOKEN_PATH)
  expect(
    clinic.status,
    'the clinic served the platform\'s ownership proof under its own hostname — ' +
      'measured at 200/53 bytes before this became a route',
  ).toBe(404)
  // The 404 is the site's rendered 404 PAGE, ~20 KB of real HTML, so "the body
  // is small" would be the wrong assertion. What must be true is that the token
  // is nowhere in it.
  expect(clinic.body, 'the token leaked into the clinic\'s 404 body').not.toContain(TOKEN)
  expect(clinic.body).not.toContain('google-site-verification')

  // A host that resolves to nothing gets nothing either — the third row of the
  // original probe, and the worst one: any domain pointed at this container.
  const unknown = await serve(UNKNOWN_HOST, TOKEN_PATH)
  expect(unknown.status, 'an unrouted host received the platform\'s ownership proof').toBe(404)
  expect(unknown.body).not.toContain(TOKEN)
})

test('the token route compares the TOKEN, it does not serve any *.html', async () => {
  // THE control that gives the test above its meaning. `[token].html` matches
  // any single-segment `*.html` at the root, so "the clinic gets 404" would
  // also be true of a route that answered 404 for everyone including the
  // platform. This asks the DECLARING host for a token it does not declare: it
  // must be refused, while the real token (previous test) is served.
  const wrong = await serve(PLATFORM_HOST, '/googleWRONG.html')
  expect(
    wrong.status,
    'the platform host served a *.html address that is not its declared token — ' +
      'the route is matching the SHAPE of a verification file, not the token, ' +
      'which would let anyone mint a proof by guessing a filename',
  ).toBe(404)
  expect(wrong.body).not.toContain('google-site-verification')
})

// ─────────────────────────────────────────────────────────────────────────────
// What the page itself tells a crawler
// ─────────────────────────────────────────────────────────────────────────────

test('a non-indexable tenant puts noindex on its pages, and an indexable one does not', async () => {
  const platform = await serve(PLATFORM_HOST, '/')
  const clinic = await serve(CLINIC_HOST, '/')

  // Premise: both are real rendered pages. A scan over a 10-byte error body
  // finds no `robots` meta either, and would read as a pass on the platform
  // side while proving nothing on the clinic's.
  expect(platform.status).toBe(200)
  expect(clinic.status).toBe(200)
  expect(clinic.body.length, 'the clinic home is too small to be a real page').toBeGreaterThan(5_000)
  expect(platform.body.length).toBeGreaterThan(5_000)

  // This was a REAL defect, not a hypothetical: `BaseLayout`'s `noIndex` prop
  // had a default of `false` and ZERO callers in the whole tree, while the
  // manifest's comment claimed `indexable: false` "puts noindex on every page".
  // So a provisional domain blocked exactly one thing — its sitemap 404'd — and
  // stayed perfectly crawlable. Reading the comment instead of the code is how
  // it gets indexed.
  expect(
    clinic.body,
    'the clinic is indexable: false and its pages carry no robots meta — the ' +
      'prop that was supposed to do this had no callers',
  ).toMatch(/<meta\s+name="robots"\s+content="noindex,\s*nofollow"\s*\/?>/)

  // POSITIVE CONTROL, and it is the one that matters most here: if the meta
  // were emitted unconditionally the assertion above would pass while the
  // PLATFORM deindexed itself. That is a worse outcome than the defect.
  expect(
    platform.body,
    'the platform emitted noindex on its own home page — this would deindex the ' +
      'live site, which is a far worse failure than the one being fixed',
  ).not.toMatch(/<meta\s+name="robots"[^>]*noindex/)
})

test('a tenant only advertises a sitemap it actually serves', async () => {
  const platform = await serve(PLATFORM_HOST, '/')
  const clinic = await serve(CLINIC_HOST, '/')

  expect(platform.body, 'the platform must keep advertising its sitemap').toContain(
    '<link rel="sitemap" href="/sitemap-index.xml">',
  )
  expect(
    clinic.body,
    'every page of the clinic announces a sitemap that answers 404 — a dangling ' +
      'rel="sitemap" is a crawler instruction to fetch something that is not there',
  ).not.toContain('rel="sitemap"')

  // The fact the rule is derived from, measured rather than assumed. Without
  // these two the test above is a style rule; with them it is a consistency
  // check between what the head announces and what the server answers.
  const platformSitemap = await serve(PLATFORM_HOST, '/sitemap-index.xml')
  const clinicSitemap = await serve(CLINIC_HOST, '/sitemap-index.xml')
  expect(platformSitemap.status, 'CONTROL: the advertised sitemap must exist').toBe(200)
  expect(
    clinicSitemap.status,
    'the clinic now serves a sitemap, so the head SHOULD advertise it — this ' +
      'test is stale, not the code',
  ).toBe(404)
})

// ─────────────────────────────────────────────────────────────────────────────
// D-7 — a destination the tenant does not have is not rendered
// ─────────────────────────────────────────────────────────────────────────────

test('a tenant with no app/docs destination renders no link to the platform\'s (D-7)', async () => {
  const clinic = await serve(CLINIC_HOST, '/')
  expect(clinic.status).toBe(200)

  // The clinic's manifest has `destinations: { docs: null, app: null, ... }`.
  // The rule is that the ELEMENT disappears — not an empty href, not a disabled
  // button, and above all not the platform's own URL as a "sensible default".
  // Two of these leaked the day they were written, because they sit on pages
  // EVERY tenant renders: the commerce CTA on the home and the docs link on the
  // 404 page.
  expect(
    clinic.body,
    'the clinic home links to the platform\'s dashboard — a fallback destination ' +
      'is the leak this rule exists to stop, wearing the costume of a default',
  ).not.toContain('app.1platform.pro')
  expect(clinic.body, 'the clinic home links to the platform\'s developer docs').not.toContain(
    'developer.1platform.pro',
  )

  // The other half of D-7: "no destination" must not leave a dead anchor behind.
  //
  // ⚠️ REGEX TRAP, paid for in this run: /<a(?![^>]*href)/ also matches
  // `<article`, `<aside`, `<a` inside any tag name starting with "a". Measured
  // on this exact body: the naive form reports 4 hits (all of them `<article`),
  // the anchored form reports 0. The `[\s>]` is what makes it an <a> element.
  const deadAnchors = clinic.body.match(/<a[\s>](?![^>]*href)/g) ?? []
  expect(
    deadAnchors.length,
    `${deadAnchors.length} <a> elements were rendered without an href. D-7 says ` +
      `the element is not rendered at all when the destination is absent.`,
  ).toBe(0)
})

test('CONTROL: the platform DOES render its own destinations', async () => {
  // Without this the D-7 test above is satisfied by a page that renders no
  // links at all — a build error, a wrong host, an empty body. It also pins the
  // other direction: `appUrl` returning null for everybody would look like
  // perfect isolation.
  const platform = await serve(PLATFORM_HOST, '/')
  expect(platform.status).toBe(200)
  expect(
    platform.body,
    'the platform home no longer links to its own dashboard — the destination ' +
      'helper is returning null for everyone, which makes the D-7 test vacuous',
  ).toContain('app.1platform.pro')

  const deadAnchors = platform.body.match(/<a[\s>](?![^>]*href)/g) ?? []
  expect(deadAnchors.length, 'the platform rendered anchors without an href').toBe(0)
})
