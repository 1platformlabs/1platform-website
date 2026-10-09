import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import { chromium, expect, test, type Browser, type Page } from '@playwright/test';

import { repoTenantForHost } from '../src/data/site-tenants';
import { exportRepoContent, startFakeSiteStack, type FakeSite, type FakeSiteStack, type PagesDocument } from './helpers/fake-site-api';
import { getWithHost } from './helpers/http-host';

/**
 * WRS-04 / WRS-05 — the tenant's social icons in the three footers, and the
 * same URLs as `sameAs`, through the BUILT Node adapter and a fake site API
 * (D-13). Which footer renders is decided by the content profile and the route,
 * not by the manifest, so each footer is reached by host + route:
 *
 *   1platform.pro  /           → InfrastructureFooter (profile=infrastructure)
 *   medipago.gt    /           → the photographic home's footer
 *   medipago.gt    /no-existe  → Footer.astro (the classic chrome's 404)
 *
 * plus a host without the field, one with a rotten value, one whose brand
 * carries replacement markers, and a legacy-blog tenant (the only one that
 * draws LegacyBlogLayout). The network names are spelled only through the
 * labels the site renders; this file is a test, not client-facing code.
 */

const ROOT = process.cwd();
const IG = 'https://www.instagram.com/marca';
const X = 'https://x.com/marca';
const WITH_LINKS = { facebook: null, tiktok: null, instagram: IG, linkedin: null, x: X };

type Fixture = { tenant: FakeSite['tenant']; pagesResponse: { data: { pages: PagesDocument[] } } };
const medipago = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/photographic-site.json'), 'utf8')) as Fixture;
const platform = repoTenantForHost('1platform.pro')!;

function photographic(domain: string, slug: string, overrides: Record<string, unknown>): FakeSite {
  return {
    tenant: { ...medipago.tenant, slug, domain, ...overrides },
    pages: new Map([['es', medipago.pagesResponse.data.pages]]),
  };
}

let stack: FakeSiteStack;
let browser: Browser;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  const content = exportRepoContent(join(ROOT, 'test-results/social-links-content.json'));
  const platformPages = new Map(platform.locales.map((locale) => [locale, content.filter((d) => d.locale === locale)]));
  const legacyPages = new Map([[
    'en',
    content
      .filter((d) => d.locale === 'en')
      // The contract before the infrastructure profile: none of its messages exist.
      .map((d) => ({ ...d, blocks: Object.fromEntries(Object.entries(d.blocks).filter(([key]) => !key.startsWith('interiors.') && !key.startsWith('site.'))) })),
  ]]);
  const sites: FakeSite[] = [
    { tenant: { ...platform, social_links: WITH_LINKS }, pages: platformPages },
    photographic('medipago.gt', 'medipago', { social_links: WITH_LINKS }),
    photographic('sin-redes.example', 'sin-redes', {}),
    photographic('podrido.example', 'podrido', { social_links: 'x' }),
    photographic('podrido-hojas.example', 'podrido-hojas', {
      social_links: { instagram: 'https://[x', x: 'http://x.com/marca', whatsapp: 'https://wa.me/1', facebook: 123 },
    }),
    photographic('marcadores.example', 'marcadores', { brand_name: 'Tienda $& {network}', social_links: WITH_LINKS }),
    {
      tenant: { ...platform, slug: 'legacy-redes', domain: 'legacy-redes.example', locales: ['en'], default_locale: 'en', destinations: { ...platform.destinations, support: null }, social_links: WITH_LINKS },
      pages: legacyPages,
    },
  ];
  stack = await startFakeSiteStack(sites, { host: 'medipago.gt', path: '/' });
  const hosts = sites.map((site) => `MAP ${site.tenant.domain} 127.0.0.1`).join(', ');
  browser = await chromium.launch({ args: [`--host-resolver-rules=${hosts}`] });
});

test.afterAll(async () => {
  await browser?.close();
  await stack?.stop();
});

async function open(host: string, path: string, expectedStatus = 200): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const response = await page.goto(`http://${host}:${stack.port}${path}`);
  expect(response?.status(), `${host}${path}`).toBe(expectedStatus);
  return page;
}

