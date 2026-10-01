import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { environmentDestination, supportUrl } from '../src/lib/site-destinations';
import { repoContentOverrides, repoTenantForHost } from '../src/data/site-tenants';

const platform = repoTenantForHost('1platform.pro')!;
const clinic = repoTenantForHost('clinicas.1platform.dev')!;

test('tenant destinations reject executable URLs, credentials and public cleartext', () => {
  for (const destination of ['javascript:alert(1)', 'data:text/html,hello', 'https://user:pass@example.com/', 'http://example.com/']) {
    expect(() => environmentDestination(destination)).toThrow('Invalid tenant destination');
  }
  expect(supportUrl({ tenant: clinic })).toBeNull();
  expect(supportUrl({ tenant: platform })).toBe('https://wa.me/50253946564');
});

test('an origin mapping preserves paths, parameters and deep links without leaking to another origin', () => {
  const previous = process.env.SITE_DESTINATION_ORIGINS;
  try {
    process.env.SITE_DESTINATION_ORIGINS = JSON.stringify({ 'https://developer.1platform.pro': 'http://localhost:4473' });
    expect(environmentDestination('https://developer.1platform.pro/api-reference/1platform-api?mode=dark#tag/auth')).toBe('http://localhost:4473/api-reference/1platform-api?mode=dark#tag/auth');
    expect(environmentDestination('https://customer.example/docs')).toBe('https://customer.example/docs');
    for (const mapped of ['javascript:alert(1)', 'http://remote.example/', 'https://user:pass@example.com/', 'https://example.com/path']) {
      process.env.SITE_DESTINATION_ORIGINS = JSON.stringify({ 'https://developer.1platform.pro': mapped });
      expect(() => environmentDestination('https://developer.1platform.pro/')).toThrow('Invalid destination origin');
    }
  } finally {
    if (previous === undefined) delete process.env.SITE_DESTINATION_ORIGINS;
    else process.env.SITE_DESTINATION_ORIGINS = previous;
  }
});

test('the local content profile is explicit for each tenant and defaults to its existing composition', () => {
  expect(repoContentOverrides(platform)['site.theme.profile']).toBe('infrastructure');
  expect(repoContentOverrides(clinic)['site.theme.profile']).toBe('classic');
  expect(repoContentOverrides({ ...clinic, slug: 'new-tenant' })['site.theme.profile']).toBe('classic');
});

test('canonical palette keeps the seven approved semantic roles', () => {
  const tokens = JSON.parse(readFileSync('src/styles/brand-tokens.json', 'utf8'));
  expect(tokens).toEqual({ navy: '#0d1c3a', navyDeep: '#08152f', blue: '#2854a7', text: '#172640', textSecondary: '#5c697b', surfaceSecondary: '#f2f5f7', selection: '#edf2fa' });
});

test('commercial navigation, locale and redirects preserve the current routes', async ({ page, request }) => {
  await page.goto('/es/blog/');
  await expect(page.locator('.brand-nav a')).toHaveText(['Soluciones', 'Infraestructura', 'IA', 'Blog', 'Documentación', 'Contacto']);
  await expect(page.locator('.brand-nav a').nth(4)).toHaveAttribute('href', 'https://developer.1platform.pro/docs/saas/1platform-api/getting-started');
  await expect(page.locator('.brand-cta')).toHaveAttribute('href', 'https://wa.me/50253946564');
  await page.locator('.brand-languages [data-lang-choice="en"]').click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  for (const path of ['/for-developers/', '/es/para-desarrolladores/']) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe('https://developer.1platform.pro/docs/saas/1platform-api/getting-started');
    const tagged = await request.get(`${path}?utm_source=newsletter&ref=a%20b`, { maxRedirects: 0 });
    expect(tagged.status()).toBe(301);
    expect(tagged.headers().location).toBe('https://developer.1platform.pro/docs/saas/1platform-api/getting-started?utm_source=newsletter&ref=a%20b');
  }
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap).not.toMatch(/for-developers|para-desarrolladores/);
});

test('compact navigation traps focus, closes with Escape and keeps language controls available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/es/');
  const toggle = page.locator('.brand-menu-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.press('Tab');
  await expect(page.locator('.brand-mobile-nav a').first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.brand-languages')).toBeVisible();
});

test('every chrome control lives inside a landmark, language selector included', async ({ page }) => {
  // Found by the real-bank E2E: the language selector sat outside every landmark (axe `region`).
  for (const [path, width] of [['/', 1440], ['/es/', 390], ['/es/blog/', 1440]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path);
    await expect(page.locator('nav.brand-languages')).toHaveAttribute('aria-label', /Language|Idioma/);
    const axe = await new AxeBuilder({ page }).withRules(['region']).analyze();
    expect(axe.violations.map(v => v.nodes.map(n => n.target))).toEqual([]);
  }
});
