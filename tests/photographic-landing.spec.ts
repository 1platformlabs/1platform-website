import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import { chromium, expect, test as base, type Browser, type Page } from '@playwright/test';
import type { SiteTenant } from '../src/lib/site-api';
import { repoTenantForHost } from '../src/data/site-tenants';
import { getWithHost } from './helpers/http-host';

/**
 * Built Astro/Node integration with contractual HTTP responses and actual Host
 * resolution. This is intentionally not the private-DB /verify-epic-e2e bank.
 */
type SiteFixture = {
  tenant: SiteTenant;
  pagesResponse: {
    success: boolean;
    data: {
      slug: string;
      locale: string;
      pages: { route: string; locale: string; blocks: Record<string, string> }[];
      messages: Record<string, string>;
    };
    msg: string;
  };
};

const ROOT = process.cwd();
const fixture = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/photographic-site.json'), 'utf8')) as SiteFixture;
const HOST = 'medipago.gt';
const PLATFORM_HOST = '1platform.pro';
const platformTenant = repoTenantForHost(PLATFORM_HOST)!;
const platformContent = new Map<string, SiteFixture['pagesResponse']>();
const ALTERNATE_HOST = 'aurora-photographic.example';
const ALTERNATE_NAME = 'Salud Aurora';
const alternate: SiteFixture = JSON.parse(JSON.stringify(fixture).replaceAll('Medipago', ALTERNATE_NAME));
alternate.tenant = {
  ...alternate.tenant,
  slug: 'photographic-aurora',
  domain: ALTERNATE_HOST,
  brand_name: ALTERNATE_NAME,
  brand_wordmark: ALTERNATE_NAME,
  brand_mark: 'A',
  brand_assets: null,
  theme: { ...alternate.tenant.theme, accent: '#233c8f', display_font: 'space-grotesk' },
  destinations: { ...alternate.tenant.destinations, support: 'https://contacto.aurora.example/alta' },
};
alternate.pagesResponse.data.slug = alternate.tenant.slug;
alternate.pagesResponse.data.messages['photographic.calculator.commissionBasisPoints'] = '350';
for (const page of alternate.pagesResponse.data.pages) {
  if ('photographic.calculator.commissionBasisPoints' in page.blocks) {
    page.blocks['photographic.calculator.commissionBasisPoints'] = '350';
  }
}

let api: Server | null = null;
let app: ChildProcessWithoutNullStreams | null = null;
let tenantBrowser: Browser | null = null;
let appBaseUrl = '';
let appPort = 0;
let appOutput = '';
const resolvedHosts = new Set<string>();

const test = base.extend<{ landingPage: Page }>({
  landingPage: async ({}, use) => {
    if (!tenantBrowser) throw new Error('Tenant browser is not running');
    const context = await tenantBrowser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

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
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function stopApp() {
  if (!app || app.exitCode !== null) return;
  const current = app;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => { current.kill('SIGKILL'); resolve(); }, 3_000);
    current.once('exit', () => { clearTimeout(timer); resolve(); });
    current.kill('SIGTERM');
  });
}

async function gotoLanding(page: Page, host = HOST) {
  const response = await page.goto(`http://${host}:${appPort}/`);
  expect(response?.status()).toBe(200);
  await expect(page.locator('body')).toHaveAttribute('data-enhanced', 'true');
  await page.evaluate(() => document.fonts.ready);
}

async function checkOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(layout.scroll, `Page overflows ${layout.viewport}px viewport`).toBeLessThanOrEqual(layout.viewport);
}

test.describe.configure({ mode: 'default' });

