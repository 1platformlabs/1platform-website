import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import { chromium, expect, test, type Browser, type Page } from '@playwright/test';

import { repoTenantForHost } from '../src/data/site-tenants';
import { __testing, parseSiteReviews, resolveSiteReviews } from '../src/lib/site-reviews';
import { exportRepoContent, startFakeSiteStack, type FakeSite, type FakeSiteStack, type PagesDocument } from './helpers/fake-site-api';

/**
 * landing-reviews-tenant LRT-08 — the reviews block on each tenant's landing.
 *
 * Two halves. The first runs no browser: the parser and the cache contract of
 * `src/lib/site-reviews.ts` with an injected clock and a stubbed `fetch` —
 * that is where "a change reaches the landing within a minute" is a fact and
 * not a promise. The second runs the BUILT Node adapter in API mode against a
 * fake site API and three tenants, each with its own reviews, and looks at the
 * page as a visitor would.
 */

const ROOT = process.cwd();

type Review = { author: string; context: string | null; body: string; rating: number; source: string; date: string };

function section(reviews: Review[], overrides: Record<string, unknown> = {}) {
  const histogram: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  reviews.forEach((r) => (histogram[String(r.rating)] += 1));
  const average = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 100) / 100 : null;
  return {
    enabled: true,
    title: 'Experiencias que nos acercan',
    subtitle: 'La experiencia de cobrar, desde el consultorio',
    sort: 'featured',
    page_size: 3,
    summary: { count: reviews.length, average, histogram },
    reviews,
    ...overrides,
  };
}

const MEDIPAGO_REVIEWS: Review[] = [
  { author: 'Daniela C.', context: 'Consultorio general', body: 'Tener el cobro por enlace y la consulta de pagos en un mismo lugar simplifica nuestra revisión del día.', rating: 5, source: 'direct', date: '2026-09-28' },
  { author: 'Jorge A.', context: 'Clínica dental', body: 'El desglose del cobro es claro.', rating: 4, source: 'whatsapp', date: '2026-09-27' },
  { author: 'Sofía R.', context: 'Administración de clínica', body: 'Es práctico consultar el estado de un pago.', rating: 5, source: 'manual', date: '2026-09-26' },
  { author: 'Mariana L.', context: null, body: 'Las opciones de cobro están bien explicadas.', rating: 4, source: 'direct', date: '2026-09-25' },
];
const VENDE_REVIEWS: Review[] = [
  { author: 'Valeria P.', context: 'Tienda de accesorios', body: 'El enlace de pago nos permite compartir el cobro a distancia.', rating: 5, source: 'direct', date: '2026-09-28' },
];

// ── half 1: the module, no browser ────────────────────────────────────────

