import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { repoTenantForHost } from '../src/data/site-tenants';
import { plateOrderUrl } from '../src/lib/site-destinations';
import { exportRepoContent, startFakeSiteStack, type FakeSiteStack, type PagesDocument } from './helpers/fake-site-api';
import { getWithHost } from './helpers/http-host';
import { openTenantPage } from './helpers/tenant-browser';

/**
 * PNF-07 — the review plates landing (epic vertical-placas-nfc, D-11).
 *
 * Three things must hold: the page renders in both trees, its CTA is the
 * login route carrying the order form as an encoded `next`, and no provider or
 * network name is ever visible. The tenant half runs the production dictionary
 * path (`SITE_MANIFEST_SOURCE=api`), where the page dictionary is ONLY what the
 * tenant published — so a page that carried literal copy, or a key staff forgot
 * to PUT, would show up here.
 */

const ROOT = process.cwd();
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4321);
const BASE = `http://localhost:${PORT}`;
const PLATFORM_HOST = '1platform.pro';
const ROUTE = '/solutions/review-plates/';
const EXPECTED_QUERY = 'next=%2Fmain%2Fplates%2Forders%3Fnew%3D1';
const PROVIDERS = /openai|anthropic|\bmigo\b|tributax|pixabay|pexels|valueserp|publisuites|nicho\.ai|\bstripe\b|\bresend\b|facebook|instagram|whatsapp|google|\bmeta\b/i;

const visibleText = (html: string) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

const ctaHrefs = (html: string, label: string) =>
  [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>\s*([^<]*?)\s*<\/a>/g)].filter((m) => m[2] === label).map((m) => m[1]);

for (const path of [ROUTE, '/es/soluciones/placas/']) {
  test(`reduced motion keeps keyboard anchor navigation at ${path}`, async () => {
    const { browser, page } = await openTenantPage(PLATFORM_HOST, path);
    try {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      const link = page.locator('.hero a[href="#how-it-works"]');
      await link.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#how-it-works$/);
      await expect(page.locator('#how-it-works')).toBeInViewport();
    } finally {
      await browser.close();
    }
  });

  test(`the four steps use the full desktop row at ${path}`, async () => {
    const { browser, page } = await openTenantPage(PLATFORM_HOST, path);
    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      const steps = page.locator('#how-it-works .spine');
      await expect(steps.locator('li')).toHaveCount(4);
      const columns = await steps.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      expect(columns, 'four steps must not leave two empty desktop columns').toBe(4);
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await steps.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    } finally {
      await browser.close();
    }
  });
}

test('the CTA helper builds the exact encoded login href, and nothing without a panel', () => {
  const platform = repoTenantForHost(PLATFORM_HOST)!;
  expect(plateOrderUrl({ tenant: platform })).toBe(`https://app.1platform.pro/app/auth/login?${EXPECTED_QUERY}`);
  const noPanel = { ...platform, destinations: { ...platform.destinations, app: null } };
  expect(plateOrderUrl({ tenant: noPanel })).toBeNull();
  // The login lives UNDER the panel's basename; a base without its trailing
  // slash must not lose its last segment.
  const bare = { ...platform, destinations: { ...platform.destinations, app: 'https://panel.example/app' } };
  expect(plateOrderUrl({ tenant: bare })).toBe(`https://panel.example/app/auth/login?${EXPECTED_QUERY}`);
  // PROD's `oneplatform` publishes the sign-in itself as `destinations.app`:
  // it is used as is, never as `/auth/login/auth/login` (website#169).
  for (const app of ['https://app.1platform.pro/app/auth/login', 'https://app.1platform.pro/app/auth/login/', 'https://app.1platform.pro/app/auth/login?x=1']) {
    const login = { ...platform, destinations: { ...platform.destinations, app } };
    expect(plateOrderUrl({ tenant: login })).toBe(`https://app.1platform.pro/app/auth/login?${EXPECTED_QUERY}`);
  }
});