test.beforeAll(async () => {
  expect(existsSync(join(ROOT, 'dist/server/entry.mjs')), 'Build the real Node adapter first').toBe(true);
  const exportPath = join(ROOT, 'test-results/photographic-oneplatform.json');
  mkdirSync(join(ROOT, 'test-results'), { recursive: true });
  const exported = spawnSync(process.execPath, ['scripts/export-site-content.mjs', '--out', exportPath], { cwd: ROOT, encoding: 'utf8' });
  expect(exported.status, exported.stderr).toBe(0);
  const catalogue = JSON.parse(readFileSync(exportPath, 'utf8')) as { documents: { route: string; locale: string; published: boolean; blocks: Record<string, string> }[] };
  for (const locale of platformTenant.locales) {
    const pages = catalogue.documents.filter((document) => document.locale === locale && document.published);
    platformContent.set(locale, { success: true, data: { slug: platformTenant.slug, locale, pages, messages: Object.assign({}, ...pages.map((document) => document.blocks)) }, msg: 'ok' });
  }
  api = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://contract');
    response.setHeader('content-type', 'application/json; charset=utf-8');
    if (url.pathname.endsWith('/sites/by-host')) {
      const host = url.searchParams.get('host') ?? '';
      resolvedHosts.add(host);
      if (host === PLATFORM_HOST) return response.end(JSON.stringify({ success: true, data: platformTenant, msg: 'Site resolved' }));
      const selected = host === HOST ? fixture : host === ALTERNATE_HOST ? alternate : null;
      if (selected) return response.end(JSON.stringify({ success: true, data: selected.tenant, msg: 'Site resolved' }));
    } else {
      const match = /\/sites\/([^/]+)\/pages$/.exec(url.pathname);
      const content = match?.[1] === platformTenant.slug ? platformContent.get(url.searchParams.get('locale') ?? '') : null;
      if (content) return response.end(JSON.stringify(content));
      const selected = [fixture, alternate].find((candidate) => candidate.tenant.slug === match?.[1]);
      if (selected && url.searchParams.get('locale') === selected.tenant.default_locale) {
        return response.end(JSON.stringify(selected.pagesResponse));
      }
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ success: false, data: null, msg: 'Site not found' }));
  });
  const apiPort = await listen(api);
  const reservation = createServer();
  appPort = await listen(reservation);
  await close(reservation);
  appBaseUrl = `http://127.0.0.1:${appPort}`;
  app = spawn(process.execPath, ['dist/server/entry.mjs'], {
    cwd: ROOT,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(appPort), SITE_MANIFEST_SOURCE: 'api', SITE_API_BASE_URL: `http://127.0.0.1:${apiPort}` },
    stdio: 'pipe',
  });
  app.stdout.on('data', (chunk) => { appOutput += String(chunk); });
  app.stderr.on('data', (chunk) => { appOutput += String(chunk); });
  await expect.poll(async () => {
    if (app?.exitCode !== null) throw new Error(`Node adapter exited: ${appOutput}`);
    try { return (await getWithHost(`${appBaseUrl}/`, HOST)).status; } catch { return 0; }
  }, { timeout: 30_000, message: 'The built tenant route must start' }).toBe(200);
  tenantBrowser = await chromium.launch({
    args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1, MAP ${ALTERNATE_HOST} 127.0.0.1, MAP ${PLATFORM_HOST} 127.0.0.1`],
  });
});

test.afterAll(async () => {
  await tenantBrowser?.close();
  await stopApp();
  if (api) await close(api);
  tenantBrowser = null;
  app = null;
  api = null;
});

test('actual tenant Host renders the approved SSR page, metadata and configured support destinations', async ({ landingPage: page }) => {
  const raw = await getWithHost(`${appBaseUrl}/`, HOST);
  expect(raw.status).toBe(200);
  expect(raw.body).toContain('data-home-template="photographic-service"');
  expect(raw.body).not.toMatch(/noindex|contact-dialog|PROTOTYPE_SITE|prototipo/i);
  await gotoLanding(page);
  expect(new URL(page.url()).hostname).toBe(HOST);
  expect(resolvedHosts.has(HOST)).toBe(true);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://${HOST}/`);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://${HOST}/`);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator('.site-header .wordmark')).toHaveText('Medipago');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCSS('font-family', /Manrope/);
  await expect(page.locator('.panel-demo')).toHaveCSS('font-family', /PanelInter/);
  await expect(page.locator('.panel-demo')).toHaveCSS('font-size', '16px');
  await expect(page.locator('.panel-footnote p')).toHaveCSS('font-size', '16px');
  const text = await page.locator('body').innerText();
  expect(text).toMatch(/facturación automática/i);
  expect(text).toMatch(/datos.*ficticios/i);
  expect(text).not.toMatch(/factura asistida|Android|prototipo|contacto simulado|tarifas pendientes|\bUSD\b/i);
  // The approved personal address is illustrative copy, never a contact link.
  await expect(page.locator('.onboarding-copy')).toContainText('como consulta@minombre.com');
  await expect(page.locator('[data-support-cta="onboarding"]')).toHaveText('Consultar por mi correo');
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  const destinations = await page.locator('[data-support-cta]').evaluateAll((links) => links.map((link) => ({
    placement: link.getAttribute('data-support-cta'), href: link.getAttribute('href'),
  })));
  expect(destinations.length).toBeGreaterThanOrEqual(8);
  for (const destination of destinations) {
    expect(destination.href).toBeTruthy();
    const actual = new URL(destination.href!);
    const configured = new URL(fixture.tenant.destinations.support!);
    expect(`${actual.origin}${actual.pathname}`).toBe(`${configured.origin}${configured.pathname}`);
    expect(actual.searchParams.get('text')).toBe(
      fixture.pagesResponse.data.messages[`photographic.contact.messages.${destination.placement}`],
    );
  }
  // Inspect configured destinations without opening a third-party chat.
  const links = await page.locator('a[href^="#"]').evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')!.slice(1)));
  for (const id of new Set(links)) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
});

