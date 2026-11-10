import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { repoTenantForHost } from '../src/data/site-tenants';
import {
  exportRepoContent,
  platformBlogFromFixture,
  startFakeSiteStack,
  type FakeSite,
  type FakeSiteStack,
  type FixturePost,
} from './helpers/fake-site-api';
import { getWithHost } from './helpers/http-host';

/**
 * BSM-03 · 1platform.pro reads its blog from the Core (blog-sitio-de-marca-
 * generado D-7, D-9, D-10b, D-10d), through the BUILT Node adapter and a fake
 * site API (`SITE_MANIFEST_SOURCE=api`).
 *
 * The fake API serves the sixteen posts of `src/data/blog-fixture.json` — the
 * rows the export script emits for the Core — so what is asserted here is the
 * site's reading of the Core, not of the repository. The served bytes of every
 * article are held against `tests/baseline/html/**` (D-8): moving the blog to the
 * Core must not move a character of what a reader sees.
 *
 * One site per question, because the rescue interval, the caches and the
 * budgets are per site and locale: sharing a site would make one test's miss the
 * next test's cache.
 */

const ROOT = process.cwd();
const platform = repoTenantForHost('1platform.pro')!;
const ARTICLE_ROUTES = platform.pages.filter((p) => /^\/blog\/[^/]+\/$/.test(p));
/** The manifest as F3b leaves it: `/blog/` and no article routes. */
const TRIMMED_PAGES = platform.pages.filter((p) => !ARTICLE_ROUTES.includes(p));

const fixture = JSON.parse(readFileSync(join(ROOT, 'src/data/blog-fixture.json'), 'utf8')) as { posts: FixturePost[] };
const EN = fixture.posts.filter((p) => p.locale === 'en');
const ES = fixture.posts.filter((p) => p.locale === 'es');
const TWIN_OF = (p: FixturePost) => fixture.posts.find((q) => q.translation_key === p.translation_key && q.locale !== p.locale)!;

const HOSTS = {
  platform: '1platform.pro', // slug oneplatform
  spanishDefault: 'default-es.example',
  withoutBlog: 'no-blog.example',
  coreDown: 'core-down.example',
  fresh: 'fresh.example',
  budget: 'budget.example',
  withdrawn: 'withdrawn.example',
  many: 'many.example',
} as const;

let stack: FakeSiteStack;
const blogs: Record<string, ReturnType<typeof platformBlogFromFixture>> = {};

const get = (host: string, path: string, headers: Record<string, string> = {}) =>
  getWithHost(`${stack.baseUrl}${path}`, host, headers);