async function hrefs(page: Page): Promise<string[]> {
  return page.locator('[data-social-links] a').evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
}

async function sameAsOf(page: Page, type = 'Organization'): Promise<unknown[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ''));
  const found: unknown[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach(visit);
    const record = value as Record<string, unknown>;
    if (record['@type'] === type) found.push(record.sameAs);
    Object.values(record).forEach(visit);
  };
  blocks.forEach((text) => visit(JSON.parse(text)));
  return found;
}

test('the harness reaches Footer.astro: medipago 404 is the classic footer', async () => {
  const page = await open('medipago.gt', '/no-existe/', 404);
  await expect(page.locator('footer.site-footer .site-footer__bottom')).toHaveCount(1);
  await expect(page.locator('[data-social-links]')).toHaveClass(/social-links--classic/);
  await page.context().close();
});

test('each of the three footers draws exactly the two icons, in order', async () => {
  const cases: [string, string, number, RegExp][] = [
    ['1platform.pro', '/', 200, /social-links--infrastructure/],
    ['medipago.gt', '/', 200, /social-links--photographic/],
    ['medipago.gt', '/no-existe/', 404, /social-links--classic/],
  ];
  for (const [host, path, status, variant] of cases) {
    const page = await open(host, path, status);
    const nav = page.locator('footer [data-social-links]');
    await expect(nav, `${host}${path}`).toHaveCount(1);
    await expect(nav).toHaveClass(variant);
    expect(await hrefs(page), `${host}${path}`).toEqual([IG, X]);
    for (const link of await page.locator('[data-social-links] a').all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true');
      await expect(link.locator('svg')).toHaveAttribute('stroke', 'currentColor');
      await expect(link.locator('svg')).toHaveAttribute('fill', 'none');
    }
    await page.context().close();
  }
});

test('labels come from the local map, in the page language (no t(), es-only tenant)', async () => {
  const es = await open('medipago.gt', '/');
  await expect(es.locator('[data-social-links]')).toHaveAttribute('aria-label', 'Redes sociales');
  expect(await es.locator('[data-social-links] a').evaluateAll((a) => a.map((x) => x.getAttribute('aria-label'))))
    .toEqual(['Medipago en Instagram', 'Medipago en X']);
  await es.context().close();

  const en = await open('1platform.pro', '/');
  await expect(en.locator('[data-social-links]')).toHaveAttribute('aria-label', 'Social media');
  expect(await en.locator('[data-social-links] a').evaluateAll((a) => a.map((x) => x.getAttribute('aria-label'))))
    .toEqual([`${platform.brand_name} on Instagram`, `${platform.brand_name} on X`]);
  await en.context().close();

  const esPlatform = await open('1platform.pro', '/es/');
  await expect(esPlatform.locator('[data-social-links]')).toHaveAttribute('aria-label', 'Redes sociales');
  await esPlatform.context().close();
});

test('a brand with replacement markers is rendered literally', async () => {
  const page = await open('marcadores.example', '/');
  expect(await page.locator('[data-social-links] a').evaluateAll((a) => a.map((x) => x.getAttribute('aria-label'))))
    .toEqual(['Tienda $& {network} en Instagram', 'Tienda $& {network} en X']);
  await page.context().close();
});

test('no field, a rotten object or rotten leaves: 200 and no icons, no sameAs', async () => {
  for (const host of ['sin-redes.example', 'podrido.example', 'podrido-hojas.example']) {
    for (const [path, status] of [['/', 200], ['/no-existe/', 404]] as const) {
      const raw = await getWithHost(`${stack.baseUrl}${path}`, host);
      expect(raw.status, `${host}${path}`).toBe(status);
      expect(raw.body).not.toContain('data-social-links');
      expect(raw.body).not.toContain('"sameAs"');
    }
  }
});

