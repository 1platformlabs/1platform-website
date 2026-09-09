import { expect, test } from '@playwright/test';
import { translateToEs } from '../src/i18n/routes';
import {
  publishedPages,
  publishedPagesByLocale,
  publishedRoutes,
  servedHead,
  servedHtml,
  servedText,
} from './helpers/served';

/**
 * Assertions about the artefact the reader actually receives.
 *
 * These used to read `dist/` and walk it for `index.html` files, and the
 * justification was honest at the time: every page was a file, so the tree on
 * disk was byte-for-byte the tree production served, and walking it measured
 * the deployed thing rather than a simulation of it.
 *
 * The Node adapter ended that. The build now emits `dist/client` (assets plus
 * the handful of pages that are still prerendered) and `dist/server` (the code
 * that renders everything else on demand), so a page is no longer a file and
 * `dist/` is no longer the site. Keeping the walker and repointing it at
 * `dist/client` would have been the worst outcome available: it would have
 * found a fraction of the pages, and every "for every page" assertion below
 * would have gone on passing over that fraction, silently, forever. A
 * neighbouring spec was measured doing exactly that — 98 pages before, 16
 * after, green throughout.
 *
 * So the subject moved and the spec moved with it. Pages come from
 * `tests/helpers/served.ts`, which enumerates them from the served sitemap and
 * fetches each one over HTTP. Nothing here was relaxed to make that work: what
 * these tests assert about language, hreflang, canonicals, feeds and the shape
 * of the two trees means exactly what it meant when it was read off disk, and
 * in three places it now means MORE (see the notes on redirects, hreflang
 * targets and feed items). The build and the server are produced by the shared
 * webServer in `playwright.config.ts`.
 *
 * One consequence worth stating: the fetches happen at test time, not at
 * import time. Nothing may be computed at module scope any more — module scope
 * runs before the server is listening — so each test does its own enumeration.
 */

/** The Spanish tree, minus the one page that is allowed to name providers. */
const PRIVACY_ES = '/es/privacidad/';

test('no page renders an unresolved key or placeholder', async () => {
  // Catalogue parity is enforced elsewhere, not re-checked here — but not
  // where an earlier version of this comment said. It used to be a
  // `src/i18n` assertion that threw during the build; that stopped being true
  // for the same reason the file-level comment above moved this whole spec
  // off `dist/`: with `output: 'server'` and no prerendered route, `astro
  // build` never executes a page module, so nothing at module scope in
  // `src/i18n` runs at build time any more (see `src/i18n/index.ts`, which
  // documents the move in full). The guarantee didn't disappear, it moved: by
  // the type of `defineMessages` at compile time, by the API's write path
  // (`SitePageService.assert_content_parity`, which refuses to persist an
  // out-of-parity tenant catalogue) for the copy tenants actually serve, and
  // by `tests/i18n-parity.spec.ts` in CI for the repo catalogues this site
  // falls back to under `SITE_MANIFEST_SOURCE=repo`. What none of those three
  // catch is a key that exists but was called without its variables:
  // `t('blog.readingTime')` with no `n` renders the literal "{n}" onto the
  // page. That is only visible in the output, which is only where this looks.
  //
  // The floor lives in `publishedRoutes`: an enumeration that finds fewer than
  // 40 pages fails there rather than letting this loop pass over nothing.
  const offenders: string[] = [];

  for (const { route, html } of await publishedPages()) {
    // Scripts and styles are stripped first. Minified JS is full of `${n}`
    // template literals, and matching those would make this fail on every page
    // for a reason that has nothing to do with copy — a test that cries wolf on
    // all 52 pages gets deleted rather than read.
    const body = html
      .slice(html.indexOf('<body'))
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '');

    for (const [placeholder] of body.matchAll(/\{(n|author|year|label|category|language)\}/g)) {
      offenders.push(`${route}: rendered ${placeholder}`);
    }
    // A dotted key rendered as visible text means a t() call leaked its
    // argument instead of its value.
    for (const [, key] of body.matchAll(/>\s*((?:nav|footer|blog|changelog|cta)\.[a-z.]+)\s*</gi)) {
      offenders.push(`${route}: rendered key "${key}"`);
    }
  }

  expect(offenders, offenders.join('\n')).toEqual([]);
});