const norm = (html: string) => html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
function articleCopy(html: string): string | null {
  const start = html.indexOf('<article class="article-copy"');
  if (start < 0) return null;
  const open = html.indexOf('>', start) + 1;
  return html.slice(open, html.indexOf('<div class="article-end"', open));
}
const baselineHtml = (path: string) =>
  readFileSync(join(ROOT, 'tests/baseline/html', path.replace(/^\//, ''), 'index.html'), 'utf8');
const hrefs = (html: string, selector: RegExp) => [...html.matchAll(selector)].map((m) => m[1]);
const blogPath = (locale: string, slug = '') => `${locale === 'es' ? '/es' : ''}/blog/${slug ? `${slug}/` : ''}`;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  const content = exportRepoContent(join(ROOT, 'test-results/blog-from-api-content.json'));
  const pagesFor = (locales: string[]) => new Map(locales.map((locale) => [locale, content.filter((d) => d.locale === locale)]));
  const site = (
    key: keyof typeof HOSTS,
    slug: string,
    overrides: Record<string, unknown> = {},
    withBlog = true,
  ): FakeSite => {
    const blog = platformBlogFromFixture();
    blogs[key] = blog;
    return {
      tenant: { ...platform, slug, domain: HOSTS[key], ...overrides },
      pages: pagesFor((overrides.locales as string[] | undefined) ?? ['en', 'es']),
      ...(withBlog ? { blog } : {}),
    };
  };
  const sites: FakeSite[] = [
    // 1platform.pro after F3b: `/blog/` is listed, the article routes are not.
    site('platform', 'oneplatform', { pages: TRIMMED_PAGES }),
    // The same blog under a site whose DEFAULT language is Spanish (D-7).
    site('spanishDefault', 'plat-es', { locales: ['es', 'en'], default_locale: 'es', pages: ['/', '/blog/', '/contact/', '/terms/', '/changelog/'] }),
    // A site that does not publish `/blog/`, with posts sitting in the Core.
    site('withoutBlog', 'plat-sin-blog', { pages: TRIMMED_PAGES.filter((p) => p !== '/blog/') }),
    // A Core that answers 503 to every blog read.
    site('coreDown', 'plat-caido', { pages: TRIMMED_PAGES }),
    site('fresh', 'plat-fresco', { pages: TRIMMED_PAGES }),
    site('budget', 'plat-presupuesto', { pages: TRIMMED_PAGES }),
    site('withdrawn', 'plat-retirado', { pages: TRIMMED_PAGES }),
    site('many', 'plat-muchos', { pages: TRIMMED_PAGES }),
  ];
  blogs.coreDown.failWith = () => 503;
  // 120 extra posts so the archive spans three pages of 50.
  for (let i = 0; i < 120; i++) {
    blogs.many.posts.push({
      ...EN[0],
      slug: `relleno-${i}`,
      translation_key: `relleno-${i}`,
      published_at: new Date(Date.UTC(2020, 0, 1) + i * 86_400_000).toISOString(),
      updated_at: new Date(Date.UTC(2020, 0, 1) + i * 86_400_000).toISOString(),
    });
  }
  stack = await startFakeSiteStack(sites, { host: HOSTS.platform, path: '/' });
});

test.afterAll(async () => {
  await stack?.stop();
});

test.describe('the import file', () => {
  // verify-epic-e2e 2026-11-10: the Markdown carried human tag labels
  // ("electronic invoicing", "automatización") and the Core's import refused
  // 10 of the 16 posts. The exporter folds them; the fixture IS the import file.
  test('every post of the fixture passes the Core tag grammar', async () => {
    const CORE_TAG = /^[a-z0-9-]{1,40}$/;
    const bad = fixture.posts.flatMap((p) =>
      ((p as { tags?: string[] }).tags ?? []).filter((t) => !CORE_TAG.test(t)).map((t) => `${p.locale}/${p.slug}: ${t}`),
    );
    expect(bad).toEqual([]);
  });

  test('the exporter folds a human label to the Core form, or refuses it', async () => {
    const { coreTag } = (await import('../scripts/export-blog-posts.mjs')) as { coreTag: (t: string) => string };
    expect(coreTag('electronic invoicing')).toBe('electronic-invoicing');
    expect(coreTag('Facturación Electrónica')).toBe('facturacion-electronica');
    expect(coreTag('buenas-prácticas')).toBe('buenas-practicas');
    expect(() => coreTag('¿?')).toThrow(/no Core form/);
    expect(() => coreTag('x'.repeat(41))).toThrow(/no Core form/);
  });
});

test.describe('the archive', () => {
  test('lists the 8 posts of each language in the order of the frozen archive', async () => {
    for (const locale of ['en', 'es']) {
      const served = await get(HOSTS.platform, blogPath(locale));
      expect(served.status, locale).toBe(200);
      const baseline = baselineHtml(blogPath(locale));
      const links = (html: string) => hrefs(html, /class="archive-link" href="([^"]+)"/g);
      expect(links(served.body), locale).toHaveLength(7); // the lead post sits in its own slot
      expect(links(served.body), `${locale}: same archive order as the baseline`).toEqual(links(baseline));
      expect(hrefs(served.body, /class="blog-feature" href="([^"]+)"/g)).toEqual(hrefs(baseline, /class="blog-feature" href="([^"]+)"/g));
    }
  });

  test('keeps the archive summaries, dates and category labels of the baseline', async () => {
    for (const locale of ['en', 'es']) {
      const served = await get(HOSTS.platform, blogPath(locale));
      const baseline = baselineHtml(blogPath(locale));
      const rows = (html: string) => [...html.matchAll(/<article class="archive-item"[\s\S]*?<\/article>/g)].map((m) => norm(m[0]));
      expect(rows(served.body), locale).toEqual(rows(baseline));
    }
  });
});

