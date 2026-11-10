/**
 * The editorial preset end to end on the BUILT server (blog-sitio-de-marca-generado
 * BSM-07/BSM-08, §23). Two sites from the same code — `peptidos` and the invented
 * `cuaderno-demo` — share the post slug `leer-documentacion` and the category id
 * `guias` on purpose: every isolation assertion below is made where identifiers
 * collide. Two derived variants drive the empty-category and error states.
 *
 * The API is a fake that reproduces the Core's visibility rules; the Core's own
 * filters and indexes are pinned against a real Mongo in
 * `1platform-api/tests/integration_db/test_site_blog_service.py`. This file is
 * not the bench: `/verify-epic-e2e` runs the real API.
 */
import { request as httpRequest } from 'node:http';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { loadEditorialFixture, startFakeSiteStack, type FakeSite, type FakeSiteStack } from './helpers/fake-site-api';
import { getWithHost } from './helpers/http-host';

const fixture = loadEditorialFixture();
const [peptidos, cuaderno] = fixture;

function site(entry: (typeof fixture)[number], overrides: Partial<FakeSite> & { slug?: string; domain?: string } = {}): FakeSite {
  const tenant = { ...entry.manifest, ...(overrides.slug ? { slug: overrides.slug, domain: overrides.domain } : {}) };
  const locales = entry.manifest.locales as string[];
  return {
    tenant,
    pages: new Map(locales.map((l) => [l, [{ route: '@common', locale: l, blocks: { 'editorial.site': tenant.slug } }]])),
    blog: { editorial: entry.editorial, posts: entry.posts },
    ...overrides,
  } as FakeSite;
}

const vacio = site(cuaderno, {
  slug: 'vacio-demo',
  domain: 'vacio.localhost',
  blog: { editorial: cuaderno.editorial, posts: cuaderno.posts.filter((p) => p.category !== 'despensa') },
});
const roto = site(peptidos, { slug: 'roto-demo', domain: 'roto.localhost', blog: { editorial: peptidos.editorial, posts: [], failWith: () => 503 } });
const html = site(peptidos, {
  slug: 'html-demo',
  domain: 'html.localhost',
  blog: { editorial: peptidos.editorial, posts: [{ ...peptidos.posts[0], body: '## Hola\n\n<script>alert(1)</script>\n' }] },
});
const cuadernoSite = site(cuaderno);
// The Core's newsletter ceiling answering 429 (every blog call of this site does).
const lleno = site(cuaderno, {
  slug: 'lleno-demo',
  domain: 'lleno.localhost',
  blog: { editorial: cuaderno.editorial, posts: cuaderno.posts, failWith: () => 429 },
});

let stack: FakeSiteStack;
const sites = [site(peptidos), cuadernoSite, vacio, roto, html, lleno];

test.beforeAll(async () => {
  stack = await startFakeSiteStack(sites, { host: 'peptidos.localhost', path: '/' });
});
test.afterAll(async () => stack?.stop());

const get = (path: string, host: string) => getWithHost(`${stack.baseUrl}${path}`, host);

function post(path: string, host: string, body: string, headers: Record<string, string>) {
  const target = new URL(`${stack.baseUrl}${path}`);
  return new Promise<{ status: number; body: string; headers: Record<string, unknown> }>((resolve, reject) => {
    const req = httpRequest(
      { hostname: target.hostname, port: target.port, path: target.pathname, method: 'POST', headers: { host, connection: 'close', 'content-type': 'application/x-www-form-urlencoded', ...headers } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data, headers: res.headers }));
      },
    );
    req.on('error', reject);
    req.end(body);
  });
}