test('without JavaScript copy, all demonstration views, FAQ and default calculation remain available', async () => {
  if (!tenantBrowser) throw new Error('Tenant browser is not running');
  const context = await tenantBrowser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    expect((await page.goto(`http://${HOST}:${appPort}/`))?.status()).toBe(200);
    for (const name of ['summary', 'billing', 'withdrawals']) await expect(page.locator(`#panel-${name}`)).toBeVisible();
    await expect(page.locator('[data-panel-tab]:visible')).toHaveCount(0);
    await expect(page.locator('#calc-amount')).toBeDisabled();
    await expect(page.locator('#calc-net')).toHaveText(/Q\s?95\.10/);
    await expect(page.locator('#calc-fee')).toHaveText(/Q\s?4\.90/);
    await expect(page.locator('#calc-status')).not.toBeEmpty();
    await expect(page.locator('.hero-motion')).toHaveCount(0);
    await expect(page.locator('.hero-eyebrow')).toHaveCount(0);
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await page.locator('#faq-list summary').first().click();
    await expect(page.locator('#faq-list details').first()).toHaveAttribute('open', '');
    await checkOverflow(page);
  } finally { await context.close(); }

  // Axe itself requires JavaScript. Audit the same unenhanced SSR DOM in a
  // separate context with all application scripts blocked at the network.
  const auditContext = await tenantBrowser.newContext({ viewport: { width: 390, height: 844 } });
  await auditContext.route('**/*', (route) => route.request().resourceType() === 'script' ? route.abort() : route.continue());
  const auditPage = await auditContext.newPage();
  try {
    await auditPage.goto(`http://${HOST}:${appPort}/`);
    await expect(auditPage.locator('body')).not.toHaveAttribute('data-enhanced');
    await expect(auditPage.locator('[data-panel-screen]:visible')).toHaveCount(3);
    const accessibility = await new AxeBuilder({ page: auditPage }).analyze();
    expect(accessibility.violations).toEqual([]);
  } finally { await auditContext.close(); }
});

