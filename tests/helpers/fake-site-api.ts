import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';

import { getWithHost } from './http-host';

/**
 * The built Node adapter in front of a FAKE site API, with manifests injected
 * per host (`SITE_MANIFEST_SOURCE=api`).
 *
 * Extracted from the three specs that each carry an inline copy of this shape
 * (`photographic-landing`, `photographic-interior-legacy`, …); only the
 * social-links spec uses it for now, so those three are left as they are. It
 * runs the production dictionary path — the page dictionary is ONLY the
 * tenant's published content — which is exactly where a missing key throws.
 */

export type PagesDocument = { route: string; locale: string; published?: boolean; blocks: Record<string, string> };

export interface FakeSite {
  tenant: Record<string, unknown> & { slug: string; domain: string };
  /** Published pages per locale. */
  pages: Map<string, PagesDocument[]>;
  /**
   * landing-reviews-tenant: what `GET /sites/{slug}/reviews` answers, asked on
   * EVERY request so a spec can change it between two reads. Absent ⇒ 404, the
   * answer of an API that does not serve the route.
   */
  reviews?: () => { status: number; body?: unknown };
  /**
   * blog-sitio-de-marca-generado: the Core blog of an editorial site, as the
   * fixture `tests/fixtures/editorial-tenants.json` declares it. Absent ⇒ every
   * `/blog*` read answers 404, like an API site without a blog.
   */
  blog?: FakeBlog;
}

export interface FakeBlog {
  /** Absent for a site without an editorial block (the platform's own blog). */
  editorial?: EditorialFixture;
  posts: FixturePost[];
  /** Answer every blog read with this status (e.g. 503) to drive error states. */
  failWith?: () => number | null;
  /** Newsletter captures received, in order. */
  captured?: { email: string; locale: string }[];
  /** Every post-DETAIL read the site made, as `locale:slug` (D-7/D-9 cost guard). */
  detailReads?: string[];
  /** Every LIST read the site made, as `locale:page` (D-9: invented slugs cost <= 1 per 5 s). */
  listReads?: string[];
  /** Per-request overrides: a post body the Core has just withdrawn, a slow Core… */
  delayMs?: () => number;
  /** Answer every blog read with FastAPI's bare 404 (no `data.code`): a Core without the route. */
  bareNotFound?: boolean;
}

export interface FixturePost {
  locale: string; slug: string; translation_key: string; title: string; description: string; body: string;
  category: string; illustration: string | null; reading_minutes: number | null; status: string;
  published_at: string; updated_at: string; author?: string | null;
  tags?: string[]; image?: string | null; og_image?: string | null;
}

/**
 * The platform's own blog (1platform.pro) as the Core would serve it: the sixteen
 * posts of `src/data/blog-fixture.json`, exactly the rows the export script emits
 * for the Core's PUT. `mutate` lets a spec publish, withdraw or add a post.
 */
export function platformBlogFromFixture(): FakeBlog {
  const file = join(process.cwd(), 'src/data/blog-fixture.json');
  const { posts } = JSON.parse(readFileSync(file, 'utf8')) as { posts: FixturePost[] };
  return { posts: posts.map((p) => ({ ...p })), detailReads: [], listReads: [] };
}

// The editorial block in its WRITE shape (every locale), projected per locale below.
export type EditorialFixture = Record<string, any>;

export interface EditorialTenantFixture {
  manifest: Record<string, unknown> & { slug: string; domain: string };
  editorial: EditorialFixture;
  posts: FixturePost[];
}

export function loadEditorialFixture(): EditorialTenantFixture[] {
  const file = join(process.cwd(), 'tests/fixtures/editorial-tenants.json');
  return (JSON.parse(readFileSync(file, 'utf8')) as { tenants: EditorialTenantFixture[] }).tenants;
}

function card(post: FixturePost) {
  return {
    slug: post.slug, title: post.title, description: post.description, category: post.category, tags: post.tags ?? [],
    author: post.author ?? null, image: post.image ?? null, illustration: post.illustration, reading_minutes: post.reading_minutes,
    translation_key: post.translation_key, published_at: post.published_at, updated_at: post.updated_at,
  };
}

