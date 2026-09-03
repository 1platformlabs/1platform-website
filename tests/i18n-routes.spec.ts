import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { ES_PATHS, movedEsPaths } from '../src/i18n/routes';

/**
 * The Spanish tree publishes Spanish slugs, and four separate things have to
 * agree about that: the route map, the pages Astro builds, the sitemap's
 * language pairing, and the 301s in the serving contract.
 *
 * Each of them fails silently on its own. A map entry with no page behind it
 * builds green and 404s in production. A page whose old address has no 301
 * builds green and throws away every link and every ranking that address had.
 * A sitemap alternate naming a URL that is not in the sitemap is invisible
 * until Search Console reports it weeks later. So each pairing is asserted
 * here, against the built artefact rather than against the source.
 */

const DIST = 'dist';
const HTACCESS = 'deploy/cpanel/htaccess/landing.htaccess';

function fileFor(path: string): string {
  return join(DIST, path.slice(1), 'index.html');
}

function frontmatter(file: string, field: string): string | null {
  return new RegExp(`^${field}:\\s*"?([^"\\n]+)"?`, 'm').exec(readFileSync(file, 'utf8'))?.[1] ?? null;
}

test('the map is a bijection and both sides of every pair were built', () => {
  const offences: string[] = [];
  const seen = new Set<string>();

  for (const [canonical, translated] of Object.entries(ES_PATHS)) {
    if (seen.has(translated)) offences.push(`${translated} is claimed by two canonical paths`);
    seen.add(translated);

    if (!existsSync(fileFor(canonical))) offences.push(`${canonical} — no English page built`);
    if (!existsSync(fileFor(translated))) offences.push(`${translated} — no Spanish page built`);
  }

  expect(offences, offences.join('\n')).toEqual([]);
  expect(Object.keys(ES_PATHS).length).toBeGreaterThan(20);
});

/**
 * The blog half of the map is a second copy of a fact the collection already
 * holds — posts are paired by `translationKey`, not by slug. The copy exists
 * because `@astrojs/sitemap` cannot read frontmatter, and it is safe only for
 * as long as this test keeps the two honest.
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

test('every address that moved answers, points at its new one, and is not indexable', () => {
  const offences: string[] = [];

  for (const [from, to] of Object.entries(movedEsPaths())) {
    const file = fileFor(from);
    if (!existsSync(file)) {
      offences.push(`${from} — 404: no stub was built for an address that used to answer`);
      continue;
    }
    const html = readFileSync(file, 'utf8');

    const target = /url=([^"]+)"/.exec(html)?.[1];
    if (target !== to) offences.push(`${from} — stub points at ${target}, expected ${to}`);

    const canonical = /rel="canonical" href="https:\/\/1platform\.pro([^"]*)"/.exec(html)?.[1];
    if (canonical !== to) offences.push(`${from} — canonical is ${canonical}, expected ${to}`);

    if (!/<meta name="robots"[^>]*noindex/i.test(html))
      offences.push(`${from} — still indexable, so it competes with ${to}`);
  }

  expect(offences, offences.join('\n')).toEqual([]);
});

/**
 * The stub is the fallback; the 301 is the contract.
 *
 * Google treats a meta-refresh as a weaker and slower signal than a 301, and
 * non-browser clients do not follow it at all — so a move that shipped with
 * only the stub would quietly spend the ranking of every address it moved.
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

test('every sitemap alternate names a URL the sitemap itself lists', () => {
  const xml = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8');
  const listed = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  const alternates = [...xml.matchAll(/<xhtml:link[^>]+href="([^"]+)"/g)].map((m) => m[1]);

  const dangling = [...new Set(alternates.filter((href) => !listed.has(href)))];
  expect(dangling, `alternates pointing at URLs the sitemap does not list:\n${dangling.join('\n')}`)
    .toEqual([]);

  // Floor: the pairing is hand-rolled in astro.config.mjs because the
  // integration cannot do it once the slugs differ, so an empty result here
  // would mean it silently stopped emitting rather than that all is well.
  expect(alternates.length).toBeGreaterThan(80);
  expect(listed.size).toBeGreaterThan(45);
});

test('no built page still links to an address that moved', () => {
  const moved = new Set(Object.keys(movedEsPaths()));
  const pages: string[] = [];
  (function walk(d: string) {
    for (const n of readdirSync(d)) {
      const f = join(d, n);
      if (statSync(f).isDirectory()) walk(f);
      else if (n === 'index.html') pages.push(f);
    }
  })(DIST);

  const offences: string[] = [];
  for (const file of pages) {
    const rel = '/' + file.slice(DIST.length + 1).replace(/index\.html$/, '');
    if (moved.has(rel)) continue; // the stub's own link to its target
    const html = readFileSync(file, 'utf8').replace(
      /<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/g,
      ' ',
    );
    for (const m of html.matchAll(/href="(\/[^"#?]*\/)"/g)) {
      if (moved.has(m[1])) offences.push(`${rel} still links to ${m[1]}`);
    }
  }

  expect([...new Set(offences)], offences.join('\n')).toEqual([]);
  expect(pages.length, 'no pages walked — the crawl went stale').toBeGreaterThan(45);
});