test.describe('site-reviews module', () => {
  const realFetch = globalThis.fetch;
  const realSource = process.env.SITE_MANIFEST_SOURCE;
  const realBase = process.env.SITE_API_BASE_URL;
  let calls: string[] = [];
  let answer: () => Response = () => new Response('{}', { status: 500 });

  test.beforeEach(() => {
    __testing.cache.reset();
    calls = [];
    process.env.SITE_MANIFEST_SOURCE = 'api';
    process.env.SITE_API_BASE_URL = 'https://api.test';
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return answer();
    }) as typeof fetch;
  });
  test.afterEach(() => {
    globalThis.fetch = realFetch;
    process.env.SITE_MANIFEST_SOURCE = realSource;
    process.env.SITE_API_BASE_URL = realBase;
  });

  const json = (body: unknown, status = 200) => () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  test('parses the section and keeps the server summary only when it is coherent', () => {
    const parsed = parseSiteReviews(section(MEDIPAGO_REVIEWS));
    expect(parsed?.summary).toEqual({ count: 4, average: 4.5, histogram: { '1': 0, '2': 0, '3': 0, '4': 2, '5': 2 } });
    expect(parsed?.reviews).toHaveLength(4);
    // A count that disagrees with its histogram is how a rating nobody gave gets printed.
    expect(parseSiteReviews(section(MEDIPAGO_REVIEWS, { summary: { count: 9, average: 4.5, histogram: { '1': 0, '2': 0, '3': 0, '4': 2, '5': 2 } } }))).toBeNull();
    expect(parseSiteReviews(section([], { summary: { count: 0, average: 3, histogram: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } } }))).toBeNull();
    // A malformed review is dropped, not shown with a made-up rating.
    const withBad = { ...section(MEDIPAGO_REVIEWS), reviews: [...MEDIPAGO_REVIEWS, { ...MEDIPAGO_REVIEWS[0], rating: 7 }] };
    expect(parseSiteReviews(withBad)?.reviews).toHaveLength(4);
    expect(parseSiteReviews({ enabled: false })?.enabled).toBe(false);
    expect(parseSiteReviews({ enabled: true, title: '' })).toBeNull();
  });

  test('a change reaches the landing after the freshness window, through ONE background refresh', async () => {
    let current = section(MEDIPAGO_REVIEWS);
    answer = () => json({ success: true, data: current })();
    const t0 = 1_000_000;
    expect((await resolveSiteReviews('medipago', t0))?.reviews).toHaveLength(4);
    expect(calls).toHaveLength(1);
    current = section(MEDIPAGO_REVIEWS.slice(1)); // the owner hid one
    expect((await resolveSiteReviews('medipago', t0 + 30_000))?.reviews).toHaveLength(4); // fresh: no request
    expect(calls).toHaveLength(1);
    expect((await resolveSiteReviews('medipago', t0 + 61_000))?.reviews).toHaveLength(4); // stale copy served…
    await expect.poll(() => calls.length).toBe(2); // …while one refresh runs
    await expect.poll(async () => (await resolveSiteReviews('medipago', t0 + 62_000))?.reviews.length).toBe(3);
  });

  test('switching the section off removes it after the same window', async () => {
    let current: unknown = section(MEDIPAGO_REVIEWS);
    answer = () => json({ success: true, data: current })();
    expect(await resolveSiteReviews('medipago', 0)).not.toBeNull();
    current = { enabled: false, title: null, subtitle: null, sort: 'featured', page_size: 3, summary: { count: 0, average: null, histogram: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } }, reviews: [] };
    await resolveSiteReviews('medipago', 61_000);
    await expect.poll(async () => resolveSiteReviews('medipago', 62_000)).toBeNull();
  });

  test('the cache is keyed by tenant: one site never reads another site’s entry', async () => {
    answer = () => json({ success: true, data: section(MEDIPAGO_REVIEWS) })();
    await resolveSiteReviews('medipago', 0);
    answer = () => json({ success: true, data: section(VENDE_REVIEWS) })();
    expect((await resolveSiteReviews('vendefacil', 0))?.reviews.map((r) => r.author)).toEqual(['Valeria P.']);
    expect((await resolveSiteReviews('medipago', 1))?.reviews).toHaveLength(4);
    expect(calls).toEqual(['https://api.test/api/v1/sites/medipago/reviews', 'https://api.test/api/v1/sites/vendefacil/reviews']);
  });

  test('a silent API omits the section and is not asked again for the negative window', async () => {
    answer = json({ success: false }, 503);
    expect(await resolveSiteReviews('medipago', 0)).toBeNull();
    expect(await resolveSiteReviews('medipago', 10_000)).toBeNull();
    expect(calls).toHaveLength(1);
    answer = () => json({ success: true, data: section(MEDIPAGO_REVIEWS) })();
    expect(await resolveSiteReviews('medipago', 31_000)).not.toBeNull();
  });

  test('an API without the route (404) draws no section', async () => {
    answer = json({ success: false }, 404);
    expect(await resolveSiteReviews('medipago', 0)).toBeNull();
  });

  test('repo mode never asks the API', async () => {
    process.env.SITE_MANIFEST_SOURCE = 'repo';
    expect(await resolveSiteReviews('medipago', 0)).toBeNull();
    expect(calls).toHaveLength(0);
  });
});

// ── half 2: the built site, three tenants ─────────────────────────────────

type Fixture = { tenant: FakeSite['tenant']; pagesResponse: { data: { pages: PagesDocument[] } } };
const medipago = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/photographic-site.json'), 'utf8')) as Fixture;
const vendefacil = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/vendefacil-site.json'), 'utf8')) as Fixture;
const platform = repoTenantForHost('1platform.pro')!;

const answers: Record<string, () => { status: number; body?: unknown }> = {
  medipago: () => ({ status: 200, body: { success: true, data: section(MEDIPAGO_REVIEWS), msg: 'ok' } }),
  vendefacil: () => ({ status: 200, body: { success: true, data: section(VENDE_REVIEWS, { title: 'Cada negocio tiene una historia', subtitle: null }), msg: 'ok' } }),
  oneplatform: () => ({ status: 200, body: { success: true, data: section(MEDIPAGO_REVIEWS.slice(0, 2), { title: 'Experiencias de quienes construyen', subtitle: null, sort: 'newest' }), msg: 'ok' } }),
  apagado: () => ({ status: 200, body: { success: true, data: { enabled: false, title: null, subtitle: null, sort: 'featured', page_size: 3, summary: { count: 0, average: null, histogram: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } }, reviews: [] }, msg: 'ok' } }),
  caido: () => ({ status: 503 }),
  vacio: () => ({ status: 200, body: { success: true, data: section([]), msg: 'ok' } }),
};

