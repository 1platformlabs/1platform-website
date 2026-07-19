import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Assertions about the built artefact.
 *
 * These read `dist/` rather than driving a browser, because what is being
 * checked is a property of the thing that gets deployed: which files exist,
 * what the crawler will read, and whether either language leaked into the
 * other. The build itself is produced by the shared webServer.
 */

const DIST = 'dist';

function pagesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === 'index.html') out.push(full);
    }
  };
  walk(dir);
  return out;
}

const englishPages = () =>
  pagesUnder(DIST).filter((p) => !relative(DIST, p).startsWith('es/'));
const spanishPages = () => pagesUnder(join(DIST, 'es'));

test('no page renders an unresolved key or placeholder', () => {
  // Catalogue parity itself is enforced twice before this runs — by the type of
  // defineMessages, and by an assertion in src/i18n that throws during the
  // build — so it is not re-checked here. What that cannot catch is a key that
  // exists but was called without its variables: `t('blog.readingTime')` with
  // no `n` renders the literal "{n}" onto the page. That is only visible in the
  // output, which is where this looks.
  const offenders: string[] = [];

  for (const file of pagesUnder(DIST)) {
    const html = readFileSync(file, 'utf8');
    // Scripts and styles are stripped first. Minified JS is full of `${n}`
    // template literals, and matching those would make this fail on every page
    // for a reason that has nothing to do with copy — a test that cries wolf on
    // all 72 pages gets deleted rather than read.
    const body = html
      .slice(html.indexOf('<body'))
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '');

    for (const [placeholder] of body.matchAll(/\{(n|author|year|label|category|language)\}/g)) {
      offenders.push(`${relative(DIST, file)}: rendered ${placeholder}`);
    }
    // A dotted key rendered as visible text means a t() call leaked its
    // argument instead of its value.
    for (const [, key] of body.matchAll(/>\s*((?:nav|footer|blog|changelog|cta)\.[a-z.]+)\s*</gi)) {
      offenders.push(`${relative(DIST, file)}: rendered key "${key}"`);
    }
  }

  expect(offenders, offenders.join('\n')).toEqual([]);
});

test('every English page has a Spanish counterpart', () => {
  // The 404 is the one deliberate exception: the origin never serves it as an
  // error document, so a Spanish copy would be a file nobody can reach.
  const expected = englishPages()
    .map((p) => relative(DIST, p))
    .filter((p) => !p.startsWith('why-1platform/'));

  const missing = expected.filter((p) => !existsSync(join(DIST, 'es', p)));
  expect(missing, `Spanish pages missing: ${missing.join(', ')}`).toEqual([]);
  expect(expected.length).toBeGreaterThan(30);
});

test('every page declares its language and every hreflang is reciprocal', () => {
  const byCanonical = new Map<string, Record<string, string>>();

  for (const file of pagesUnder(DIST)) {
    const html = readFileSync(file, 'utf8');
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    const alts = Object.fromEntries(
      [...html.matchAll(/<link rel="alternate" hreflang="([a-z-]+)" href="([^"]+)"/g)].map(
        (m) => [m[1], m[2]],
      ),
    );
    if (canonical && Object.keys(alts).length) byCanonical.set(canonical, alts);

    const lang = /<html lang="([a-z]+)"/.exec(html)?.[1];
    if (lang) {
      const expected = relative(DIST, file).startsWith('es/') ? 'es' : 'en';
      expect(lang, `${relative(DIST, file)} declares lang="${lang}"`).toBe(expected);
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
  expect(byCanonical.size).toBeGreaterThan(60);
});

test('no hreflang points at a page that was not built', () => {
  // This is what makes "redirect to a translation" safe: the auto-detect script
  // navigates to whatever hreflang="es" says, so a link to a page that does not
  // exist would be a 404 delivered by our own script.
  const missing: string[] = [];

  for (const file of pagesUnder(DIST)) {
    const html = readFileSync(file, 'utf8');
    for (const [, href] of html.matchAll(
      /<link rel="alternate" hreflang="[a-z-]+" href="https:\/\/1platform\.pro([^"]*)"/g,
    )) {
      const target = href === '/' ? join(DIST, 'index.html') : join(DIST, href, 'index.html');
      if (!existsSync(target)) missing.push(`${relative(DIST, file)} -> ${href}`);
    }
  }

  expect(missing, missing.join('\n')).toEqual([]);
});

test('Spanish pages carry Spanish Open Graph locales', () => {
  const html = readFileSync(join(DIST, 'es', 'pricing', 'index.html'), 'utf8');
  expect(html).toContain('<meta property="og:locale" content="es_ES">');
  expect(html).toContain('<meta property="og:locale:alternate" content="en_US">');

  const en = readFileSync(join(DIST, 'pricing', 'index.html'), 'utf8');
  expect(en).toContain('<meta property="og:locale" content="en_US">');
  expect(en).toContain('<meta property="og:locale:alternate" content="es_ES">');
});