test('mobile navigation stays fixed and supports native anchors, focus and Escape', async ({ landingPage: page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLanding(page);
  const toggle = page.locator('.menu-toggle');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(page.locator('#mobile-menu')).toBeHidden();
  await toggle.click();
  await page.locator('#mobile-menu a[href="#su-panel"]').click();
  await expect(page).toHaveURL(/#su-panel$/);
  await expect(page.locator('#su-panel')).toBeFocused();
  await expect(page.locator('#mobile-menu')).toBeHidden();
  await expect(page.locator('.site-header')).toHaveCSS('position', 'fixed');
  await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/);
  const top = await page.locator('.site-header').evaluate((header) => header.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(30);
  await expect(page.locator('.button-header')).toBeInViewport();
  await page.locator('.button-header').focus();
  await page.keyboard.press('Tab');
  await expect(toggle).toBeFocused();
  const focus = await toggle.evaluate((element) => ({ outline: getComputedStyle(element).outlineStyle, shadow: getComputedStyle(element).boxShadow }));
  expect(focus.outline !== 'none' || focus.shadow !== 'none').toBe(true);
});

test('the demonstration has keyboard tabs, local filters and separate credits and withdrawals', async ({ landingPage: page }) => {
  await gotoLanding(page);
  const summary = page.locator('[data-panel-tab="summary"]');
  const billing = page.locator('[data-panel-tab="billing"]');
  const withdrawals = page.locator('[data-panel-tab="withdrawals"]');
  await summary.focus();
  await page.keyboard.press('ArrowDown');
  await expect(billing).toBeFocused();
  await expect(billing).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panel-billing')).toBeVisible();
  await expect(page.locator('#panel-summary')).toBeHidden();
  await expect(page.locator('#panel-billing [data-panel-money="credit"]')).toHaveText(/Q\s?480\.00/);
  await page.locator('[data-panel-filter="expense"]').click();
  await expect(page.locator('#panel-transaction-rows tr:visible')).toHaveCount(1);
  await expect(page.locator('#panel-transaction-rows tr:visible')).toContainText(/-Q\s*20\.00/);
  await expect(page.locator('#panel-filter-status')).toContainText('1');
  await page.locator('[data-panel-filter="income"]').click();
  await expect(page.locator('#panel-transaction-rows tr:visible')).toContainText(/Q\s*500\.00/);
  await page.locator('[data-panel-filter="all"]').click();
  await expect(page.locator('#panel-transaction-rows tr:visible')).toHaveCount(2);
  await billing.focus();
  await page.keyboard.press('End');
  await expect(withdrawals).toBeFocused();
  await expect(page.locator('#panel-withdrawals [data-panel-money="withdraw"]')).toHaveText(/Q\s?0\.00/);
  await expect(page.locator('#panel-withdrawals .panel-disabled')).toBeDisabled();
  await expect(page.locator('#withdraw-reason')).not.toBeEmpty();
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator('.panel-tabs')).toHaveAttribute('aria-orientation', 'horizontal');
  await page.keyboard.press('ArrowRight');
  await expect(summary).toBeFocused();
  await page.keyboard.press('End');
  await expect(withdrawals).toBeFocused();
  await page.keyboard.press('Home');
  await expect(summary).toBeFocused();
  await page.locator('[data-panel-go="billing"]').first().click();
  await expect(billing).toBeFocused();
});

test('one editable amount uses the configured rate, clears stale results and recovers from invalid input', async ({ landingPage: page }) => {
  await gotoLanding(page);
  const form = page.locator('#price-calculator');
  const amount = page.locator('#calc-amount');
  await expect(form.locator('input:not(:disabled), select, textarea')).toHaveCount(1);
  await expect(page.locator('[data-commission]')).toHaveText('4.9%');
  await expect(page.locator('#calc-net')).toHaveText(/Q\s?95\.10/);
  await expect(page.locator('#calc-fee')).toHaveText(/Q\s?4\.90/);
  await expect(page.locator('#calc-status')).toBeEmpty();
  await amount.fill('5');
  await expect(page.locator('#calc-net')).toHaveText('—');
  await expect(page.locator('#calc-status')).toHaveText(fixture.pagesResponse.data.messages['photographic.calculator.changed']);
  await amount.press('Enter');
  await expect(page.locator('#calc-net')).toHaveText(/Q\s?4\.75/);
  await expect(page.locator('#calc-fee')).toHaveText(/Q\s?0\.25/);
  for (const invalid of ['0', '-1', '1.234', '1e2']) {
    await amount.fill(invalid);
    await form.locator('button[type="submit"]').click();
    await expect(amount).toBeFocused();
    await expect(amount).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#calc-net')).toHaveText('—');
    await expect(page.locator('#calc-fee')).toHaveText('—');
    await expect(page.locator('#calc-error')).not.toBeEmpty();
  }
  await amount.fill('100,00');
  await amount.press('Enter');
  await expect(amount).not.toHaveAttribute('aria-invalid');
  await expect(page.locator('#calc-error')).toBeEmpty();
  await expect(page.locator('#calc-net')).toHaveText(/Q\s?95\.10/);
});

test('photograph and flow play automatically, restart on re-entry and respect reduced motion', async ({ landingPage: page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await gotoLanding(page);
  const hero = page.locator('.hero');
  const photo = page.locator('.hero-photo');
  await expect(page.locator('.hero-motion')).toHaveCount(0);
  await expect(page.locator('[data-replay]')).toHaveCount(0);
  await expect(page.locator('.hero-eyebrow')).toHaveCount(0);
  await expect(hero).toHaveAttribute('data-motion', 'playing');
  const first = await photo.evaluate((element) => getComputedStyle(element).transform);
  await expect.poll(() => photo.evaluate((element) => getComputedStyle(element).transform)).not.toBe(first);
  const flow = page.locator('.flow-panel');
  await flow.scrollIntoViewIfNeeded();
  await expect(flow).toHaveAttribute('data-animated', '');
  await expect(hero).toHaveAttribute('data-motion', 'paused');
  await photo.evaluate(async (element) => {
    // CSS pause is committed on the next animation frame. Measure only once
    // the browser confirms that transition, then require an unchanged matrix.
    await Promise.all(element.getAnimations().map((animation) => animation.ready));
  });
  const paused = await photo.evaluate((element) => getComputedStyle(element).transform);
  await page.waitForTimeout(250); // Compare animation frames while the photograph is offscreen.
  expect(await photo.evaluate((element) => getComputedStyle(element).transform)).toBe(paused);
  await expect.poll(() => flow.evaluate((element) => Math.max(0, ...element.getAnimations({ subtree: true }).map((animation) => Number(animation.currentTime))))).toBeGreaterThan(300);
  const firstStart = await flow.evaluate((element) => element.getAnimations({ subtree: true })[0].startTime);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(flow).not.toHaveAttribute('data-animated');
  await expect(hero).toHaveAttribute('data-motion', 'playing');
  await expect.poll(() => photo.evaluate((element) => getComputedStyle(element).transform)).not.toBe(paused);
  await flow.scrollIntoViewIfNeeded();
  await expect(flow).toHaveAttribute('data-playing', 'true');
  await expect.poll(() => flow.evaluate((element) => element.getAnimations({ subtree: true })[0]?.startTime)).toBeGreaterThan(Number(firstStart));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(hero).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('[data-replay]:visible')).toHaveCount(0);
  await expect(photo).toHaveCSS('animation-name', 'none');
  await expect(flow).not.toHaveAttribute('data-animated');
  await expect(page.locator('#calc-amount')).toBeEnabled();
});

for (const [host, path] of [[HOST, '/'], [PLATFORM_HOST, '/'], [PLATFORM_HOST, '/es/']] as const) {
  for (const width of [1440, 390]) {
    test(`illustrations autoplay when visible and on return: ${host}${path} ${width}px`, async ({ landingPage: page }) => {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(`http://${host}:${appPort}${path}`);
      await expect(page.locator('body')).toHaveAttribute('data-enhanced', 'true');
      await expect(page.locator('[data-replay]')).toHaveCount(0);
      const cards = page.locator('.service-card');
      if (width === 390) {
        // Reading the title alone must not consume an offscreen illustration.
        await cards.first().evaluate((card) => window.scrollTo({
          top: window.scrollY + card.getBoundingClientRect().top - window.innerHeight + 120,
          behavior: 'instant',
        }));
        await expect(cards.first()).not.toHaveAttribute('data-animated');
      }
      for (const card of await cards.all()) {
        await card.locator('.service-stage').scrollIntoViewIfNeeded();
        await expect(card).toHaveAttribute('data-playing', 'true');
        await expect.poll(() => card.evaluate((element) => element.getAnimations({ subtree: true })
          .filter((animation) => animation.playState === 'running').length)).toBeGreaterThan(0);
        const firstStart = await card.evaluate((element) => element.getAnimations({ subtree: true })[0].startTime);
        await expect.poll(() => card.evaluate((element) => Math.max(0, ...element.getAnimations({ subtree: true })
          .map((animation) => Number(animation.currentTime))))).toBeGreaterThan(300);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await expect(card).not.toHaveAttribute('data-animated');
        await card.locator('.service-stage').scrollIntoViewIfNeeded();
        await expect.poll(() => card.evaluate((element) => element.getAnimations({ subtree: true })[0]?.startTime)).toBeGreaterThan(Number(firstStart));
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const card of await cards.all()) {
        await expect(card).not.toHaveAttribute('data-animated');
        expect(await card.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
      }
    });
  }
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
  test(`all page sections and panel views reflow and pass Axe at ${viewport.width}px`, async ({ landingPage: page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoLanding(page);
    // Captures belong to this run's output, not to the tracked evidence/ folder:
    // writing there dirtied the worktree on every suite run.
    const evidence = testInfo.outputPath('evidence');
    mkdirSync(evidence, { recursive: true });
    // Visit the lazy image before checking all page assets and making a full-page capture.
    await page.locator('.onboarding-photo').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
    for (const name of ['summary', 'billing', 'withdrawals']) {
      await page.locator(`[data-panel-tab="${name}"]`).click();
      await checkOverflow(page);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${viewport.width}px ${name}: ${JSON.stringify(results.violations)}`).toEqual([]);
      const file = join(evidence, `${viewport.width}-panel-${name}.png`);
      await page.locator('#su-panel').screenshot({ path: file, animations: 'disabled' });
      await testInfo.attach(`${viewport.width}-panel-${name}`, { path: file, contentType: 'image/png' });
    }
    await page.locator('[data-panel-tab="summary"]').click();
    await page.locator('#faq-list summary').first().click();
    await expect(page.locator('#faq-list details').first()).toHaveAttribute('open', '');
    await page.evaluate(() => window.scrollTo(0, 0));
    const file = join(evidence, `${viewport.width}-full-page.png`);
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
    await testInfo.attach(`${viewport.width}-full-page`, { path: file, contentType: 'image/png' });
    const imageSources = await page.locator('img').evaluateAll((images) => images.map((image) => image instanceof HTMLImageElement ? image.currentSrc : ''));
    expect(imageSources.every((src) => new URL(src).hostname === HOST)).toBe(true);
  });
}

test('another tenant reuses the composition with its own brand, destination, font, accent and rate without cross-request leakage', async ({ landingPage: page }) => {
  for (const host of [HOST, ALTERNATE_HOST, HOST, ALTERNATE_HOST]) {
    await gotoLanding(page, host);
    const isAlternate = host === ALTERNATE_HOST;
    await expect(page.locator('.site-header .wordmark')).toHaveText(isAlternate ? ALTERNATE_NAME : 'Medipago');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://${host}/`);
    await expect(page.locator('[data-commission]')).toHaveText(isAlternate ? '3.5%' : '4.9%');
    await expect(page.locator('#calc-net')).toHaveText(isAlternate ? /Q\s?96\.50/ : /Q\s?95\.10/);
    expect(await page.locator('body').evaluate((body) => getComputedStyle(body).getPropertyValue('--accent').trim())).toBe(isAlternate ? '#233c8f' : fixture.tenant.theme.accent);
    const fontFamily = isAlternate ? 'Space Grotesk' : 'Manrope';
    expect(await page.locator('body').evaluate((body) => getComputedStyle(body).fontFamily)).toContain(fontFamily);
    expect(await page.evaluate((family) => [...document.fonts].some((face) => face.family.replaceAll('"', '').replaceAll("'", '') === family && face.status === 'loaded'), fontFamily)).toBe(true);
    const body = await page.locator('body').innerText();
    expect(body).not.toContain(isAlternate ? 'Medipago' : ALTERNATE_NAME);
    if (isAlternate) await expect(page.locator('[data-support-cta="header"]')).toHaveAttribute('href', alternate.tenant.destinations.support!);
  }
  const unknown = await getWithHost(`${appBaseUrl}/`, 'not-a-tenant.example');
  expect(unknown.status).toBe(404);
  expect(unknown.body).not.toContain('data-home-template="photographic-service"');
});

for (const [locale, path] of [['en', '/'], ['es', '/es/']] as const) {
  test(`1Platform ${locale} resolves the shared design with its own pricing and CTA`, async ({ landingPage: page }) => {
    const response = await page.goto(`http://${PLATFORM_HOST}:${appPort}${path}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toHaveAttribute('data-home-template', 'photographic-service');
    await expect(page.locator('body')).toHaveAttribute('data-enhanced', 'true');
    expect(resolvedHosts.has(PLATFORM_HOST)).toBe(true);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://${PLATFORM_HOST}${path}`);
    await expect(page.locator('.site-header .wordmark')).toHaveText('Platform');
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', `https://${PLATFORM_HOST}/`);
    await expect(page.locator('meta[property="og:locale:alternate"]')).toHaveCount(1);
    await expect(page.locator('link[rel="sitemap"]')).toHaveAttribute('href', '/sitemap-index.xml');
    await expect(page.locator('link[type="application/rss+xml"]')).toHaveAttribute('href', locale === 'en' ? '/rss.xml' : '/es/rss.xml');
    await expect(page.locator('h1')).toHaveCSS('font-family', /Manrope/);
    await expect(page.locator('.panel-demo')).toHaveCSS('font-family', /PanelInter/);
    await expect(page.locator('.pricing-card')).toBeVisible();
    await expect(page.locator('#price-calculator')).toHaveCount(0);
    await expect(page.locator('.pricing-card')).toContainText('USD');
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Medipago|médicos?|consultorio|4\.9%|WhatsApp|\bGTQ\b/i);
    const configured = platformContent.get(locale)!.data.messages;
    await expect(page.locator('.onboarding-copy h2')).toHaveText(configured['photographic.onboarding.title']);
    await expect(page.locator('.onboarding-copy p').last()).toHaveText(configured['photographic.onboarding.description']);
    await expect(page.locator('.onboarding-copy')).toContainText('consulta@minombre.com');
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    expect(text).toMatch(locale === 'en' ? /fictional/i : /fictici/i);
    for (const href of await page.locator('[data-support-cta]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))) {
      expect(href).toBe(platformTenant.destinations.app);
    }
    await expect(page.locator('.landing-product-links a')).toHaveCount(7);
    await expect(page.locator('.site-footer a[href^="/es/"]')).toHaveCount(locale === 'es' ? 16 : 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await checkOverflow(page);
    await expect(page.locator('.site-header')).toHaveCSS('position', 'fixed');
    await expect(page.locator('.menu-toggle')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}