test.describe('editorial home', () => {
  test('the first customer renders its own hero, featured post, three paths and external CTA', async () => {
    const r = await get('/', 'peptidos.localhost');
    expect(r.status).toBe(200);
    expect(r.body).toContain('data-preset="editorial-blog"');
    expect(r.body).toContain('Entiende más. Elige con criterio.');
    expect(r.body).toContain('data-featured="leer-documentacion"');
    expect((r.body.match(/data-path="/g) ?? []).length).toBe(3);
    expect(r.body).toContain('href="https://aurumlabsgt.com/"');
    expect(r.body).toContain('Explorar Aurum Labs');
    expect(r.body).toContain('Continuarás en aurumlabsgt.com');
    expect(r.body).toContain('data-legal-status="pending"');
    expect(r.body).toContain('PENDIENTE DE REDACCIÓN LEGAL DEL DUEÑO');
    expect(r.body).not.toContain('data-newsletter-block');
  });

  test('a second site with other data uses the same code and none of the first one', async () => {
    const r = await get('/', 'cuaderno.localhost');
    expect(r.status).toBe(200);
    expect(r.body).toContain('Cocina despacio. Anota todo.');
    expect(r.body).toContain('href="https://mercado-demo.example/"');
    expect(r.body).toContain('data-newsletter-block');
    expect(r.body).toContain('data-legal-status="approved"');
    for (const leak of ['Aurum', 'aurumlabsgt', 'péptidos', 'PENDIENTE DE REDACCIÓN']) expect(r.body).not.toContain(leak);
  });

  test('a language whose only post is the featured one shows no empty «recent» grid', async () => {
    // /verify-epic-e2e 2026-11-09: cuaderno in English has one post, already the
    // featured one; the home drew the «recent» heading and filters over nothing.
    const en = await get('/en/', 'cuaderno.localhost');
    expect(en.status).toBe(200);
    expect(en.body).toContain('data-featured="read-the-recipe"');
    expect(en.body).not.toContain('id="ed-recent-title"');
    const es = await get('/', 'cuaderno.localhost');
    expect(es.body).toContain('id="ed-recent-title"');
  });

  test('preset pages never load the platform stylesheets', async () => {
    // DV-5 + /verify-epic-e2e 2026-11-09: one import in the article page bundled
    // the platform CSS (BaseLayout, Home, Pricing…) and broke every icon link.
    for (const path of ['/', '/blog/', '/blog/leer-documentacion/', '/pricing/']) {
      const r = await get(path, 'cuaderno.localhost');
      const sheets = [...r.body.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
      expect(sheets.length, path).toBeGreaterThan(0);
      for (const href of sheets) expect(href, path).toMatch(/\/_astro\/editorial[^/]*\.css$/);
    }
  });

  test('the preset shares no styled component with the platform', () => {
    // /implement-epic 2026-11-09: the preset imported the platform's Icon.astro,
    // Astro shared its scoped `.icon` rule across both bundles, and every
    // 1platform.pro page started serving it inline — same look, different
    // bytes, byte-for-byte gate red. A shared component may only come from the
    // preset's own folder, or be one that carries no <style> of its own.
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(astro|ts)$/.test(name)) files.push(full);
      }
    };
    walk('src/components/editorial');
    walk('src/pages/render/editorial-blog');
    files.push('src/layouts/EditorialLayout.astro');
    expect(files.length).toBeGreaterThan(5);
    const offenders: string[] = [];
    for (const file of files) {
      for (const m of readFileSync(file, 'utf8').matchAll(/from '@components\/([^']+\.astro)'/g)) {
        if (m[1].startsWith('editorial/')) continue;
        if (/<style/.test(readFileSync(join('src/components', m[1]), 'utf8'))) offenders.push(`${file} → ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('tokens come from configuration, not a branded stylesheet', async () => {
    const a = await get('/', 'peptidos.localhost');
    const b = await get('/', 'cuaderno.localhost');
    expect(a.body).toContain('--ink:#203d30');
    expect(a.body).toContain('--paper:#fafbf6');
    expect(b.body).toContain('--ink:#8a3b1f');
    expect(b.body).toContain('--paper:#fbf6ef');
  });
});

test.describe('library', () => {
  test('index, category with description, singular and plural count', async () => {
    const all = await get('/blog/', 'peptidos.localhost');
    expect(all.status).toBe(200);
    expect(all.body).toContain('8 artículos');
    const faq = await get('/blog/?category=preguntas', 'peptidos.localhost');
    expect(faq.body).toContain('1 artículo');
    expect(faq.body).toContain('Respuestas breves a las dudas que más se repiten.');
    expect(faq.body).toContain('data-post="preguntas-documentacion"');
  });

  test('search ignores accents and case and combines words', async () => {
    const r = await get('/blog/?q=NUMERO%20lote', 'peptidos.localhost');
    expect(r.body).toContain('data-post="numero-lote"');
    expect(r.body).toContain('1 artículo');
  });

  test('pagination keeps the query and the category in the URL', async () => {
    const r = await get('/blog/?q=a', 'peptidos.localhost');
    expect(r.body).toMatch(/href="\/blog\/\?q=a&amp;page=2#resultados"/);
    const p2 = await get('/blog/?q=a&page=2', 'peptidos.localhost');
    expect(p2.body).toContain('aria-current="page" aria-label="Página 2"');
  });

  test('no match offers a way back; an empty category shows its own state', async () => {
    const none = await get('/blog/?q=zzzzzz', 'peptidos.localhost');
    expect(none.body).toContain('data-state="no-match"');
    expect(none.body).toContain('Ver todas las lecturas');
    const empty = await get('/blog/?category=despensa', 'vacio.localhost');
    expect(empty.body).toContain('data-state="empty-category"');
  });

  test('a Core that cannot answer is a recoverable 503 — never another site', async () => {
    const r = await get('/blog/', 'roto.localhost');
    expect(r.status).toBe(503);
    expect(r.body).toContain('Reintentar');
    expect(r.body).not.toContain('Cocina despacio');
  });
});

test.describe('article', () => {
  test('one slug, two sites, two different posts', async () => {
    const a = await get('/blog/leer-documentacion/', 'peptidos.localhost');
    const b = await get('/blog/leer-documentacion/', 'cuaderno.localhost');
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body).toContain('una guía para leer la documentación');
    expect(b.body).toContain('Leer la receta antes de empezar');
    expect(b.body).not.toContain('documentación de un producto');
  });

  test('index anchors match the rendered headings; quote, table, legal and three related', async () => {
    const r = await get('/blog/numero-lote/', 'peptidos.localhost');
    const anchors = [...r.body.matchAll(/<li data-depth="\d"><a href="#([^"]+)"/g)].map((m) => m[1]);
    expect(anchors.length).toBeGreaterThan(2);
    for (const id of anchors) expect(r.body).toContain(`id="${id}"`);
    expect(r.body).toContain('<blockquote>');
    expect(r.body).toMatch(/<table>[\s\S]*<th>/);
    expect(r.body).toContain('class="legal-box"');
    expect((r.body.match(/class="related"[\s\S]*$/)?.[0].match(/data-post="/g) ?? []).length).toBe(3);
  });

  test('the external CTA spans the page after the reading, never inside the narrow sidebar', async () => {
    // /verify-epic-e2e 2026-11-09: inside the sidebar the full-width block cut its
    // title and pushed its button out of the card (5 px of page overflow at 1440).
    const r = await get('/blog/numero-lote/', 'peptidos.localhost');
    const sidebar = r.body.match(/<aside class="reading-sidebar"[\s\S]*?<\/aside>/)?.[0] ?? '';
    expect(sidebar).not.toBe('');
    expect(sidebar).not.toContain('data-cta');
    const cta = r.body.indexOf('data-cta');
    expect(cta).toBeGreaterThan(r.body.indexOf('class="reading-layout"'));
    expect(cta).toBeLessThan(r.body.indexOf('class="related"'));
  });

  test('a translated post links its twin; an untranslated one does not', async () => {
    const es = await get('/blog/leer-documentacion/', 'cuaderno.localhost');
    expect(es.body).toContain('hreflang="en" href="https://cuaderno.localhost/en/blog/read-the-recipe/"');
    const solo = await get('/blog/frijoles-de-olla/', 'cuaderno.localhost');
    expect(solo.body).not.toContain('hreflang="en"');
    const en = await get('/en/blog/read-the-recipe/', 'cuaderno.localhost');
    expect(en.status).toBe(200);
    expect(en.body).toContain('Read the recipe before you start');
  });

  test('an address the site does not publish is its own 404, never a 503', async () => {
    // /verify-epic-e2e 2026-11-09: the generic 404 needs platform copy an
    // editorial site never writes; every one of these answered 503 + Retry-After.
    for (const path of ['/pricing/', '/cualquier-cosa/', '/en/nada/', '/blog/UPPER/', '/blog/a..b/', '/blog/%C3%B1/', '/blog/x.y/', '/blog/rss.xml']) {
      const r = await get(path, 'cuaderno.localhost');
      expect(r.status, path).toBe(404);
      expect(r.body, path).toContain('Cuaderno');
    }
  });

  test('an unknown slug is the site 404 with its own chrome', async () => {
    const r = await get('/blog/no-existe/', 'peptidos.localhost');
    expect(r.status).toBe(404);
    expect(r.body).toContain('data-preset="editorial-blog"');
    expect(r.body).toContain('Esta lectura no existe.');
  });

  test('an invented slug never costs a body read: existence is decided by the cached list', async () => {
    const peptidosBlog = sites[0].blog!;
    const before = (peptidosBlog.detailReads ?? []).length;
    for (const n of [1, 2, 3]) expect((await get(`/blog/inventado-${n}/`, 'peptidos.localhost')).status).toBe(404);
    expect((peptidosBlog.detailReads ?? []).slice(before).filter((r) => r.includes('inventado'))).toEqual([]);
  });

  test('a body carrying raw HTML is not rendered', async () => {
    const r = await get('/blog/leer-documentacion/', 'html.localhost');
    expect(r.status).toBe(503);
    expect(r.body).not.toContain('<script>alert(1)</script>');
  });
});

test.describe('feeds', () => {
  test('the RSS of an editorial site lists its own posts, never the platform blog', async () => {
    const r = await get('/rss.xml', 'peptidos.localhost');
    expect(r.status).toBe(200);
    expect(r.body).toContain('/blog/numero-lote/');
    expect(r.body).not.toContain('automate-seo-pipeline');
  });
});

test.describe('newsletter', () => {
  const form = 'intent=newsletter&email=lectora%40example.com&consent=true';

  test('enabled: success only after the Core accepted it', async () => {
    const r = await post('/blog/', 'cuaderno.localhost', form, { accept: 'application/json', 'sec-fetch-site': 'same-origin' });
    expect(r.status).toBe(202);
    expect(JSON.parse(r.body)).toEqual({ ok: true });
    expect(cuadernoSite.blog?.captured).toEqual([{ email: 'lectora@example.com', locale: 'es' }]);
  });

  test('disabled: the form is absent and a direct post is refused', async () => {
    const r = await post('/blog/', 'peptidos.localhost', form, { accept: 'application/json', 'sec-fetch-site': 'same-origin' });
    expect(r.status).toBe(404);
    expect(JSON.parse(r.body)).toEqual({ ok: false });
  });

  test('a Core rate limit is «try again later» (503), never «invalid» (422)', async () => {
    // /verify-epic-e2e 2026-11-09: the handler turned the Core's 429 into 422.
    const r = await post('/blog/', 'lleno.localhost', form, { accept: 'application/json', 'sec-fetch-site': 'same-origin' });
    expect(r.status).toBe(503);
    expect(JSON.parse(r.body)).toEqual({ ok: false });
  });

  test('a cross-site post is refused without reaching the Core', async () => {
    const before = cuadernoSite.blog?.captured?.length ?? 0;
    const r = await post('/blog/', 'cuaderno.localhost', form, { accept: 'application/json', 'sec-fetch-site': 'cross-site' });
    // Refused by the site — by Astro's own origin check (403) or by the handler
    // (400) — and in neither case did the Core receive anything.
    expect([400, 403]).toContain(r.status);
    expect(cuadernoSite.blog?.captured?.length ?? 0).toBe(before);
  });

  test('without JavaScript the outcome travels in a one-shot cookie, never in the URL', async () => {
    const r = await post('/blog/', 'cuaderno.localhost', form, { 'sec-fetch-site': 'same-origin', referer: 'http://cuaderno.localhost/' });
    expect(r.status).toBe(303);
    expect(String(r.headers.location)).toBe('/#boletin');
    expect(String(r.headers['set-cookie'])).toContain('ed_newsletter=ok');
  });

  test('a foreign referer never redirects off-site nor exposes the internal route', async () => {
    const r = await post('/blog/', 'cuaderno.localhost', form, { 'sec-fetch-site': 'same-origin', referer: 'https://evil.example/x' });
    expect(r.status).toBe(303);
    expect(String(r.headers.location)).toBe('/blog/#boletin');
  });
});