test('Spanish pages canonicalise to themselves', () => {
  const html = readFileSync(join(DIST, 'es', 'pricing', 'index.html'), 'utf8');
  expect(html).toContain('<link rel="canonical" href="https://1platform.pro/es/pricing/">');
});

test('the sitemap exists and carries alternates', () => {
  // @astrojs/sitemap validates its own options and, when they are wrong, logs a
  // warning and emits nothing while the build stays green. A missing sitemap is
  // therefore invisible unless something asserts the file is there.
  const index = join(DIST, 'sitemap-index.xml');
  expect(existsSync(index), 'sitemap-index.xml was not generated').toBe(true);

  const body = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8');
  const alternates = [...body.matchAll(/xhtml:link/g)].length;
  expect(alternates).toBeGreaterThan(100);
  expect(body).toContain('https://1platform.pro/es/pricing/');
});

test('neither RSS feed carries the other language', () => {
  const es = readFileSync(join(DIST, 'es', 'rss.xml'), 'utf8');
  const en = readFileSync(join(DIST, 'rss.xml'), 'utf8');

  const items = (xml: string) => [...xml.matchAll(/<link>([^<]+)<\/link>/g)].map((m) => m[1]);
  // The channel's own <link> is the site root in both feeds; item links are
  // what must not cross.
  const esItems = items(es).filter((l) => l !== 'https://1platform.pro/');
  const enItems = items(en).filter((l) => l !== 'https://1platform.pro/');

  expect(esItems.length).toBeGreaterThan(0);
  expect(esItems.every((l) => l.includes('/es/')), esItems.join('\n')).toBe(true);
  expect(enItems.every((l) => !l.includes('/es/')), enItems.join('\n')).toBe(true);

  expect(es).toContain('<title>Blog de 1Platform</title>');
});

test('no provider name appears under /es/ outside the privacy policy', () => {
  const banned =
    /openai|anthropic|\bmigo\b|tributax|pixabay|pexels|valueserp|publisuites|nicho\.ai|\bstripe\b|\bresend\b/i;

  const leaks = spanishPages()
    .filter((p) => !relative(DIST, p).startsWith('es/privacy/'))
    .filter((p) => banned.test(readFileSync(p, 'utf8')))
    .map((p) => relative(DIST, p));

  expect(leaks, `provider names leaked into: ${leaks.join(', ')}`).toEqual([]);

  // The privacy policy must still contain them — the disclosure is the point,
  // and a test that only checks for absence would pass on an empty page.
  const privacy = readFileSync(join(DIST, 'es', 'privacy', 'index.html'), 'utf8');
  expect(banned.test(privacy)).toBe(true);
});

test('none of the shell English survives in the Spanish tree', () => {
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

  const found: string[] = [];
  for (const file of spanishPages()) {
    const html = readFileSync(file, 'utf8');
    for (const phrase of englishOnly) {
      if (html.includes(phrase)) found.push(`${relative(DIST, file)}: "${phrase}"`);
    }
  }

  expect(found, found.join('\n')).toEqual([]);
});

test('dates render in the language of the page', () => {
  const en = readFileSync(join(DIST, 'changelog', 'index.html'), 'utf8');
  const es = readFileSync(join(DIST, 'es', 'changelog', 'index.html'), 'utf8');

  expect(en).toMatch(/(January|March|April|May) \d{1,2}, \d{4}/);
  expect(es).toMatch(/\d{1,2} de (enero|marzo|abril|mayo) de \d{4}/);
  // And the English format must not survive into Spanish.
  expect(es).not.toMatch(/(January|March|April|May) \d{1,2}, \d{4}/);
});

test('the English tree kept every page it had before the epic', () => {
  // Compatibility is the hardest requirement here: the ~26 English URLs are
  // already indexed and none of them may move.
  const paths = englishPages().map((p) => relative(DIST, p).replace(/index\.html$/, ''));

  for (const expected of [
    '',
    'pricing/',
    'features/',
    'solutions/',
    'solutions/online-store/',
    'solutions/website/',
    'solutions/whitelabel/',
    'solutions/content/',
    'payments-invoicing/',
    'for-agencies/',
    'for-developers/',
    'about/',
    'contact/',
    'terms/',
    'privacy/',
    'cookies/',
    'blog/',
    'changelog/',
    'compare/1platform-vs-wp-auto-pro/',
    'compare/1platform-vs-ai-writing-tools/',
    'compare/1platform-vs-custom-integration/',
  ]) {
    expect(paths, `English URL disappeared: /${expected}`).toContain(expected);
  }
});