test.describe('an article', () => {
  test('is served with the bytes of the baseline, for each of the 16, whether or not `pages` lists it', async () => {
    for (const post of fixture.posts) {
      const path = blogPath(post.locale, post.slug);
      const served = await get(HOSTS.platform, path);
      expect(served.status, path).toBe(200);
      const expected = articleCopy(baselineHtml(path));
      expect(expected, `${path}: baseline article`).not.toBeNull();
      expect(norm(articleCopy(served.body) ?? ''), path).toBe(norm(expected!));
      expect(served.body, path).toContain(`<link rel="canonical" href="https://1platform.pro${path}"`);
    }
  });

  test('has an index whose links are the ids the article really carries', async () => {
    for (const post of [EN[0], ES[0]]) {
      const served = await get(HOSTS.platform, blogPath(post.locale, post.slug));
      const ids = hrefs(articleCopy(served.body)!, /<h2 id="([^"]+)"/g);
      expect(ids.length, post.slug).toBeGreaterThan(0);
      // The index sits before the article; the article carries no in-page links to its own headings.
      const beforeArticle = served.body.slice(0, served.body.indexOf('<article class="article-copy"'));
      const tocLinks = hrefs(beforeArticle.slice(Math.max(0, beforeArticle.indexOf('interior-toc'))), /href="#([^"]+)"/g);
      for (const id of ids) expect(tocLinks, `${post.slug}: index lacks #${id}`).toContain(id);
    }
  });

  test('declares its twin in the other language, and the two point at each other', async () => {
    for (const post of fixture.posts) {
      const twin = TWIN_OF(post);
      const served = await get(HOSTS.platform, blogPath(post.locale, post.slug));
      const other = post.locale === 'en' ? 'es' : 'en';
      expect(served.body, post.slug).toContain(`hreflang="${other}" href="https://1platform.pro${blogPath(other, twin.slug)}"`);
      expect(served.body, post.slug).toContain(`hreflang="${post.locale}" href="https://1platform.pro${blogPath(post.locale, post.slug)}"`);
    }
  });

  test('a post with no twin offers no other language', async () => {
    const blog = blogs.platform;
    blog.posts.push({ ...EN[0], slug: 'solo-ingles', translation_key: 'solo-ingles', title: 'Only in English', published_at: new Date(Date.now() - 60_000).toISOString() });
    // The archive is cached for 60 s, so the first visit goes through the page-1 re-read (D-9).
    const served = await get(HOSTS.platform, '/blog/solo-ingles/');
    expect(served.status).toBe(200);
    // (the language auto-detect script names `hreflang="es"` in its source: look at the <link> tags)
    expect(served.body).not.toContain('<link rel="alternate" hreflang="es"');
    expect(served.body).toContain('<link rel="alternate" hreflang="en"');
  });
});

test.describe('the address of a post that is not there', () => {
  test('answers the site\'s own 404, with its chrome, without being remembered', async () => {
    const served = await get(HOSTS.platform, '/blog/no-existe-este-articulo/');
    expect(served.status).toBe(404);
    expect(served.headers['cache-control']).toBe('no-store');
    expect(served.body).toContain('<header');
    expect(served.body).toContain('<footer');
    expect(served.body).not.toContain('<article class="article-copy"');
    const spanish = await get(HOSTS.platform, '/es/blog/no-existe-este-articulo/');
    expect(spanish.status).toBe(404);
    expect(spanish.body).toContain('<header');
  });

  test('a Spanish slug under the English tree, and the reverse, are 404 (a post lives in its own language)', async () => {
    expect((await get(HOSTS.platform, blogPath('en', ES[0].slug))).status).toBe(404);
    expect((await get(HOSTS.platform, blogPath('es', EN[0].slug))).status).toBe(301); // the legacy table, not a post
  });

  test('a post the list names but whose body the Core already refuses is a 404', async () => {
    const blog = blogs.withdrawn;
    expect((await get(HOSTS.withdrawn, '/blog/')).status).toBe(200); // primes the archive
    const post = blog.posts.find((p) => p.locale === 'en' && p.slug === EN[1].slug)!;
    post.status = 'draft'; // unpublished a moment ago: the cached list still names it
    const served = await get(HOSTS.withdrawn, blogPath('en', post.slug));
    expect(served.status).toBe(404);
    expect(served.body).not.toContain('<article class="article-copy"');
    expect(served.body, 'the site\'s 404 page, with its chrome').toContain('<header');
  });
});

test.describe('without data from the Core', () => {
  test('the index, an article, the feeds and the sitemap are 503, never another site\'s writing', async () => {
    for (const path of ['/blog/', '/blog/automate-seo-pipeline/', '/es/blog/', '/rss.xml', '/es/rss.xml', '/sitemap-0.xml']) {
      const served = await get(HOSTS.coreDown, path);
      expect(served.status, path).toBe(503);
      expect(served.body, path).not.toContain('How to Automate');
      expect(served.body, path).not.toContain('Automatiza');
    }
  });
});