test('every English page has a Spanish counterpart', async () => {
  // The counterpart is not "the same path under /es/": the Spanish tree
  // publishes Spanish slugs, so the address comes from the route map. Asking
  // the map rather than reproducing it here is the point — a copy of the map
  // inside its own guard would agree with itself while both were wrong.
  //
  // Two exclusions used to be spelled out here and no longer need to be. The
  // 404 was one: it is not a published address, and the sitemap never listed
  // it. Redirect stubs were the other — a stub is an address, not a page, and
  // asking for a Spanish twin of a retired English URL demanded something
  // nothing could satisfy. Under the adapter a retirement is a real 301 with no
  // document at all, so it cannot appear in this set by construction. That is
  // strictly better than the old `http-equiv="refresh"` sniff, which had to
  // recognise a stub by its body.
  const { en, all } = await publishedPagesByLocale();
  const published = new Set(all.map((p) => p.route));

  const missing = en.map((p) => p.route).filter((route) => !published.has(translateToEs(route)));
  expect(missing, `Spanish pages missing: ${missing.join(', ')}`).toEqual([]);

  // Floor against a stale enumeration, not an inventory, and it counts PAGES —
  // the unit that would shrink if the probe broke. There are 26 real English
  // pages; the floor sits below that and still goes red if the walk finds a
  // handful. `publishedPagesByLocale` only guarantees this side is non-empty,
  // which is not enough: sixteen prerendered blog posts would clear that.
  expect(
    en.length,
    `only ${en.length} English pages were enumerated — a broken probe is not a pass`,
  ).toBeGreaterThan(20);
});

test('every page declares its language and every hreflang is reciprocal', async () => {
  const byCanonical = new Map<string, Record<string, string>>();

  for (const { route, html } of await publishedPages()) {
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    const alts = Object.fromEntries(
      [...html.matchAll(/<link rel="alternate" hreflang="([a-z-]+)" href="([^"]+)"/g)].map(
        (m) => [m[1], m[2]],
      ),
    );
    if (canonical && Object.keys(alts).length) byCanonical.set(canonical, alts);

    const lang = /<html lang="([a-z]+)"/.exec(html)?.[1];
    if (lang) {
      const expected = route === '/es/' || route.startsWith('/es/') ? 'es' : 'en';
      expect(lang, `${route} declares lang="${lang}"`).toBe(expected);
    }
  }

  const broken: string[] = [];
  for (const [url, alts] of byCanonical) {
    for (const [code, href] of Object.entries(alts)) {
      if (code === 'x-default') continue;
      const target = byCanonical.get(href);
      if (!target) broken.push(`${url} -> ${href} (target declares no alternates)`);
      else if (!Object.values(target).includes(url)) broken.push(`${url} -> ${href} not returned`);
    }
  }

  expect(broken, broken.join('\n')).toEqual([]);
  // A floor against the selector going stale, not a page count. It was 60 when
  // the tree held 74 indexable pages; retiring /features/, the three
  // comparisons and the twelve blog-category pages took that to 54, and the
  // adapter's move of the remaining retirements out of the page set takes it to
  // 52 — every published page carries both a canonical and its alternates.
  // Kept well clear of the real number in both directions: a broken selector
  // still reports ~0 and still goes red.
  expect(byCanonical.size).toBeGreaterThan(45);
});

test('no hreflang points at a page that is not published', async () => {
  // This is what makes "redirect to a translation" safe: the auto-detect script
  // navigates to whatever hreflang="es" says, so a link to a page that does not
  // exist would be a 404 delivered by our own script.
  //
  // "Not built" used to mean "no index.html on disk", which a redirect stub
  // satisfied — an hreflang aimed at a retired URL passed. The published set is
  // the honest replacement and a stricter one: it holds real pages only, so an
  // hreflang pointing at a 301 is now caught instead of excused.
  const routes = new Set(await publishedRoutes());
  const missing: string[] = [];
  let declared = 0;

  for (const { route, html } of await publishedPages()) {
    for (const [, href] of html.matchAll(
      /<link rel="alternate" hreflang="[a-z-]+" href="https:\/\/1platform\.pro([^"]*)"/g,
    )) {
      declared++;
      if (!routes.has(href)) missing.push(`${route} -> ${href}`);
    }
  }

  expect(missing, missing.join('\n')).toEqual([]);
  // The derived set is hreflang links, not pages, so it gets its own floor:
  // every page emits en + es + x-default, which is 156 across the 52 pages. A
  // regex that stops matching would leave `missing` empty and this test green
  // over nothing.
  expect(
    declared,
    `only ${declared} hreflang links were found across the site — a broken probe is not a pass`,
  ).toBeGreaterThan(100);
});

