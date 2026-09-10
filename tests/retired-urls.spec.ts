import { expect, test } from '@playwright/test';
import { publishedPages, publishedRoutes, servedHead } from './helpers/served';

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
 * it passes here — because a retired address still answers, that guard reads a
 * retirement and a real page identically. This is the test that tells them
 * apart.
 *
 * Both locales are listed for every retirement on purpose: the Spanish-twin
 * guard in `i18n-build.spec.ts` fails if only one side is retired, and a reader
 * who saved a `/es/` link is owed the same landing as one who saved the English.
 *
 * WHAT MOVED, AND WHY THE ASSERTIONS STILL MEAN THE SAME THING
 * -----------------------------------------------------------
 * This file used to read `dist/<route>/index.html`. That was honest while the
 * build was static: Astro's `redirects` emitted a stub HTML file at each
 * retired address, and the stub was byte-for-byte what production served — a
 * meta-refresh at the target, `noindex`, and a canonical pointing at the
 * replacement. Reading the file WAS reading the answer.
 *
 * With the Node adapter that stopped being true twice over. The stubs are no
 * longer files (there is nothing at `dist/client/features/index.html` to read),
 * and more importantly the answer itself changed: the adapter serves a real
 * **HTTP 301** with a `Location` header and an empty body. Pointing this spec
 * at `dist/client` would not have failed — it would have found no stub for any
 * retired URL and reported twenty 404s, or, had the walk been softened, gone
 * green while measuring nothing.
 *
 * So each stub assertion is re-expressed against the transport that now carries
 * the same guarantee, and none of them is weaker:
 *
 *   stub exists (not 404)      →  the address answers a redirect, not 404/200
 *   meta-refresh url === to    →  `Location` === to
 *   canonical === to           →  the redirect is PERMANENT (301/308) — in HTTP
 *                                 that IS the canonicalisation signal, and it
 *                                 is the one a crawler actually follows, which
 *                                 the stub's meta tags only approximated
 *   <meta robots noindex>      →  nothing indexable is served at the address at
 *                                 all: a 301 body is empty, so there is no
 *                                 document left to compete with the replacement
 *
 * The one thing genuinely gained is checked too: a 301 that lands on a 404 is
 * worse than no redirect, so the replacements are fetched and must be real
 * pages. The static build could not see that, because a stub pointing into the
 * void looked identical to a stub pointing at a page.
 */

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

/** 301 and 308 are the two permanent redirects. A 302/303/307 is temporary:
 *  the crawler keeps the OLD address in the index, which is exactly the
 *  duplicate-competition the retirement existed to end. */
const PERMANENT = new Set([301, 308]);

/** The list is the subject of this file, so it gets a floor of its own: gutting
 *  the map is the cheapest way to make every loop below pass over nothing. */
const MIN_RETIREMENTS = 20;

/** The site published 52 pages when the retirements landed. Anything near or
 *  below this means the enumeration broke, not that the site shrank — and a
 *  broken enumeration reports a clean retirement forever. */
const MIN_PUBLISHED_PAGES = 45;

test('every retired URL still resolves, and points at its replacement', async () => {
  const entries = Object.entries(RETIRED);
  expect(
    entries.length,
    'the retirement list shrank — entries were deleted from the map rather than un-retired, ' +
      'which silently removes them from every assertion in this file',
  ).toBeGreaterThanOrEqual(MIN_RETIREMENTS);

  const offences: string[] = [];

  const answers = await Promise.all(
    entries.map(async ([from, to]) => ({ from, to, res: await servedHead(from) })),
  );

  for (const { from, to, res } of answers) {
    if (res.status === 404) {
      offences.push(`${from} — 404: the retirement lost its redirect`);
      continue;
    }
    if (res.status === 200) {
      offences.push(`${from} — still serves a page, so it goes on competing with ${to}`);
      continue;
    }
    if (!PERMANENT.has(res.status)) {
      offences.push(
        `${from} — answers ${res.status}, not a permanent redirect: the old address stays ` +
          `indexed and keeps competing with ${to}`,
      );
      continue;
    }

    if (res.location !== to) offences.push(`${from} — redirects to ${res.location}, expected ${to}`);

    // The stub used to carry `noindex` because it WAS a document. A permanent
    // redirect has no document, so the equivalent guarantee is that no body
    // came back at all — anything here would be a page served at a retired
    // address, indexable again by the crawler that followed the link.
    if (res.body.trim() !== '')
      offences.push(
        `${from} — the redirect carries a body (${res.body.trim().length} chars), which is ` +
          `indexable content served at a retired address`,
      );
  }

  // A redirect into a 404 is worse than no redirect: the reader loses the page
  // AND the ranking. The static build could not check this, because a stub
  // pointing nowhere looked exactly like a stub pointing at a page.
  const targets = [...new Set(Object.values(RETIRED))];
  expect(
    targets.length,
    'no replacement targets were derived from the retirement map — broken probe, not a pass',
  ).toBeGreaterThan(0);

  const landings = await Promise.all(
    targets.map(async (to) => ({ to, status: (await servedHead(to)).status })),
  );
  for (const { to, status } of landings) {
    if (status !== 200) offences.push(`${to} — replacement answers ${status}, not a page`);
  }

  expect(offences, offences.join('\n')).toEqual([]);
});

test('no retired URL is nominated by the sitemap', async () => {
  // The sitemap is now read as it is SERVED rather than off disk. It is the
  // same generated file, but reading it over HTTP is what makes this guard
  // survive the pages ceasing to be prerendered — and it is the same source
  // the route enumeration below uses, so the two cannot disagree.
  const routes = await publishedRoutes();

  // Floor. A sitemap that stopped being generated, or a `<loc>` format change,
  // would make the filter below match nothing and report a clean retirement
  // forever. `publishedRoutes` already floors at 40; this is the tighter figure
  // this site actually publishes, and it counts pages — the unit that shrinks.
  expect(
    routes.length,
    'the sitemap stopped listing pages — the selector went stale',
  ).toBeGreaterThan(MIN_PUBLISHED_PAGES);

  const listed = Object.keys(RETIRED).filter((r) => routes.includes(r));
  expect(listed, `retired URLs still in the sitemap:\n${listed.join('\n')}`).toEqual([]);
});

test('no page still links to a retired URL', async () => {
  const offences: string[] = [];

  // Walk every published page rather than the retired list, so a link added
  // later to any of these addresses is caught wherever it appears.
  //
  // The walk used to recurse `dist/` and collect `index.html` files. It found
  // 98 of them, but only 52 were pages: the other 46 were redirect stubs whose
  // sole link pointed at their own target, which is why the loop below used to
  // skip them by path. There are no stubs to skip now — a retired address is a
  // 301 with no body and is absent from the sitemap — so the enumeration and
  // the set it scans are the same 52 real pages as before, minus the noise.
  const pages = await publishedPages();

  expect(
    pages.length,
    'no pages walked — the crawl went stale. A scan that reads nothing reports no offending ' +
      'links forever, which is a broken probe, not a clean site.',
  ).toBeGreaterThan(MIN_PUBLISHED_PAGES);

  const retired = new Set(Object.keys(RETIRED));
  for (const { route, html } of pages) {
    const body = html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/g, ' ');
    for (const m of body.matchAll(/href="(\/[^"#?]*\/)"/g)) {
      if (retired.has(m[1])) offences.push(`${route} still links to ${m[1]}`);
    }
  }

  expect([...new Set(offences)], offences.join('\n')).toEqual([]);
});