test.describe('a post published a moment ago', () => {
  test('is visible on its first visit, even though the archive was cached before it existed', async () => {
    const blog = blogs.fresh;
    expect((await get(HOSTS.fresh, '/blog/')).status).toBe(200); // archive cached now
    blog.posts.push({ ...EN[0], slug: 'recien-publicado', translation_key: 'recien-publicado', title: 'Just published', published_at: new Date(Date.now() - 1_000).toISOString() });
    const served = await get(HOSTS.fresh, '/blog/recien-publicado/');
    expect(served.status).toBe(200);
    expect(served.body).toContain('Just published');
    // and the index now lists it, without waiting for the 60 s refresh
    expect(await (await get(HOSTS.fresh, '/blog/')).body).toContain('/blog/recien-publicado/');
  });
});

test.describe('the cost of addresses that do not exist', () => {
  test('200 invented slugs cost at most one list read per 5 s, and never a body read', async () => {
    const blog = blogs.budget;
    expect((await get(HOSTS.budget, '/blog/')).status).toBe(200);
    const before = blog.listReads!.length;
    const detailsBefore = blog.detailReads!.length;
    const answers = await Promise.all(Array.from({ length: 200 }, (_, i) => get(HOSTS.budget, `/blog/inventado-${i}/`)));
    expect(new Set(answers.map((a) => a.status))).toEqual(new Set([404]));
    expect(blog.listReads!.length - before, 'list reads caused by 200 invented slugs').toBeLessThanOrEqual(1);
    expect(blog.detailReads!.length - detailsBefore, 'body reads caused by invented slugs').toBe(0);
  });

  test('the re-read is page 1 only, single flight, and budgeted (slow Core, three-page archive)', async () => {
    const blog = blogs.many;
    expect((await get(HOSTS.many, '/blog/')).status).toBe(200);
    const primed = blog.listReads!.slice();
    expect(primed.sort(), 'the full archive is read page by page').toEqual(['en:1', 'en:2', 'en:3']);
    blog.delayMs = () => 400;
    const before = blog.listReads!.length;
    const answers = await Promise.all(Array.from({ length: 60 }, (_, i) => get(HOSTS.many, `/blog/inventado-${i}/`)));
    expect(new Set(answers.map((a) => a.status))).toEqual(new Set([404]));
    const reread = blog.listReads!.slice(before);
    expect(reread.length, 'one re-read for 60 concurrent invented slugs').toBeLessThanOrEqual(1);
    expect(reread.every((r) => r === 'en:1'), `only page 1 is re-read, got ${reread.join(',')}`).toBe(true);
  });

  test('a Core that fails while re-reading turns an invented slug into 404, not 503', async () => {
    const blog = blogs.many;
    blog.delayMs = undefined;
    expect((await get(HOSTS.many, '/blog/')).status).toBe(200); // cached archive
    blog.failWith = () => 503;
    // 5 s since the last attempt: the interval is part of the contract, so wait it out.
    await new Promise((resolve) => setTimeout(resolve, 5_200));
    const served = await get(HOSTS.many, '/blog/otro-inventado/');
    expect(served.status).toBe(404);
    expect(served.headers['cache-control']).toBe('no-store');
    blog.failWith = undefined;
  });
});

test.describe('a site whose default language is Spanish', () => {
  test('serves its Spanish archive and posts at the root and the English ones under /en/', async () => {
    const index = await get(HOSTS.spanishDefault, '/blog/');
    expect(index.status).toBe(200);
    expect(index.body).toContain('<html lang="es"');
    expect(index.body).toContain(`href="/blog/${ES[0].slug}/"`);
    expect(index.body).not.toContain(`href="/blog/${EN[0].slug}/"`);

    const spanish = await get(HOSTS.spanishDefault, `/blog/${ES[0].slug}/`);
    expect(spanish.status).toBe(200);
    expect(spanish.body).toContain('<html lang="es"');
    expect(spanish.body).toContain(ES[0].title.slice(0, 20));

    const english = await get(HOSTS.spanishDefault, `/en/blog/${TWIN_OF(ES[0]).slug}/`);
    expect(english.status).toBe(200);
    expect(english.body).toContain('<html lang="en"');
  });

  test('an English slug at the Spanish root, and a Spanish slug under /en/, are 404', async () => {
    expect((await get(HOSTS.spanishDefault, `/blog/${TWIN_OF(ES[0]).slug}/`)).status).toBe(404);
    expect((await get(HOSTS.spanishDefault, `/en/blog/${ES[0].slug}/`)).status).toBe(404);
  });
});