for (const [locale, path, headline, cta] of [
  ['en', ROUTE, 'One plate on the counter', 'Order my plates'],
  ['es', '/es/soluciones/placas/', 'Una placa en el mostrador', 'Pedir mis placas'],
] as const) {
  test(`the ${locale} page renders, its CTA is the encoded login href and it names no provider`, async () => {
    const res = await getWithHost(BASE + path, PLATFORM_HOST);
    expect(res.status).toBe(200);
    expect(res.body).toContain(headline);
    const hrefs = ctaHrefs(res.body, cta);
    expect(hrefs.length, 'the CTA is missing — a broken probe would pass the checks below').toBeGreaterThanOrEqual(2);
    for (const href of hrefs) expect(href).toBe(`https://app.1platform.pro/app/auth/login?${EXPECTED_QUERY}`);
    expect(visibleText(res.body)).not.toMatch(PROVIDERS);
    expect(res.body).toMatch(/<main[\s\S]*<h1/);
  });
}

test.describe('tenant mode (API manifest)', () => {
  test.describe.configure({ mode: 'serial' });
  let stack: FakeSiteStack;
  const platform = repoTenantForHost(PLATFORM_HOST)!;

  // The platform's own copy, re-worded the way staff would PUT it for a tenant
  // that is not 1Platform: nothing in it may say so.
  const rebrand = (documents: PagesDocument[]): PagesDocument[] =>
    documents.map((d) => ({
      ...d,
      blocks: Object.fromEntries(
        Object.entries(d.blocks).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/1Platform/g, 'Clínica Delta') : v]),
      ),
    }));

  test.beforeAll(async () => {
    const content = exportRepoContent(join(ROOT, 'test-results/review-plates-content.json'));
    const pagesFor = (docs: PagesDocument[]) => new Map(platform.locales.map((locale) => [locale, docs.filter((d) => d.locale === locale)]));
    const tenantDestinations = { docs: null, app: 'https://panel.delta.example/app/', support: null, status: null };
    const base = { ...platform, brand: { ...(platform as { brand?: object }).brand } };
    stack = await startFakeSiteStack(
      [
        { tenant: { ...platform }, pages: pagesFor(content) },
        { tenant: { ...base, slug: 'delta', domain: 'delta.example', destinations: tenantDestinations }, pages: pagesFor(rebrand(content)) },
        { tenant: { ...base, slug: 'sin-panel', domain: 'sin-panel.example', destinations: { ...tenantDestinations, app: null } }, pages: pagesFor(rebrand(content)) },
      ],
      { host: PLATFORM_HOST, path: '/' },
    );
  });

  test.afterAll(async () => {
    await stack?.stop();
  });

  test('a tenant with a panel points the CTA at ITS panel, in both languages', async () => {
    for (const [path, cta] of [[ROUTE, 'Order my plates'], ['/es/soluciones/placas/', 'Pedir mis placas']] as const) {
      const res = await getWithHost(`${stack.baseUrl}${path}`, 'delta.example');
      expect(res.status, stack.log()).toBe(200);
      const hrefs = ctaHrefs(res.body, cta);
      expect(hrefs.length).toBeGreaterThanOrEqual(2);
      for (const href of hrefs) expect(href).toBe(`https://panel.delta.example/app/auth/login?${EXPECTED_QUERY}`);
      expect(res.body).not.toContain('app.1platform.pro');
    }
  });

  test('a tenant without a panel renders the page and no CTA', async () => {
    const res = await getWithHost(`${stack.baseUrl}${ROUTE}`, 'sin-panel.example');
    expect(res.status, stack.log()).toBe(200);
    expect(res.body).toContain('One plate on the counter');
    expect(ctaHrefs(res.body, 'Order my plates')).toEqual([]);
    expect(res.body).not.toContain('/auth/login');
  });

  test('the platform itself, in API mode, still renders it with its own panel', async () => {
    const res = await getWithHost(`${stack.baseUrl}${ROUTE}`, PLATFORM_HOST);
    expect(res.status, stack.log()).toBe(200);
    expect(ctaHrefs(res.body, 'Order my plates')[0]).toBe(`https://app.1platform.pro/app/auth/login?${EXPECTED_QUERY}`);
  });
});