test('the footer passes axe; every target is at least 44×44 with a visible focus ring', async () => {
  for (const [host, path, status] of [['1platform.pro', '/', 200], ['medipago.gt', '/', 200], ['medipago.gt', '/no-existe/', 404]] as const) {
    const page = await open(host, path, status);
    const results = await new AxeBuilder({ page }).include('[data-social-links]').analyze();
    expect(results.violations, `${host}${path}`).toEqual([]);
    for (const link of await page.locator('[data-social-links] a').all()) {
      const box = await link.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const first = page.locator('[data-social-links] a').first();
    await first.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const ring = await first.evaluate((a) => {
      const style = getComputedStyle(a);
      return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor, ink: style.color };
    });
    expect(ring.style, `${host}${path}`).toBe('solid');
    expect(ring.width).toBe('2px');
    // currentColor: the ring is the link's own ink, not the tenant accent.
    expect(ring.color).toBe(ring.ink);
    await page.context().close();
  }
});

test('photographic copyright and social icons share a visual centre, with comfortable mobile targets', async () => {
  const page = await open('medipago.gt', '/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(async () => { await document.fonts.ready; });
    const strip = page.locator('.footer-bottom');
    await strip.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.getAnimations().every((animation) => ['finished', 'idle'].includes(animation.playState)));
    const geometry = await strip.evaluate((footer) => {
      const range = document.createRange();
      range.selectNodeContents(footer.querySelector(':scope > span')!);
      const text = range.getBoundingClientRect();
      const icons = [...footer.querySelectorAll('[data-social-links] svg')].map((icon) => icon.getBoundingClientRect());
      const targets = [...footer.querySelectorAll('[data-social-links] a')].map((link) => link.getBoundingClientRect());
      return {
        textCentre: text.y + text.height / 2,
        iconCentres: icons.map((icon) => icon.y + icon.height / 2),
        icons: icons.map(({ width, height }) => ({ width, height })),
        targets: targets.map(({ width, height }) => ({ width, height })),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(geometry.overflow).toBe(false);
    expect(geometry.icons).toEqual([{ width: 20, height: 20 }, { width: 20, height: 20 }]);
    for (const target of geometry.targets) {
      expect(target.width).toBeGreaterThanOrEqual(width === 390 ? 48 : 44);
      expect(target.height).toBeGreaterThanOrEqual(width === 390 ? 48 : 44);
    }
    if (width === 1440) {
      for (const centre of geometry.iconCentres) expect(Math.abs(centre - geometry.textCentre)).toBeLessThan(2);
    }
  }
  await page.context().close();
});

test('the classic footer rings every link in its own ink, never the tenant accent', async () => {
  // Found by /verify-epic-e2e (2026-10-02): the global ring is the accent, and a
  // navy accent on this footer measured 2.5:1. The logo is the first stop.
  const page = await open('medipago.gt', '/no-existe/', 404);
  const links = page.locator('footer.site-footer a:not([data-social-links] a)');
  expect(await links.count()).toBeGreaterThan(0);
  for (const link of await links.all()) {
    await link.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const ring = await link.evaluate((a) => {
      const style = getComputedStyle(a);
      return { style: style.outlineStyle, color: style.outlineColor, ink: style.color, focused: a.matches(':focus-visible') };
    });
    expect(ring.focused).toBe(true);
    if (ring.style !== 'none') expect(ring.color).toBe(ring.ink);
  }
  await page.context().close();
});

test('sameAs equals the footer in BaseLayout and the photographic home', async () => {
  for (const [host, path, status] of [['1platform.pro', '/pricing/', 200], ['medipago.gt', '/', 200], ['medipago.gt', '/no-existe/', 404]] as const) {
    const page = await open(host, path, status);
    const sameAs = await sameAsOf(page);
    expect(sameAs.length, `${host}${path}`).toBeGreaterThan(0);
    for (const value of sameAs) expect(value).toEqual([IG, X]);
    await page.context().close();
  }
});

test('sameAs rides on the publisher of a legacy blog post', async () => {
  const page = await open('legacy-redes.example', '/blog/automate-seo-pipeline/');
  const publishers = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) =>
    nodes.map((n) => JSON.parse(n.textContent ?? '{}')).filter((b) => b.publisher).map((b) => b.publisher.sameAs));
  expect(publishers.length).toBeGreaterThan(0);
  for (const value of publishers) expect(value).toEqual([IG, X]);
  await page.context().close();
});
