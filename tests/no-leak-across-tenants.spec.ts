import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

import { repoTenants } from '../src/data/site-tenants'
import { localesOf, makeLocalizePath } from '../src/lib/site-locale'
import { getWithHost } from './helpers/http-host'

/**
 * The provider and cross-brand scan, over the SERVED HTML of EVERY tenant.
 *
 * WHY THIS EXISTS — D-5, LAYER 2
 * ------------------------------
 * The ecosystem's one critical rule is that a provider's name never reaches a
 * client-facing surface, and `scripts/check-tells.sh` rule 10 enforced it by
 * scanning the SOURCE TREE. F3 moved the copy out of that tree: a tenant's words
 * now come from `1platform-api`, so a source scan has nothing to look at and
 * stays green over an empty question.
 *
 * The write path in the API is layer 1 and is the only one that can REFUSE. This
 * is layer 2, the backstop: it reads what a visitor actually receives.
 *
 * WHAT IT ADDS OVER `i18n-build.spec.ts`
 * --------------------------------------
 * That one scans the Spanish tree of ONE tenant. This one derives its surface
 * from the PADRÓN — every tenant the manifest knows, every route that tenant
 * publishes, every locale it declares — so a tenant added tomorrow is scanned
 * without anybody remembering to add it. That derivation is the point: a guard
 * with a hand-written list of surfaces is a guard that goes blind the day the
 * estate grows, silently, in the direction of more exposure.
 *
 * ⚠️ AN EMPTY SURFACE IS AN ERROR, NOT A PASS.
 * Every floor below exists because the failure mode of a scanner is not a false
 * alarm — it is scanning nothing and reporting a clean site. This suite has
 * already been bitten by that shape: a spec that walked 98 pages walked 16 after
 * the server conversion and stayed green.
 */

/** The one blocklist, read out of the guard so the two can never drift. */
function bannedProviders(): RegExp {
  const guard = readFileSync('scripts/check-tells.sh', 'utf8')
  const m = guard.match(/grep -rniE '([^']+)' \$SRC \$PROSE/)
  expect(m, 'could not read rule 10 out of check-tells.sh').not.toBeNull()
  return new RegExp(m![1], 'i')
}

const PORT = process.env.PLAYWRIGHT_PORT ?? '4321'
const BASE = `http://127.0.0.1:${PORT}`

/**
 * Every (tenant, locale, url) this estate publishes.
 *
 * Derived from `SiteTenant.pages` rather than from the sitemap, and that is not
 * a style choice: a tenant with `indexable: false` answers 404 for its sitemap
 * on purpose, so a sitemap-driven enumerator returns ZERO routes for exactly the
 * tenant most worth scanning — a provisional brand — and reports it clean.
 */
function surface(): { slug: string; host: string; locale: string; url: string }[] {
  const out: { slug: string; host: string; locale: string; url: string }[] = []
  for (const tenant of repoTenants()) {
    const localise = makeLocalizePath(tenant)
    for (const locale of localesOf(tenant)) {
      for (const route of tenant.pages) {
        out.push({ slug: tenant.slug, host: tenant.domain, locale, url: localise(route, locale) })
      }
    }
  }
  return out
}

/** Routes where naming a processor is the legally required disclosure. */
const DISCLOSURE = /\/(privacy|privacidad)\//

test('the surface is derived from the padrón, and it is not empty', () => {
  const pages = surface()
  const tenants = new Set(pages.map((p) => p.slug))

  expect(tenants.size, 'every tenant in the manifest must contribute pages').toBeGreaterThanOrEqual(2)
  expect(pages.length, 'an empty surface is a broken probe, not a clean estate').toBeGreaterThan(40)

  // Each tenant individually, because one tenant with 52 pages and one with
  // zero would satisfy the total above while scanning nothing for the second.
  for (const tenant of repoTenants()) {
    const mine = pages.filter((p) => p.slug === tenant.slug)
    expect(
      mine.length,
      `tenant ${tenant.slug} contributed no pages — its manifest publishes ${tenant.pages.length} route(s)`,
    ).toBeGreaterThan(0)
  }
})

