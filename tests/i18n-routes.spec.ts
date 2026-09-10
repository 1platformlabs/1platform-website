import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { ES_PATHS, movedEsPaths } from '../src/i18n/routes';
import { publishedPages, publishedRoutes, servedHead, servedText } from './helpers/served';

/**
 * The Spanish tree publishes Spanish slugs, and four separate things have to
 * agree about that: the route map, the pages the site actually answers with,
 * the sitemap's language pairing, and the 301s in the serving contract.
 *
 * Each of them fails silently on its own. A map entry with no page behind it
 * builds green and 404s in production. A page whose old address has no 301
 * builds green and throws away every link and every ranking that address had.
 * A sitemap alternate naming a URL that is not in the sitemap is invisible
 * until Search Console reports it weeks later. So each pairing is asserted
 * here, against the running site rather than against the source.
 *
 * ── Why this file stopped reading `dist/` ──────────────────────────────────
 * It used to say "against the built artefact", and while every page was a file
 * that was the honest thing to do: the tree on disk was byte-for-byte what
 * production served, so `existsSync(dist/es/nosotros/index.html)` really did
 * mean "that address answers".
 *
 * The Node adapter ended that. The build now emits `dist/client` (assets plus
 * the seventeen blog pages that are still prerendered) and `dist/server` (the
 * code that renders everything else on demand), so a page is no longer a file
 * and `existsSync` no longer answers the question this file is asking. Worse
 * than failing, it would half-succeed: the blog pairs would still be found on
 * disk and the fifteen page pairs would not, which is a probe that reports on
 * a sample it never chose. The pages are therefore fetched from the server —
 * the same process production runs — and the enumeration comes from the served
 * sitemap, which is generated from the real route table.
 *
 * Two checks deliberately did NOT move. The blog-pairing test reads
 * `src/content/blog/**` because its subject is the collection's frontmatter,
 * which was never a build output; and the `.htaccess` test reads a file in the
 * repo because its subject is the edge configuration that ships to cPanel.
 */

const HTACCESS = 'deploy/cpanel/htaccess/landing.htaccess';

function frontmatter(file: string, field: string): string | null {
  return new RegExp(`^${field}:\\s*"?([^"\\n]+)"?`, 'm').exec(readFileSync(file, 'utf8'))?.[1] ?? null;
}

test('the map is a bijection and both sides of every pair answer', async () => {
  const offences: string[] = [];
  const seen = new Set<string>();

  for (const [canonical, translated] of Object.entries(ES_PATHS)) {
    if (seen.has(translated)) offences.push(`${translated} is claimed by two canonical paths`);
    seen.add(translated);

    // `existsSync(dist/<path>/index.html)` used to stand for "this address
    // answers". Now it is asked directly: a 200 from the server is the same
    // claim, made against the thing that serves it rather than a file that
    // happened to be next to it.
    const [en, es] = await Promise.all([servedHead(canonical), servedHead(translated)]);
    if (en.status !== 200) offences.push(`${canonical} — no English page (HTTP ${en.status})`);
    if (es.status !== 200) offences.push(`${translated} — no Spanish page (HTTP ${es.status})`);
  }

  expect(offences, offences.join('\n')).toEqual([]);
  expect(Object.keys(ES_PATHS).length).toBeGreaterThan(20);
});

/**
 * The blog half of the map is a second copy of a fact the collection already
 * holds — posts are paired by `translationKey`, not by slug. The copy exists
 * because `@astrojs/sitemap` cannot read frontmatter, and it is safe only for
 * as long as this test keeps the two honest.
 *
 * This one still reads the repo, and should: its subject is the source of
 * truth in `src/content/blog/**`, not anything the build produced.
 */