function projectEditorial(block: EditorialFixture, locale: string) {
  const newsletter = block.newsletter ?? {};
  const text = newsletter.labels?.[locale];
  return {
    locale,
    categories: block.categories.filter((c: any) => c.labels[locale]).map((c: any) => ({ id: c.id, ...c.labels[locale] })),
    home: block.home[locale] ? { ...block.home[locale], kicker: block.home[locale].kicker ?? null, illustration: block.illustration } : null,
    reading_paths: block.reading_paths.filter((p: any) => p.labels[locale]).map((p: any) => ({ id: p.id, ...p.labels[locale] })),
    cta: block.cta?.labels?.[locale] ? { url: block.cta.url, presentation: block.cta.presentation, ...block.cta.labels[locale] } : null,
    byline: block.byline?.[locale] ?? null,
    legal: block.legal?.labels?.[locale] ? { text: block.legal.labels[locale].text, approved: block.legal.approved } : null,
    newsletter: newsletter.enabled && newsletter.consent_version && text?.consent_text ? { available: true, ...text } : { available: false },
    palette: block.palette,
    reading_font: block.reading_font,
  };
}

/** The Core's blog surface, for one fake site: same visibility rules, same envelope. */
export function answerBlog(site: FakeSite, url: URL, method: string, body: string): { status: number; data?: unknown } | null {
  const match = /\/sites\/[^/]+\/blog(?:\/([^/]+))?$/.exec(url.pathname);
  if (!match) return null;
  const blog = site.blog;
  const locale = url.searchParams.get('locale') ?? '';
  const tenant = site.tenant as unknown as { locales: string[]; pages: string[] };
  if (!blog) return { status: 404, data: { code: 'site_unresolved' } };
  const failure = blog.failWith?.();
  if (failure) return { status: failure };
  const sub = match[1];
  if (sub === 'newsletter' && method === 'POST') {
    if (!blog.editorial) return { status: 404, data: { code: 'site_unresolved' } };
    const req = JSON.parse(body || '{}');
    const view = projectEditorial(blog.editorial, req.locale);
    if (!view.newsletter.available) return { status: 404, data: { code: 'site_newsletter_unavailable' } };
    if (req.consent !== true || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(req.email ?? '')) return { status: 422 };
    blog.captured = [...(blog.captured ?? []), { email: String(req.email).toLowerCase(), locale: req.locale }];
    return { status: 202, data: { code: 'site_newsletter_received' } };
  }
  if (!tenant.locales.includes(locale) || !tenant.pages.includes('/blog/')) return { status: 404, data: { code: 'site_unresolved' } };
  const now = Date.now();
  const published = blog.posts
    .filter((p) => p.locale === locale && p.status === 'published' && Date.parse(p.published_at) <= now)
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at) || a.slug.localeCompare(b.slug));
  if (sub === 'editorial') return blog.editorial ? { status: 200, data: projectEditorial(blog.editorial, locale) } : { status: 404, data: { code: 'site_unresolved' } };
  if (sub) {
    blog.detailReads = [...(blog.detailReads ?? []), `${locale}:${sub}`];
    const post = published.find((p) => p.slug === sub);
    if (!post) return { status: 404, data: { code: 'site_blog_post_not_found' } };
    const alternates = Object.fromEntries(
      blog.posts.filter((p) => p.translation_key === post.translation_key && p.locale !== locale && p.status === 'published' && tenant.locales.includes(p.locale)).map((p) => [p.locale, p.slug]),
    );
    const others = published.filter((p) => p.slug !== post.slug);
    const related = [...others.filter((p) => p.category === post.category), ...others.filter((p) => p.category !== post.category)].slice(0, 3);
    return { status: 200, data: { ...card(post), body: post.body, og_image: post.og_image ?? null, faq: [], alternates, related: related.map(card) } };
  }
  const page = Number(url.searchParams.get('page') ?? '1');
  blog.listReads = [...(blog.listReads ?? []), `${locale}:${page}`];
  const size = Number(url.searchParams.get('page_size') ?? '12');
  return { status: 200, data: { items: published.slice((page - 1) * size, page * size).map(card), page, page_size: size, total: published.length } };
}

export interface FakeSiteStack {
  baseUrl: string;
  port: number;
  log: () => string;
  stop: () => Promise<void>;
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('No TCP address'));
      resolve(address.port);
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

/**
 * The repository's own content, exported once to a file of THIS caller's
 * choosing. Specs run in parallel; sharing an output path is a race.
 */