test.describe('the 8 Spanish redirects of the old tree', () => {
  test('still answer 301 to the Spanish slug with `pages` trimmed of article routes', async () => {
    expect(TRIMMED_PAGES).not.toContain(`/blog/${EN[0].slug}/`);
    for (const post of EN) {
      const twin = TWIN_OF(post);
      const served = await get(HOSTS.platform, `/es/blog/${post.slug}/`);
      expect(served.status, post.slug).toBe(301);
      expect(served.headers.location, post.slug).toBe(`/es/blog/${twin.slug}/`);
      expect((await get(HOSTS.platform, `/es/blog/${twin.slug}/`)).status, twin.slug).toBe(200);
    }
  });
});

test.describe('a site that does not publish /blog/', () => {
  test('has no blog, no feed and asks the Core nothing', async () => {
    const blog = blogs.withoutBlog;
    for (const path of ['/blog/', `/blog/${EN[0].slug}/`, '/rss.xml', '/es/rss.xml', '/es/blog/']) {
      expect((await get(HOSTS.withoutBlog, path)).status, path).toBe(404);
    }
    expect(blog.listReads, 'list reads').toEqual([]);
    expect(blog.detailReads, 'body reads').toEqual([]);
  });
});

test.describe('the feeds and the sitemap come from the Core', () => {
  test('each feed carries the posts of its own language', async () => {
    const en = await get(HOSTS.platform, '/rss.xml');
    const es = await get(HOSTS.platform, '/es/rss.xml');
    expect(en.status).toBe(200);
    expect(es.status).toBe(200);
    const items = (xml: string) => hrefs(xml, /<link>([^<]*\/blog\/[^<]+)<\/link>/g);
    expect(items(en.body)).toEqual(expect.arrayContaining(EN.map((p) => expect.stringContaining(`/blog/${p.slug}/`))));
    expect(items(es.body)).toHaveLength(ES.length);
    // newest first, same-day posts by slug: the order the collection gave the files
    const newest = (posts: FixturePost[]) =>
      [...posts].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at) || a.slug.localeCompare(b.slug));
    expect(items(es.body).map((link) => link.replace(/^.*\/blog\//, '').replace(/\/$/, ''))).toEqual(newest(ES).map((p) => p.slug));
    expect(items(en.body).filter((link) => !link.includes('solo-ingles')).map((link) => link.replace(/^.*\/blog\//, '').replace(/\/$/, ''))).toEqual(newest(EN).map((p) => p.slug));
    expect(items(es.body).every((link) => link.includes('/es/blog/'))).toBe(true);
    expect(items(en.body).some((link) => link.includes('/es/blog/'))).toBe(false);
  });

  test('the sitemap lists every post once per language with the alternates the Core pairs', async () => {
    const xml = (await get(HOSTS.platform, '/sitemap-0.xml')).body;
    const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
    const loc = (b: string) => /<loc>([^<]+)<\/loc>/.exec(b)![1];
    const posts = blocks.filter((b) => /\/blog\/[^/]+\/<\/loc>/.test(b));
    // 16 paired posts + the English-only one published by an earlier test
    expect(posts.map(loc).sort()).toEqual(
      [
        ...EN.map((p) => `https://1platform.pro/blog/${p.slug}/`),
        ...ES.map((p) => `https://1platform.pro/es/blog/${p.slug}/`),
        'https://1platform.pro/blog/solo-ingles/',
      ].sort(),
    );
    for (const block of posts) {
      const alternates = hrefs(block, /rel="alternate" hreflang="[a-z]+" href="([^"]+)"/g);
      if (loc(block).endsWith('/blog/solo-ingles/')) expect(alternates, 'a post with no twin carries no alternates').toEqual([]);
      else expect(alternates, loc(block)).toHaveLength(2);
    }
    // never the old address of a moved Spanish post
    for (const post of EN) expect(xml).not.toContain(`/es/blog/${post.slug}/`);
    // every alternate names a URL the sitemap lists
    const listed = new Set(blocks.map(loc));
    for (const alt of hrefs(xml, /rel="alternate" hreflang="[a-z]+" href="([^"]+)"/g)) expect(listed.has(alt), alt).toBe(true);
  });
});
