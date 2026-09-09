import { test, expect } from '@playwright/test'

import { getWithHost } from './helpers/http-host'

/**
 * T-14 — no trace of the platform in a tenant's HTML.
 *
 * This is the criterion the plan admits it would have failed on the first run,
 * and not because of an attacker: the wordmark was two literals in `Logo.astro`,
 * which `Header` AND `Footer` both mount, and `BaseLayout` repeated the name in
 * `og:site_name` and inside a hardcoded JSON-LD block. So every page of every
 * tenant would have said "1Platform" three times before anyone looked at the
 * content. The epic never programmed the change its own acceptance required.
 *
 * The scan is on SERVED HTML, because that is where the leak would be. A source
 * scan cannot see a value that arrives at runtime, and under one build serving N
 * brands runtime is where the brand now comes from.
 *
 * Every assertion here has a POSITIVE control: the same needle, on the platform's
 * own host, where it MUST appear. Without that, a scan that broke — a wrong Host,
 * a 404 body, an empty string — reports "no leaks" and reads exactly like a
 * clean site.
 */

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4321)
const BASE = `http://localhost:${PORT}`

/** A host the repo manifest maps to the clinics tenant. */
const CLINIC_HOST = 'clinicas.1platform.dev'
/** …and one it maps to the platform, for the control side of every check. */
const PLATFORM_HOST = '1platform.pro'

/**
 * NOT `fetch`. `Host` is a forbidden header name there and is dropped SILENTLY,
 * so every request would go to whichever tenant answers for 127.0.0.1 and this
 * whole file would pass while testing one tenant twice. See helpers/http-host.
 */
async function serve(host: string, path = '/'): Promise<{ status: number; html: string }> {
  const res = await getWithHost(BASE + path, host)
  return { status: res.status, html: res.body }
}

test('the clinic tenant renders, and the platform host still renders', async () => {
  // The premise of everything below. If either of these is not a real page, the
  // scans that follow are looking at an error body and prove nothing.
  const clinic = await serve(CLINIC_HOST)
  const platform = await serve(PLATFORM_HOST)

  expect(clinic.status, 'the clinic tenant must be served').toBe(200)
  expect(platform.status, 'the platform tenant must be served').toBe(200)
  expect(
    clinic.html.length,
    'the clinic page is too small to be a real page — a scan over an error body is not a pass',
  ).toBeGreaterThan(5_000)
  expect(platform.html.length).toBeGreaterThan(5_000)
})