test('no provider name reaches any tenant, on any page, in any language', async () => {
  const banned = bannedProviders()

  // The control the whole test rests on: a pattern that rotted into matching
  // nothing would report every page clean, forever.
  expect(banned.test('we bill through Str' + 'ipe'), 'the blocklist must still catch a seeded name').toBe(true)

  const leaks: string[] = []
  let scanned = 0

  for (const page of surface()) {
    if (DISCLOSURE.test(page.url)) continue
    const res = await getWithHost(BASE + page.url, page.host)
    // A route the manifest publishes must be servable. A 404 here is a defect
    // in its own right, and skipping it silently would shrink the surface.
    expect(res.status, `${page.host}${page.url} is published but answered ${res.status}`).toBe(200)
    scanned += 1
    if (banned.test(res.body)) leaks.push(`${page.host}${page.url}`)
  }

  expect(scanned, 'nothing was scanned — a broken probe is not a pass').toBeGreaterThan(40)
  expect(leaks, `a provider name is being served on: ${leaks.join(', ')}`).toEqual([])
})

test('the disclosure pages still name their processors', async () => {
  // The other half, and the reason the exclusion above is safe: a test that only
  // checks for absence passes just as well on a blank page. The privacy policy
  // is where naming them is required, so it is where their presence is asserted.
  const banned = bannedProviders()
  const privacy = surface().filter((p) => DISCLOSURE.test(p.url))
  expect(privacy.length, 'the platform tenant should publish a privacy policy').toBeGreaterThan(0)

  for (const page of privacy) {
    const res = await getWithHost(BASE + page.url, page.host)
    expect(res.status).toBe(200)
    expect(
      banned.test(res.body),
      `${page.host}${page.url} names no processor — the disclosure is the point of that page`,
    ).toBe(true)
  }
})

test('no tenant serves another tenant’s domain', async () => {
  // The cross-brand direction, which the provider blocklist cannot see: every
  // name here is legitimate somewhere, and wrong everywhere else. This is the
  // count F3 drove from 19 to 0 on the clinic's home; asserting it across the
  // whole estate is what stops it climbing back one page at a time.
  const tenants = repoTenants()

  // Plain substring matching, NOT a regex built from the domain.
  //
  // The first version compiled `new RegExp(domain.replace(/\./g, '\\.'))`, and
  // CodeQL was right to call it incomplete sanitisation: escaping only dots
  // leaves every other metacharacter — a backslash above all — to change what
  // the pattern means. The values here come from our own manifest, so it was
  // not exploitable; it was still a pattern that goes wrong the day a domain
  // arrives from somewhere else.
  //
  // A hostname has no case and no metacharacters worth honouring, so
  // `includes` on a lowercased body answers the same question with nothing to
  // escape.
  const foreign = new Map<string, string[]>()
  for (const t of tenants) {
    foreign.set(
      t.slug,
      tenants.filter((o) => o.slug !== t.slug).map((o) => o.domain.toLowerCase()),
    )
  }
  // Floor: with one tenant there is nothing to cross, and every assertion below
  // would pass vacuously.
  expect(tenants.length, 'a cross-tenant test needs at least two tenants').toBeGreaterThanOrEqual(2)

  const leaks: string[] = []
  let scanned = 0

  for (const page of surface()) {
    const others = foreign.get(page.slug) ?? []
    if (others.length === 0) continue
    const res = await getWithHost(BASE + page.url, page.host)
    expect(res.status).toBe(200)
    scanned += 1
    const body = res.body.toLowerCase()
    for (const domain of others) {
      if (body.includes(domain)) leaks.push(`${page.host}${page.url} contains ${domain}`)
    }
  }

  expect(scanned, 'nothing was scanned').toBeGreaterThan(40)
  expect(leaks, `one tenant is serving another's domain:\n${leaks.slice(0, 10).join('\n')}`).toEqual([])
})

test('a tenant page never carries the ownership token of another', async () => {
  // The narrowest and worst of the cross-tenant leaks: a Search Console token
  // served under somebody else's hostname grants ownership of THEIR domain to
  // whoever holds the property. It used to be a file in `public/`, answered 200
  // to every Host including hosts that resolve to no tenant at all.
  const tokens = repoTenants()
    .map((t) => t.google_site_verification)
    .filter((v): v is string => Boolean(v))
  expect(tokens.length, 'at least one tenant should declare a token, or this asserts nothing').toBeGreaterThan(0)

  for (const tenant of repoTenants()) {
    for (const token of tokens) {
      const res = await getWithHost(`${BASE}/${token}.html`, tenant.domain)
      const mine = tenant.google_site_verification === token
      expect(
        res.status,
        `${tenant.domain} ${mine ? 'should' : 'must NOT'} be served ${token}.html`,
      ).toBe(mine ? 200 : 404)
    }
  }
})