test('Spanish pages carry Spanish Open Graph locales', async () => {
  const html = await servedHtml('/es/precios/');
  expect(html).toContain('<meta property="og:locale" content="es_ES">');
  expect(html).toContain('<meta property="og:locale:alternate" content="en_US">');

  const en = await servedHtml('/pricing/');
  expect(en).toContain('<meta property="og:locale" content="en_US">');
  expect(en).toContain('<meta property="og:locale:alternate" content="es_ES">');
});

test('Spanish pages canonicalise to themselves', async () => {
  const html = await servedHtml('/es/precios/');
  expect(html).toContain('<link rel="canonical" href="https://1platform.pro/es/precios/">');
});

test('the sitemap exists and carries alternates', async () => {
  // @astrojs/sitemap validates its own options and, when they are wrong, logs a
  // warning and emits nothing while the build stays green. A missing sitemap is
  // therefore invisible unless something asserts it is there.
  //
  // It is still written to disk, under `dist/client`, but checking the file
  // would now check the wrong thing: the whole suite reads the sitemap to find
  // out what the site publishes, so what matters is that the SERVER hands it
  // over. A file that exists and 404s would leave every other test in this file
  // enumerating nothing.
  const index = await servedHead('/sitemap-index.xml');
  expect(index.status, 'sitemap-index.xml was not served').toBe(200);
  expect(index.body, 'sitemap-index.xml does not point at sitemap-0.xml').toContain(
    'https://1platform.pro/sitemap-0.xml',
  );

  const body = await servedText('/sitemap-0.xml');
  const alternates = [...body.matchAll(/xhtml:link/g)].length;
  expect(alternates).toBeGreaterThan(100);
  expect(body).toContain('https://1platform.pro/es/precios/');
});

test('neither RSS feed carries the other language', async () => {
  // The feeds are endpoints now rather than files, which is why they are read
  // over HTTP: `@astrojs/rss` runs per request, so a feed that throws is a 500
  // a reader would see and a file check could never have found.
  const es = await servedText('/es/rss.xml');
  const en = await servedText('/rss.xml');

  const items = (xml: string) => [...xml.matchAll(/<link>([^<]+)<\/link>/g)].map((m) => m[1]);
  // The channel's own <link> is dropped; item links are what must not cross.
  // Note that this only removes it from the English feed: the Spanish channel
  // links to `/es/`, not to the bare root, and so survives the filter. That is
  // harmless — it satisfies the same predicate the Spanish items must satisfy —
  // and it is left in deliberately rather than filtered away, because removing
  // an element from an `every` can only make this weaker.
  const esItems = items(es).filter((l) => l !== 'https://1platform.pro/');
  const enItems = items(en).filter((l) => l !== 'https://1platform.pro/');

  expect(esItems.every((l) => l.includes('/es/')), esItems.join('\n')).toBe(true);
  expect(enItems.every((l) => !l.includes('/es/')), enItems.join('\n')).toBe(true);

  // The floor was `> 0`, which a feed reduced to its channel element would have
  // cleared. Tie it to the published set instead: a feed carrying fewer links
  // than the blog has posts is either a broken feed or a broken read, and
  // either way it is not a pass.
  const routes = await publishedRoutes();
  const enPosts = routes.filter((r) => r.startsWith('/blog/') && r !== '/blog/');
  const esPosts = routes.filter((r) => r.startsWith('/es/blog/') && r !== '/es/blog/');
  expect(enPosts.length, 'no English blog posts were enumerated').toBeGreaterThan(5);
  expect(esPosts.length, 'no Spanish blog posts were enumerated').toBeGreaterThan(5);
  expect(
    enItems.length,
    `the English feed lists ${enItems.length} links for ${enPosts.length} published posts`,
  ).toBeGreaterThanOrEqual(enPosts.length);
  expect(
    esItems.length,
    `the Spanish feed lists ${esItems.length} links for ${esPosts.length} published posts`,
  ).toBeGreaterThanOrEqual(esPosts.length);

  expect(es).toContain('<title>Blog de 1Platform</title>');
});