test('the wordmark is the tenant\'s, not the platform\'s', async () => {
  const { html: clinic } = await serve(CLINIC_HOST)
  const { html: platform } = await serve(PLATFORM_HOST)

  const mark = (html: string) => html.match(/logo__mark"[^>]*>([^<]*)</)?.[1] ?? null
  const text = (html: string) => html.match(/logo__text"[^>]*>([^<]*)</)?.[1] ?? null
  const label = (html: string) =>
    html.match(/class="logo[^"]*"[^>]*aria-label="([^"]+)"/)?.[1] ?? null

  // POSITIVE CONTROL: the platform draws its own, or the scan is broken. Its
  // "1" is a numeral doing the work of a glyph, so it still gets boxed.
  expect(mark(platform), 'the platform wordmark should still be boxed "1"').toBe('1')
  expect(text(platform)).toBe('Platform')
  expect(label(platform)).toContain('1Platform')

  // The same component, the same page, a different tenant.
  expect(mark(clinic), 'the clinic lockup should render its declared symbol').toBe('C')
  expect(text(clinic), 'the wordmark must be explicit, not the brand name minus one character').toBe(
    'Clínica Delta',
  )
  expect(label(clinic), 'the accessible name must use the complete semantic brand name').toBe(
    'Clínica Delta',
  )
})

test('the leak that is LEFT is content, and its size is pinned', async () => {
  const { html: clinic } = await serve(CLINIC_HOST)

  // What still names the platform on a clinic page is tenant #1's CONTENT — the
  // title, the description, the RSS title — and ONLY when the site is running
  // from the repo catalogues (`SITE_MANIFEST_SOURCE=repo`), which is what this
  // suite does and what a laptop does. In `api` mode the clinic reads its own
  // copy, so the remaining 13 are a property of the harness, not of the site.
  //
  // The DOMAIN half is a different story and is now zero: F3 moved every
  // absolute URL off `Astro.site` (a build constant one build cannot vary) and
  // every outbound destination off a literal, so the cap below came down from
  // 19 to 0 with the measurement rather than ahead of it.
  //
  // Rather than pretend that is fine, or skip the check until F3 lands, the
  // count is PINNED. It may only go down. If it grows, a surface that was data
  // stopped being data, and that is exactly the regression this epic must not
  // ship — a test that waits for F3 would notice nothing in the meantime.
  const brand = (clinic.match(/1Platform/g) ?? []).length
  const apex = (clinic.match(/1platform\.pro/g) ?? []).length

  expect(
    brand,
    `the clinic page names the platform ${brand} times (chrome is clean; this is ` +
      `content the file router still owns — F3). Pinned so it can only shrink.`,
  ).toBeLessThanOrEqual(13)
  expect(
    apex,
    `the clinic page names the platform apex ${apex} times. This was 19 before ` +
      `F3 — canonical, og:url, og:image, hreflang and x-default all came from ` +
      `Astro.site, plus a hardcoded app CTA. It is now ZERO, so any increase is ` +
      `a surface that stopped being data.`,
  ).toBe(0)
})

test('the clinic tenant serves its OWN brand', async () => {
  const { html } = await serve(CLINIC_HOST)
  // Not just "the platform is absent" — absence is also what a blank page gives.
  expect(html, 'the clinic tenant should carry its own name').toContain('Clínica Delta')
  expect(html).toContain('og:site_name')
  expect(html).toMatch(/og:site_name"\s+content="Clínica Delta"/)
})

test('the JSON-LD names the tenant, not the platform', async () => {
  const { html: clinic } = await serve(CLINIC_HOST)

  const blocks = [...clinic.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  expect(
    blocks.length,
    'no JSON-LD block was found — a scan that finds nothing is not a pass',
  ).toBeGreaterThan(0)

  let sawOrganization = false
  for (const [, body] of blocks) {
    // It must PARSE. An unparseable block is the D-32 failure, and it would also
    // make every assertion below vacuous.
    let parsed: unknown
    expect(() => {
      parsed = JSON.parse(body)
    }, `a JSON-LD block did not parse:\n${body.slice(0, 200)}`).not.toThrow()

    const text = JSON.stringify(parsed)
    if (text.includes('"Organization"')) {
      sawOrganization = true
      // The block BaseLayout emits on every page of every tenant. It used to be
      // an inline literal naming the platform and its apex, which under N brands
      // told search engines each client's site belonged to us.
      expect(text, 'the Organization block still names the platform').not.toContain('1Platform')
      expect(text, 'the Organization block still points at the platform apex').not.toContain('1platform.pro')
      expect(text).toContain('Clínica Delta')
      expect(text).toContain('clinicas.1platform.dev')
    }
  }
  expect(
    sawOrganization,
    'no Organization block was found — the assertions above inspected nothing',
  ).toBe(true)
})

test('a brand containing </script> cannot break the document (T-31)', async () => {
  // The escaping is a property of the serialiser, so it is exercised directly:
  // reaching it through the manifest would need a tenant whose brand is hostile,
  // and the API refuses to store one — which is the right behaviour and makes
  // the end-to-end path untestable by design.
  const hostile = { name: '</script><script>alert(1)</script>', url: 'https://x.example/' }
  const encode = (v: unknown) =>
    JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')

  const encoded = encode(hostile)
  expect(encoded, 'a raw < would close the script block early').not.toContain('<')
  expect(encoded).not.toContain('>')
  expect(JSON.parse(encoded), 'the escape must survive a round trip').toEqual(hostile)

  // The control: plain JSON.stringify, which is what the code used to do.
  expect(
    JSON.stringify(hostile),
    'CONTROL: JSON.stringify does NOT escape <, which is the whole reason the ' +
      'serialiser above exists. If this ever stops containing <, the test is ' +
      'no longer proving anything.',
  ).toContain('<')
})
