import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Twenty URLs were retired, and every one of them was indexable and listed in
 * the live sitemap when it went. A retirement has three separate jobs and each
 * fails silently on its own:
 *
 *  1. the old URL must not start answering 404 — it has inbound links and
 *     accumulated ranking that a deletion throws away;
 *  2. it must not stay in the sitemap, or the site keeps nominating pages that
 *     exist only to bounce a crawler;
 *  3. it must not stay indexable, or the duplicate it was retired FOR goes on
 *     competing with its own replacement.
 *
 * `i18n-build.spec.ts` already asserts the English tree never loses a path, and
 * it passes here — because Astro's `redirects` emits a stub at each address,
 * that guard reads a redirect and a real page identically. This is the test
 * that tells them apart.
 *
 * Both locales are listed for every retirement on purpose: the Spanish-twin
 * guard in `i18n-build.spec.ts` fails if only one side is retired, and a reader
 * who saved a `/es/` link is owed the same landing as one who saved the English.
 */

const DIST = 'dist';

const RETIRED: Record<string, string> = {
  // A smaller duplicate of /solutions/: twelve of its twenty-one headings
  // appeared there verbatim and no page body on the site linked it.
  '/features/': '/solutions/',
  '/es/features/': '/es/soluciones/',

  // A closed island — these linked only to each other.
  '/compare/1platform-vs-ai-writing-tools/': '/solutions/',
  '/compare/1platform-vs-custom-integration/': '/solutions/',
  '/compare/1platform-vs-wp-auto-pro/': '/solutions/',
  '/es/compare/1platform-vs-ai-writing-tools/': '/es/soluciones/',
  '/es/compare/1platform-vs-custom-integration/': '/es/soluciones/',
  '/es/compare/1platform-vs-wp-auto-pro/': '/es/soluciones/',

  // Three of its four cards were the target page said again; the one claim it
  // owned alone (custom domain) moved there with it.
  '/solutions/website/': '/solutions/content/',
  '/es/solutions/website/': '/es/soluciones/sitio-web-y-contenido/',

  // One or two posts each and no prose of their own.
  '/blog/category/ai-content/': '/blog/',
  '/blog/category/api-tutorials/': '/blog/',
  '/blog/category/ecommerce/': '/blog/',
  '/blog/category/payments-invoicing/': '/blog/',
  '/blog/category/product-updates/': '/blog/',
  '/blog/category/seo-automation/': '/blog/',
  '/es/blog/category/ai-content/': '/es/blog/',
  '/es/blog/category/api-tutorials/': '/es/blog/',
  '/es/blog/category/ecommerce/': '/es/blog/',
  '/es/blog/category/payments-invoicing/': '/es/blog/',
  '/es/blog/category/product-updates/': '/es/blog/',
  '/es/blog/category/seo-automation/': '/es/blog/',
};

test('every retired URL still resolves, and points at its replacement', () => {
  const offences: string[] = [];

  for (const [from, to] of Object.entries(RETIRED)) {
    const file = join(DIST, from, 'index.html');
    if (!existsSync(file)) {
      offences.push(`${from} — 404: the redirect stub was not built`);
      continue;
    }
    const html = readFileSync(file, 'utf8');

    const target = /url=([^"]+)"/.exec(html)?.[1];
    if (target !== to) offences.push(`${from} — redirects to ${target}, expected ${to}`);

    const canonical = /rel="canonical" href="https:\/\/1platform\.pro([^"]*)"/.exec(html)?.[1];
    if (canonical !== to) offences.push(`${from} — canonical is ${canonical}, expected ${to}`);

    if (!/<meta name="robots"[^>]*noindex/i.test(html))
      offences.push(`${from} — indexable again, so it competes with ${to}`);
  }

  expect(offences, offences.join('\n')).toEqual([]);
});

test('no retired URL is nominated by the sitemap', () => {
  const sitemap = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8');
  const listed = Object.keys(RETIRED).filter((r) =>
    sitemap.includes(`<loc>https://1platform.pro${r}</loc>`),
  );
  expect(listed, `retired URLs still in the sitemap:\n${listed.join('\n')}`).toEqual([]);

  // Floor. A sitemap that stopped being generated, or a <loc> format change,
  // would make the filter above match nothing and report a clean retirement
  // forever.
  expect(
    (sitemap.match(/<loc>/g) ?? []).length,
    'the sitemap stopped listing pages — the selector went stale',
  ).toBeGreaterThan(45);
});

test('no page still links to a retired URL', () => {
  const offences: string[] = [];

  // Walk every built page rather than the retired list, so a link added later
  // to any of these addresses is caught wherever it appears.
  const pages: string[] = [];
  (function walk(d: string) {
    for (const n of readdirSync(d)) {
      const f = join(d, n);
      if (statSync(f).isDirectory()) walk(f);
      else if (n === 'index.html') pages.push(f);
    }
  })(DIST);

  const retired = new Set(Object.keys(RETIRED));
  for (const file of pages) {
    const rel = '/' + file.slice(DIST.length + 1).replace(/index\.html$/, '');
    if (retired.has(rel)) continue; // the stub's own link to its target
    const html = readFileSync(file, 'utf8').replace(
      /<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/g,
      ' ',
    );
    for (const m of html.matchAll(/href="(\/[^"#?]*\/)"/g)) {
      if (retired.has(m[1])) offences.push(`${rel} still links to ${m[1]}`);
    }
  }

  expect([...new Set(offences)], offences.join('\n')).toEqual([]);
  expect(pages.length, 'no pages walked — the crawl went stale').toBeGreaterThan(45);
});
