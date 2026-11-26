import { expect, test } from '@playwright/test';

import { repoTenantForHost } from '../src/data/site-tenants';
import { couponsUrl, growthUrl } from '../src/lib/site-destinations';
import { getWithHost } from './helpers/http-host';
import { openTenantPage } from './helpers/tenant-browser';

/**
 * VCR-10 — the Growth landing (epic vertical-crecimiento, issue #205).
 *
 * The page renders in both trees, its CTA is the panel sign-in carrying the
 * Growth section as an encoded `next`, it names no provider or network, and the
 * Solutions page shows its card only because the tenant publishes the route.
 */

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4321);
const BASE = `http://localhost:${PORT}`;
const PLATFORM_HOST = '1platform.pro';
const EN = '/solutions/growth/';
const ES = '/es/soluciones/crecimiento/';
const GROWTH_QUERY = 'next=%2Fmain%2Fgrowth';
const COUPONS_QUERY = 'next=%2Fmain%2Fcoupons';
// Networks too: the landing sells reach, so naming one would read as an
// endorsement the platform has no contract for.
const PROVIDERS = /openai|anthropic|\bmigo\b|tributax|pixabay|pexels|valueserp|publisuites|nicho\.ai|\bstripe\b|\bresend\b|facebook|instagram|tiktok|youtube|spotify|telegram|discord|whatsapp|google|\bmeta\b/i;

const visibleText = (html: string) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

const ctaHrefs = (html: string, label: string) =>
  [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>\s*([^<]*?)\s*<\/a>/g)].filter((m) => m[2] === label).map((m) => m[1]);

test('the CTA helpers build the exact encoded login href, and nothing without a panel', () => {
  const platform = repoTenantForHost(PLATFORM_HOST)!;
  for (const [helper, query] of [[growthUrl, GROWTH_QUERY], [couponsUrl, COUPONS_QUERY]] as const) {
    expect(helper({ tenant: platform })).toBe(`https://app.1platform.pro/app/auth/login?${query}`);
    const noPanel = { ...platform, destinations: { ...platform.destinations, app: null } };
    expect(helper({ tenant: noPanel })).toBeNull();
    // The login lives UNDER the panel's basename; a base without its trailing
    // slash must not lose its last segment.
    const bare = { ...platform, destinations: { ...platform.destinations, app: 'https://panel.example/app' } };
    expect(helper({ tenant: bare })).toBe(`https://panel.example/app/auth/login?${query}`);
    // A base that already is the sign-in is used as is (website#169).
    for (const app of ['https://app.1platform.pro/app/auth/login', 'https://app.1platform.pro/app/auth/login/?x=1']) {
      const login = { ...platform, destinations: { ...platform.destinations, app } };
      expect(helper({ tenant: login })).toBe(`https://app.1platform.pro/app/auth/login?${query}`);
    }
  }
});

for (const [locale, path, headline, cta] of [
  ['en', EN, 'Order reach for your profiles and sites from the same panel.', 'Place an order'],
  ['es', ES, 'Pide alcance para tus perfiles y sitios desde el mismo panel.', 'Hacer un pedido'],
] as const) {
  test(`the ${locale} page renders, its CTA is the encoded login href and it names no provider`, async () => {
    const res = await getWithHost(BASE + path, PLATFORM_HOST);
    expect(res.status).toBe(200);
    expect(res.body).toContain(headline);
    const hrefs = ctaHrefs(res.body, cta);
    expect(hrefs.length, 'the CTA is missing — a broken probe would pass the checks below').toBeGreaterThanOrEqual(2);
    for (const href of hrefs) expect(href).toBe(`https://app.1platform.pro/app/auth/login?${GROWTH_QUERY}`);
    expect(visibleText(res.body)).not.toMatch(PROVIDERS);
    expect(res.body).toMatch(/<main[\s\S]*<h1/);
  });

  test(`the four steps use the full desktop row and nothing overflows the phone at ${path}`, async () => {
    const { browser, page } = await openTenantPage(PLATFORM_HOST, path);
    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      const steps = page.locator('#how-it-works .spine');
      await expect(steps.locator('li')).toHaveCount(4);
      expect(await steps.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(4);
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await steps.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    } finally {
      await browser.close();
    }
  });
}

test('the Solutions page links the Growth card in both languages', async () => {
  for (const [path, href, title] of [
    ['/solutions/', EN, 'Growth'],
    ['/es/soluciones/', ES, 'Crecimiento'],
  ] as const) {
    const res = await getWithHost(BASE + path, PLATFORM_HOST);
    expect(res.status).toBe(200);
    expect(res.body, `${path} must link ${href}`).toContain(`href="${href}"`);
    expect(visibleText(res.body)).toContain(title);
  }
});