test('every blog pair in the map is the pair the collection declares', () => {
  const keyBySlug = (locale: 'en' | 'es') => {
    const dir = join('src', 'content', 'blog', locale);
    const map = new Map<string, string>();
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md')) continue;
      const key = frontmatter(join(dir, name), 'translationKey');
      expect(key, `${locale}/${name} has no translationKey`).not.toBeNull();
      map.set(name.replace(/\.md$/, ''), key!);
    }
    return map;
  };

  const en = keyBySlug('en');
  const es = keyBySlug('es');

  // Floor, and it counts POSTS because posts are what this test enumerates.
  // A `readdirSync` that comes back short — a moved content root, a filter
  // that stopped matching — leaves every list below empty and every assertion
  // green, which is the one outcome that must be impossible. The map itself
  // supplies the expected count, so the floor scales with the site instead of
  // becoming a number somebody has to remember to raise.
  const blogPairs = Object.keys(ES_PATHS).filter((p) => p.startsWith('/blog/')).length;
  expect(blogPairs, 'the route map declares no blog pairs — nothing would be compared').toBeGreaterThan(5);
  expect(en.size, `only ${en.size} English posts found for ${blogPairs} mapped pairs — broken probe, not a pass`)
    .toBeGreaterThanOrEqual(blogPairs);
  expect(es.size, `only ${es.size} Spanish posts found for ${blogPairs} mapped pairs — broken probe, not a pass`)
    .toBeGreaterThanOrEqual(blogPairs);

  const offences: string[] = [];

  for (const [canonical, translated] of Object.entries(ES_PATHS)) {
    if (!canonical.startsWith('/blog/')) continue;
    const enSlug = canonical.slice('/blog/'.length, -1);
    const esSlug = translated.slice('/es/blog/'.length, -1);

    if (!en.has(enSlug)) offences.push(`${canonical} — no English post with that slug`);
    else if (!es.has(esSlug)) offences.push(`${translated} — no Spanish post with that slug`);
    else if (en.get(enSlug) !== es.get(esSlug)) {
      offences.push(
        `${canonical} ↔ ${translated} — the map pairs them, the collection does not ` +
          `(${en.get(enSlug)} vs ${es.get(esSlug)})`,
      );
    }
  }

  expect(offences, offences.join('\n')).toEqual([]);

  // Both directions: a Spanish post the map never names would publish a URL
  // with no 301 behind its old address.
  const mapped = new Set(
    Object.values(ES_PATHS)
      .filter((p) => p.startsWith('/es/blog/'))
      .map((p) => p.slice('/es/blog/'.length, -1)),
  );
  const unmapped = [...es.keys()].filter((slug) => !mapped.has(slug));
  expect(unmapped, `Spanish posts absent from the route map: ${unmapped.join(', ')}`).toEqual([]);
});

/**
 * Every address that moved answers, points at its new one, and is not indexable.
 *
 * ── What "not indexable" means now, and why the assertion changed shape ────
 * Under the static build these addresses were PAGES: Astro emitted a stub at
 * each one carrying a meta-refresh, `<meta name="robots" content="noindex">`
 * and a canonical at the target. All three were substitutes for the 301 a
 * static host could not issue, and this test read them out of the stub's HTML.
 *
 * The server issues the real 301 (measured: `/es/about/` → `301`,
 * `location: /es/nosotros/`, empty body), so the stub is gone and with it the
 * `noindex` this test used to grep for. That is the epic closing a live defect,
 * not a regression — Google treats a meta-refresh as a weaker and slower signal
 * than a 301, and non-browser clients do not follow it at all, so the old
 * address really was spending ranking it should have been passing on.
 *
 * The honest replacement is not "drop the clause". `noindex` on a stub and a
 * 301 are two ways of saying the same thing — this address is not a page, do
 * not rank it, the target is the one — so the clause is asserted through the
 * mechanism that now carries it:
 *
 *   1. the status is exactly 301, not 200. A 200 here is the failure the old
 *      `noindex` existed to prevent: a live document at the old address,
 *      competing with its own target.
 *   2. `Location` names the new address exactly, as the meta-refresh's `url=`
 *      and the stub's canonical both used to.
 *   3. the response carries no indexable document — nothing for a crawler to
 *      read even if it ignored the status.
 *   4. the sitemap does not list the old address, because a sitemap entry is
 *      an explicit request to index and would contradict all three above.
 */
test('every address that moved answers, points at its new one, and is not indexable', async () => {
  const moved = movedEsPaths();
  const paths = Object.keys(moved);

  // Floor on MOVES — the unit this test loops over. `movedEsPaths()` is derived
  // from the map, so a map that failed to load would hand back `{}` and the
  // loop below would assert nothing at all, in green.
  expect(paths.length, `only ${paths.length} moved addresses to check — a broken derivation, not a pass`)
    .toBeGreaterThan(20);

  const sitemap = await servedText('/sitemap-0.xml');
  const listed = new Set(
    [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname),
  );
  expect(listed.size, 'the sitemap listed nothing — the indexability half of this test would be vacuous')
    .toBeGreaterThan(45);

  const offences: string[] = [];

  for (const [from, to] of Object.entries(moved)) {
    const res = await servedHead(from);

    if (res.status === 404) {
      offences.push(`${from} — 404: an address that used to answer stopped answering`);
      continue;
    }
    if (res.status !== 301) {
      offences.push(`${from} — HTTP ${res.status}, expected a 301 to ${to}`);
    } else if (res.location !== to) {
      offences.push(`${from} — 301 points at ${res.location}, expected ${to}`);
    }

    if (/<html|<title|<body[\s>]/i.test(res.body)) {
      offences.push(`${from} — the response carries a document a crawler could index`);
    }

    if (listed.has(from)) {
      offences.push(`${from} — the sitemap asks Google to index it, so it competes with ${to}`);
    }
  }

  expect(offences, offences.join('\n')).toEqual([]);
});