test('no provider name appears under /es/ outside the privacy policy', async () => {
  const banned =
    /openai|anthropic|\bmigo\b|tributax|pixabay|pexels|valueserp|publisuites|nicho\.ai|\bstripe\b|\bresend\b|\bmeta[ -](ads|business|platforms)\b|\bfacebook\b|\binstagram\b/i;

  const { es } = await publishedPagesByLocale();
  const scanned = es.filter((p) => !p.route.startsWith(PRIVACY_ES));

  const leaks = scanned.filter((p) => banned.test(p.html)).map((p) => p.route);
  expect(leaks, `provider names leaked into: ${leaks.join(', ')}`).toEqual([]);

  // The scanned set is narrower than "every page", so it carries its own floor.
  // There are 25 Spanish pages once the privacy policy is set aside; a probe
  // that returned two of them would report no leaks and look identical to a
  // clean site.
  expect(
    scanned.length,
    `only ${scanned.length} Spanish pages were scanned for provider names — a broken probe is not a pass`,
  ).toBeGreaterThan(20);

  // The privacy policy must still contain them — the disclosure is the point,
  // and a test that only checks for absence would pass on an empty page.
  const privacy = await servedHtml(PRIVACY_ES);
  expect(banned.test(privacy)).toBe(true);
});

test('none of the shell English survives in the Spanish tree', async () => {
  const englishOnly = [
    'Get Started Free',
    'Keep reading',
    'On this page',
    'Skip to main content',
    'View Documentation',
    'All rights reserved',
    'Subscribe via RSS',
    'Other topics',
    'min read',
    'Last updated',
  ];

  const { es } = await publishedPagesByLocale();
  const found: string[] = [];
  for (const { route, html } of es) {
    for (const phrase of englishOnly) {
      if (html.includes(phrase)) found.push(`${route}: "${phrase}"`);
    }
  }

  expect(found, found.join('\n')).toEqual([]);
  // Same reasoning as the provider scan: this walks only the Spanish half, so
  // the half gets its own floor. `publishedPagesByLocale` guarantees it is
  // non-empty, which the sixteen still-prerendered blog pages would satisfy on
  // their own while the other ten pages went unread.
  expect(
    es.length,
    `only ${es.length} Spanish pages were enumerated — a broken probe is not a pass`,
  ).toBeGreaterThan(20);
});

test('dates render in the language of the page', async () => {
  const en = await servedHtml('/changelog/');
  const es = await servedHtml('/es/novedades/');

  expect(en).toMatch(/(January|March|April|May) \d{1,2}, \d{4}/);
  expect(es).toMatch(/\d{1,2} de (enero|marzo|abril|mayo) de \d{4}/);
  // And the English format must not survive into Spanish.
  expect(es).not.toMatch(/(January|March|April|May) \d{1,2}, \d{4}/);
});

test('the English tree kept every address it had before the epic', async () => {
  // Compatibility is the hardest requirement here: these English URLs are
  // already indexed and none of them may stop answering.
  //
  // "Kept" used to be checked as "there is still an index.html at that path",
  // which conflated two different things — a page, and a redirect stub standing
  // in for a page that had been retired. Under the adapter the retirements are
  // real 301s with no document, so the disk check would now fail on five of
  // these addresses that are perfectly healthy.
  //
  // The requirement was never "there is a file"; it was "a reader who follows
  // an indexed link lands somewhere real". So each address must either BE a
  // published page, or redirect to one — and the redirect's target is resolved
  // against the published set rather than taken on trust, which the old stub
  // check could not do at all.
  const published = new Set(await publishedRoutes());

  const legacy = [
    '/',
    '/pricing/',
    '/features/',
    '/solutions/',
    '/solutions/online-store/',
    '/solutions/website/',
    '/solutions/whitelabel/',
    '/solutions/content/',
    '/solutions/deliveries/',
    '/solutions/ads/',
    '/payments-invoicing/',
    '/for-agencies/',
    '/for-developers/',
    '/about/',
    '/contact/',
    '/terms/',
    '/privacy/',
    '/cookies/',
    '/blog/',
    '/changelog/',
    '/compare/1platform-vs-wp-auto-pro/',
    '/compare/1platform-vs-ai-writing-tools/',
    '/compare/1platform-vs-custom-integration/',
  ];

  const gone: string[] = [];
  for (const address of legacy) {
    if (published.has(address)) continue;

    const { status, location } = await servedHead(address);
    if (status !== 301 && status !== 308) {
      gone.push(`${address}: is not published and answered ${status} instead of a redirect`);
      continue;
    }
    // A 301 to a page that is itself gone is the same broken link with an extra
    // hop, so the target is checked against the published set too.
    const target = location ? new URL(location, 'https://1platform.pro').pathname : null;
    if (!target || !published.has(target)) {
      gone.push(`${address}: redirects to ${target ?? 'nowhere'}, which is not a published page`);
    }
  }

  expect(gone, gone.join('\n')).toEqual([]);
});
