import { spawn, type ChildProcess } from 'node:child_process';
import { expect, test } from '@playwright/test';
import type { SiteTenant } from '../src/lib/site-api';
import { getWithHost } from './helpers/http-host';

/** Built SSR with HTTP fixtures and decoded browser images, not the real API/DB bank. */
const appPort = Number(process.env.BRAND_TEST_PORT ?? 4510);
const apiPort = Number(process.env.BRAND_TEST_API_PORT ?? 4511);
const cases = [
  { host: '1platform.localhost', path: '/es/', header: '.brand-header', brand: '.brand-lockup', cta: '.brand-cta' },
  { host: 'medipago.localhost', path: '/', header: '.site-header', brand: '.brand', cta: '[data-support-cta="header"]' },
  { host: 'vendefacil.localhost', path: '/', header: '.site-header', brand: '.brand', cta: '[data-support-cta="header"]' },
];
let preview: ChildProcess | undefined;
let output = '';
const tenants = new Map<string, SiteTenant>();

// One owned fixture process for this file, even when the rest of the suite is parallel.
test.describe.configure({ mode: 'default' });
test.beforeAll(async () => {
  preview = spawn(process.execPath, ['scripts/preview-brand-assets.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, BRAND_PREVIEW_PORT: String(appPort), BRAND_PREVIEW_API_PORT: String(apiPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [preview.stdout, preview.stderr]) stream?.on('data', chunk => { output = (output + String(chunk)).slice(-8_000); });
  preview.on('error', error => { output += error.message; });
  await expect.poll(async () => {
    if (preview?.exitCode !== null) throw new Error(`Brand fixture exited: ${output}`);
    try {
      const response = await getWithHost(`http://127.0.0.1:${appPort}/es/`, '1platform.localhost');
      return response.status === 200 && response.body.includes('tenant-brand-image');
    } catch { return false; }
  }, { timeout: 25_000, message: 'The isolated SSR must render the uploaded brand before browser checks' }).toBe(true);
  for (const { host } of cases) {
    const response = await fetch(`http://127.0.0.1:${apiPort}/api/v1/sites/by-host?host=${host}`);
    expect(response.ok).toBe(true);
    const { data } = await response.json() as { data: SiteTenant };
    tenants.set(host, data);
  }
});

test.afterAll(async () => {
  if (!preview || preview.exitCode !== null) return;
  const child = preview;
  await new Promise<void>(resolve => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5_000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    child.kill('SIGTERM');
  });
});

for (const site of cases) {
  for (const width of [360, 390, 1440]) {
    test(`${site.host}: uploaded logo and independent favicon at ${width}px`, async ({ page }, testInfo) => {
      const tenant = tenants.get(site.host)!;
      expect(tenant.brand_logo).toBeTruthy();
      expect(tenant.brand_favicon).toBeTruthy();
      const logoPath = `/brand/logo/${tenant.brand_logo!.sha256}.png`;
      const iconPath = `/brand/favicon/${tenant.brand_favicon!.sha256}.png`;
      expect(tenant.brand_favicon!.sha256).not.toBe(tenant.brand_logo!.sha256);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const response = await page.goto(`http://${site.host}:${appPort}${site.path}`);
      expect(response?.status()).toBe(200);
      const header = page.locator(site.header);
      const brand = header.locator(site.brand);
      const visibleLogo = brand.locator('.tenant-brand-image[data-variant="lockup"]');
      const image = visibleLogo.locator('img');
      await expect(header).toBeVisible();
      await expect(image).toHaveAttribute('src', logoPath);
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      const brandBox = await brand.boundingBox();
      const logoBox = await visibleLogo.boundingBox();
      expect(brandBox).not.toBeNull();
      expect(logoBox).not.toBeNull();
      expect(logoBox!.width).toBeGreaterThan(0);
      expect(logoBox!.height).toBeGreaterThan(0);
      // The bitmap is cropped deliberately; its visible frame must fit the link.
      expect(logoBox!.x).toBeGreaterThanOrEqual(brandBox!.x - 0.5);
      expect(logoBox!.x + logoBox!.width).toBeLessThanOrEqual(brandBox!.x + brandBox!.width + 0.5);
      expect(logoBox!.y).toBeGreaterThanOrEqual(brandBox!.y - 0.5);
      expect(logoBox!.y + logoBox!.height).toBeLessThanOrEqual(brandBox!.y + brandBox!.height + 0.5);
      const cta = header.locator(site.cta);
      const ctaBox = await cta.isVisible() ? await cta.boundingBox() : null;
      if (ctaBox) expect(logoBox!.x + logoBox!.width).toBeLessThanOrEqual(ctaBox.x);
      // On profiles that hide the CTA at small widths, the menu still must fit.
      for (const control of await header.locator('a:not(:has(.tenant-brand-image)), button').all()) {
        if (!await control.isVisible()) continue;
        const box = await control.boundingBox();
        if (box && box.y < logoBox!.y + logoBox!.height && box.y + box.height > logoBox!.y) {
          expect(logoBox!.x + logoBox!.width).toBeLessThanOrEqual(box.x);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      const favicon = page.locator('link[rel="icon"]');
      await expect(favicon).toHaveAttribute('href', iconPath);
      await expect(favicon).toHaveAttribute('type', 'image/png');
      const iconResponse = await page.evaluate(async path => {
        const response = await fetch(path);
        const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
        return { status: response.status, type: response.headers.get('content-type'), sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') };
      }, iconPath);
      expect(iconResponse.status).toBe(200);
      expect(iconResponse.type).toContain('image/png');
      expect(iconResponse.sha256).toBe(tenant.brand_favicon!.sha256);
      await testInfo.attach('brand-chrome', { body: JSON.stringify({ host: site.host, width, logoPath, iconPath, brandBox, logoBox, ctaBox }), contentType: 'application/json' });
    });
  }
}