/**
 * The app now issues the 301 itself; this is the edge's copy of the same
 * contract.
 *
 * The comment here used to read "the stub is the fallback; the 301 is the
 * contract", which described a static build that could not redirect: Astro's
 * meta-refresh stub was all the app could offer and the `.htaccess` carried
 * the only real 301. The server changed which half is authoritative — the
 * previous test measures a genuine 301 coming out of the app — but it did not
 * make this file irrelevant, because `deploy/cpanel/htaccess/landing.htaccess`
 * is what the cPanel deploy hands to Apache, in front of (and independently
 * of) the Node process. Two contracts that disagree send the same address to
 * two different places depending on which one answers first, so both are
 * asserted against the same map.
 *
 * This one stays on disk on purpose: the subject is a deploy artefact in the
 * repo, not a page. There is nothing at localhost to fetch it from.
 */
test('the serving contract carries a 301 for every address that moved', () => {
  const htaccess = readFileSync(HTACCESS, 'utf8');
  const rules = new Map<string, string>();
  for (const [, from, to] of htaccess.matchAll(
    /^\s*RedirectMatch\s+301\s+"\^([^$"]+)\$"\s+(\S+)\s*$/gm,
  )) {
    rules.set(from, to);
  }

  const offences: string[] = [];
  for (const [from, to] of Object.entries(movedEsPaths())) {
    if (!rules.has(from)) offences.push(`${from} — no 301 in the serving contract`);
    else if (rules.get(from) !== to) offences.push(`${from} — 301 goes to ${rules.get(from)}, expected ${to}`);
  }

  // And nothing extra: a rule for an address that did not move would send a
  // live page somewhere else.
  for (const from of rules.keys()) {
    if (!Object.hasOwn(movedEsPaths(), from)) offences.push(`${from} — 301 for an address that did not move`);
  }

  expect(offences, offences.join('\n')).toEqual([]);
  expect(rules.size).toBe(Object.keys(ES_PATHS).length);
});

test('every sitemap alternate names a URL the sitemap itself lists', async () => {
  // Fetched, not read off disk. The sitemap is still emitted as a file today,
  // but reading it there would assert about an artefact rather than about what
  // Google is handed — and once it becomes per-tenant it is the response, not
  // the file, that differs.
  const xml = await servedText('/sitemap-0.xml');
  const listed = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  const alternates = [...xml.matchAll(/<xhtml:link[^>]+href="([^"]+)"/g)].map((m) => m[1]);

  const dangling = [...new Set(alternates.filter((href) => !listed.has(href)))];
  expect(dangling, `alternates pointing at URLs the sitemap does not list:\n${dangling.join('\n')}`)
    .toEqual([]);

  // Floor: the pairing is hand-rolled in astro.config.mjs because the
  // integration cannot do it once the slugs differ, so an empty result here
  // would mean it silently stopped emitting rather than that all is well.
  // Measured on the served sitemap: 52 URLs, 104 alternates (two per URL).
  expect(alternates.length).toBeGreaterThan(80);
  expect(listed.size).toBeGreaterThan(45);
});

test('no published page still links to an address that moved', async () => {
  const moved = new Set(Object.keys(movedEsPaths()));
  expect(moved.size, 'no moved addresses were derived — the scan below would look for nothing')
    .toBeGreaterThan(20);

  // The walk over `dist/**/index.html` is gone with the files it walked. This
  // enumerates the pages the site publishes and reads each one's HTML from the
  // server, which is both the same population and a stricter one: the old walk
  // also picked up artefacts nobody could reach, and it would now find only the
  // seventeen prerendered blog pages while reporting on "every page".
  const pages = await publishedPages();

  // The old test had to skip the stubs — each stub linked to its own target, by
  // design — because they were files in the tree it walked. There are no stubs
  // now: a moved address answers 301 and is not published, so it cannot appear
  // here at all. Asserted rather than assumed, because if one ever did come back
  // as a page the skip would have hidden exactly that.
  const published = new Set(await publishedRoutes());
  const stillPublished = [...moved].filter((p) => published.has(p));
  expect(stillPublished, `moved addresses are being published as pages: ${stillPublished.join(', ')}`)
    .toEqual([]);

  const offences: string[] = [];
  for (const { route, html } of pages) {
    const text = html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/g, ' ');
    for (const m of text.matchAll(/href="(\/[^"#?]*\/)"/g)) {
      if (moved.has(m[1])) offences.push(`${route} still links to ${m[1]}`);
    }
  }

  expect([...new Set(offences)], offences.join('\n')).toEqual([]);

  // Floor, and note the UNIT changed with the subject: it used to count every
  // `index.html` in the static tree (100 of them — pages, redirect stubs, the
  // 404) and now counts published PAGES, of which the sitemap lists 52. The
  // threshold is deliberately left where it was: 52 clears it, and anything
  // that drops this scan back to the seventeen still-prerendered pages fails
  // loudly instead of passing on a sample.
  expect(pages.length, 'no pages fetched — the crawl went stale').toBeGreaterThan(45);
});