let stack: FakeSiteStack;
let browser: Browser;
const HOSTS = ['medipago.gt', 'vendefacil.1platform.pro', '1platform.pro', 'apagado.example', 'caido.example', 'vacio.example'];

test.describe('landing reviews in the browser', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const content = exportRepoContent(join(ROOT, 'test-results/landing-reviews-content.json'));
    const platformPages = new Map(platform.locales.map((locale) => [locale, content.filter((d) => d.locale === locale)]));
    const photographic = (domain: string, slug: string): FakeSite => ({
      tenant: { ...medipago.tenant, slug, domain },
      pages: new Map([['es', medipago.pagesResponse.data.pages]]),
      reviews: answers[slug],
    });
    const sites: FakeSite[] = [
      { tenant: medipago.tenant, pages: new Map([['es', medipago.pagesResponse.data.pages]]), reviews: answers.medipago },
      { tenant: vendefacil.tenant, pages: new Map([['es', vendefacil.pagesResponse.data.pages]]), reviews: answers.vendefacil },
      { tenant: { ...platform, slug: 'oneplatform' }, pages: platformPages, reviews: answers.oneplatform },
      photographic('apagado.example', 'apagado'),
      photographic('caido.example', 'caido'),
      photographic('vacio.example', 'vacio'),
    ];
    stack = await startFakeSiteStack(sites, { host: 'medipago.gt', path: '/' });
    browser = await chromium.launch({ args: [`--host-resolver-rules=${HOSTS.map((h) => `MAP ${h} 127.0.0.1`).join(', ')}`] });
  });

  test.afterAll(async () => {
    await browser?.close();
    await stack?.stop();
  });

  async function open(host: string, options: { width?: number; height?: number; javaScriptEnabled?: boolean; reducedMotion?: 'reduce' | 'no-preference'; path?: string } = {}): Promise<Page> {
    const context = await browser.newContext({ viewport: { width: options.width ?? 1440, height: options.height ?? 900 }, javaScriptEnabled: options.javaScriptEnabled ?? true });
    const page = await context.newPage();
    if (options.reducedMotion) await page.emulateMedia({ reducedMotion: options.reducedMotion });
    const response = await page.goto(`http://${host}:${stack.port}${options.path ?? '/'}`);
    expect(response?.status(), host).toBe(200);
    return page;
  }

  const cards = (page: Page) => page.locator('#resenas .lr-list-item:not([hidden])');

  test('Medipago: its own reviews before the closing section, global summary, first page only', async () => {
    const page = await open('medipago.gt');
    const block = page.locator('#resenas');
    await expect(block.getByRole('heading', { level: 2, name: 'Experiencias que nos acercan' })).toBeVisible();
    await expect(block.locator('.lr-average')).toContainText(/4[.,]5/);
    await expect(block.locator('.lr-score-label')).toHaveText('4 reseñas publicadas');
    await expect(cards(page)).toHaveCount(3);
    // The block sits right before the closing section and after the FAQ.
    const order = await page.evaluate(() => [...document.querySelectorAll('main > section')].map((s) => s.id || s.className));
    expect(order.indexOf('resenas')).toBe(order.indexOf('closing-section') - 1);
    expect(order.indexOf('resenas')).toBeGreaterThan(order.indexOf('preguntas'));
    // Nothing of another tenant.
    await expect(block).not.toContainText('Valeria P.');
  });

  test('«Ver más» adds a page and moves focus to the first new review', async () => {
    const page = await open('medipago.gt');
    await page.getByRole('button', { name: 'Ver más reseñas' }).click();
    await expect(cards(page)).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'Ver más reseñas' })).toBeHidden();
    await expect(page.locator(':focus')).toHaveAttribute('aria-label', 'Reseña de Mariana L.');
    await expect(page.locator('#resenas [data-lr-count]')).toHaveText('4 de 4 reseñas');
  });

  test('the star filter narrows the list but never the summary; empty filter offers to clear', async () => {
    const page = await open('medipago.gt');
    const select = page.getByLabel('Valoración');
    await select.selectOption('4');
    await expect(cards(page)).toHaveCount(2);
    await expect(page.locator('#resenas .lr-average')).toContainText(/4[.,]5/);
    await select.selectOption('1');
    await expect(page.getByText('Todavía no hay reseñas con esta valoración')).toBeVisible();
    await page.getByRole('button', { name: 'Ver todas las reseñas' }).click();
    await expect(cards(page)).toHaveCount(3);
    await expect(select).toBeFocused();
    await expect(page.locator('#resenas [data-lr-status]')).toHaveText('Se muestran todas las valoraciones');
  });

  test('without JavaScript every review is readable and the script-only controls stay hidden', async () => {
    const page = await open('medipago.gt', { javaScriptEnabled: false });
    await expect(page.locator('#resenas .lr-list-item')).toHaveCount(4);
    await expect(page.locator('#resenas [data-lr-toolbar]')).toBeHidden();
    await expect(page.locator('#resenas [data-lr-more-wrap]')).toBeHidden();
  });

  test('Vende Fácil keeps its own identity and copy, and a single review has no «Ver más»', async () => {
    const page = await open('vendefacil.1platform.pro');
    const block = page.locator('#resenas');
    await expect(block.getByRole('heading', { level: 2 })).toHaveText('Cada negocio tiene una historia');
    await expect(block.locator('.lr-subtitle')).toHaveCount(0);
    await expect(block).not.toContainText('Daniela C.');
    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Ver más reseñas' })).toBeHidden();
    const accent = await block.locator('.lr-eyebrow').evaluate((el) => getComputedStyle(el).color);
    expect(accent).toBe('rgb(23, 72, 167)'); // #1748a7, its own accent
    // Its access entry points (sign in / request access) are untouched.
    await expect(page.locator('[data-access-entry]').first()).toBeAttached();
    await expect(page.locator('a[href$="/solicitar-acceso/"], a[href$="/request-access/"]').first()).toBeAttached();
  });

  test('1Platform (infrastructure home): before the contact section, its own order', async () => {
    const page = await open('1platform.pro', { path: '/es/' });
    const ids = await page.evaluate(() => [...document.querySelectorAll('section[id]')].map((s) => s.id));
    expect(ids.indexOf('resenas')).toBe(ids.indexOf('contacto') - 1);
    await expect(page.locator('#resenas .lr-author strong')).toHaveText(['Daniela C.', 'Jorge A.']);
  });

  test('a section switched off, an API that fails, and no public reviews', async () => {
    const off = await open('apagado.example');
    await expect(off.locator('#resenas')).toHaveCount(0);
    await expect(off.locator('.closing-section')).toBeVisible();
    const down = await open('caido.example');
    await expect(down.locator('#resenas')).toHaveCount(0);
    await expect(down.locator('.closing-section')).toBeVisible();
    const empty = await open('vacio.example');
    await expect(empty.getByText('Las primeras opiniones aparecerán aquí')).toBeVisible();
    await expect(empty.locator('#resenas .lr-summary')).toHaveCount(0); // no invented rating
    await expect(empty.locator('#resenas [data-lr-toolbar]')).toHaveCount(0);
  });

  for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['landscape', 844, 390]] as const) {
    test(`no horizontal overflow (${label})`, async () => {
      const page = await open('medipago.gt', { width, height });
      await page.locator('#resenas').scrollIntoViewIfNeeded();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const columns = await page.locator('#resenas .lr-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(width >= 1101 ? 3 : width > 600 ? 2 : 1);
    });
  }

  // On the 1Platform host, not only Medipago's: the photographic home resets
  // every transition under `reduce` by itself, so there the block's own rule is
  // invisible (negative control W6 stayed green). The infrastructure home has
  // no such blanket reset — only the block's media query can hold it there.
  test('reduced motion: the buttons do not transition', async () => {
    for (const [host, path] of [['1platform.pro', '/es/'], ['medipago.gt', '/']] as const) {
      const page = await open(host, { reducedMotion: 'reduce', path });
      const transition = await page.locator('#resenas [data-lr-more]').evaluate((el) => getComputedStyle(el).transitionDuration);
      expect(transition, host).toBe('0s');
    }
    const moving = await open('1platform.pro', { reducedMotion: 'no-preference', path: '/es/' });
    expect(await moving.locator('#resenas [data-lr-more]').evaluate((el) => getComputedStyle(el).transitionDuration)).not.toBe('0s');
  });

  test('keyboard: the filter and «Ver más» are reachable, focus is visible', async () => {
    const page = await open('medipago.gt');
    await page.getByLabel('Valoración').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Ver más reseñas' })).toBeFocused();
    const outline = await page.locator(':focus').evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page.locator(':focus')).toHaveAttribute('aria-label', 'Reseña de Mariana L.');
  });

  test('axe: the block has no violations', async () => {
    const page = await open('medipago.gt');
    const results = await new AxeBuilder({ page }).include('#resenas').analyze();
    expect(results.violations).toEqual([]);
  });
});