export function exportRepoContent(out: string): PagesDocument[] {
  const root = process.cwd();
  mkdirSync(join(root, 'test-results'), { recursive: true });
  const exported = spawnSync(process.execPath, ['scripts/export-site-content.mjs', '--out', out], { cwd: root, encoding: 'utf8' });
  if (exported.status !== 0) throw new Error(`export-site-content failed: ${exported.stderr}`);
  const { documents } = JSON.parse(readFileSync(out, 'utf8')) as { documents: PagesDocument[] };
  return documents.filter((document) => document.published !== false);
}

export async function startFakeSiteStack(sites: FakeSite[], readyProbe: { host: string; path: string }): Promise<FakeSiteStack> {
  const root = process.cwd();
  if (!existsSync(join(root, 'dist/server/entry.mjs'))) throw new Error('Build the real Node adapter first (npm run build)');

  const byHost = new Map(sites.map((site) => [site.tenant.domain, site]));
  const bySlug = new Map(sites.map((site) => [site.tenant.slug, site]));

  const api = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://contract');
    response.setHeader('content-type', 'application/json; charset=utf-8');
    const blogSlug = /\/sites\/([^/]+)\/blog/.exec(url.pathname)?.[1];
    if (blogSlug) {
      let body = '';
      for await (const chunk of request) body += String(chunk);
      const site = bySlug.get(blogSlug);
      // A Core without the blog route answers FastAPI's bare 404 (no `data.code`).
      const answer = site?.blog?.bareNotFound
        ? { status: 404, bare: true }
        : site
          ? answerBlog(site, url, request.method ?? 'GET', body)
          : { status: 404, data: { code: 'site_unresolved' } };
      const delay = site?.blog?.delayMs?.() ?? 0;
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      if (answer) {
        response.statusCode = answer.status;
        if ('bare' in answer) return response.end(JSON.stringify({ detail: 'Not Found' }));
        return response.end(JSON.stringify({ success: answer.status < 400, data: answer.data ?? null, msg: 'blog' }));
      }
    }
    if (url.pathname.endsWith('/sites/by-host')) {
      const site = byHost.get(url.searchParams.get('host') ?? '');
      if (site) return response.end(JSON.stringify({ success: true, data: site.tenant, msg: 'Site resolved' }));
    } else if (/\/sites\/[^/]+\/reviews$/.test(url.pathname)) {
      const slug = /\/sites\/([^/]+)\/reviews$/.exec(url.pathname)?.[1] ?? '';
      const answer = bySlug.get(slug)?.reviews?.();
      if (answer) {
        response.statusCode = answer.status;
        return response.end(JSON.stringify(answer.body ?? { success: false, data: null, msg: 'error' }));
      }
    } else {
      const match = /\/sites\/([^/]+)\/pages$/.exec(url.pathname);
      const site = match ? bySlug.get(match[1]) : undefined;
      const locale = url.searchParams.get('locale') ?? '';
      const pages = site?.pages.get(locale);
      if (site && pages) {
        const messages = Object.assign({}, ...pages.map((page) => page.blocks));
        return response.end(JSON.stringify({ success: true, data: { slug: site.tenant.slug, locale, pages, messages }, msg: 'ok' }));
      }
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ success: false, data: null, msg: 'Site not found' }));
  });
  const apiPort = await listen(api);
  const reservation = createServer();
  const port = await listen(reservation);
  await close(reservation);
  const baseUrl = `http://127.0.0.1:${port}`;

  let output = '';
  const app: ChildProcessWithoutNullStreams = spawn(process.execPath, ['dist/server/entry.mjs'], {
    cwd: root,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), SITE_MANIFEST_SOURCE: 'api', SITE_API_BASE_URL: `http://127.0.0.1:${apiPort}` },
    stdio: 'pipe',
  });
  app.stdout.on('data', (chunk) => { output += String(chunk); });
  app.stderr.on('data', (chunk) => { output += String(chunk); });

  const stop = async () => {
    if (app.exitCode === null) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => { app.kill('SIGKILL'); resolve(); }, 3_000);
        app.once('exit', () => { clearTimeout(timer); resolve(); });
        app.kill('SIGTERM');
      });
    }
    await close(api);
  };

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (app.exitCode !== null) {
      await close(api);
      throw new Error(`Node adapter exited: ${output.slice(-4000)}`);
    }
    try {
      const response = await getWithHost(`${baseUrl}${readyProbe.path}`, readyProbe.host);
      if (response.status === 200) return { baseUrl, port, log: () => output, stop };
    } catch { /* wait for the adapter's socket */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await stop();
  throw new Error(`The built site did not become ready: ${output.slice(-4000)}`);
}
