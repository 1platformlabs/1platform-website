import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import { chromium, expect, test as base, type Browser, type Page } from '@playwright/test';
import type { SiteTenant } from '../src/lib/site-api';
import { repoTenantForHost } from '../src/data/site-tenants';
import { getWithHost } from './helpers/http-host';
import accessMessages from '../src/i18n/messages/pages/access';
import requestAccessMessages from '../src/i18n/messages/pages/request-access';

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
const ACCESS_HOST = 'commerce-access.example';
const accessFixture: SiteFixture = JSON.parse(JSON.stringify(fixture).replaceAll('Medipago', 'Comercio Aurora'));
accessFixture.tenant = {
  ...accessFixture.tenant,
  slug: 'commerce-access', domain: ACCESS_HOST, brand_name: 'Comercio Aurora',
  brand_wordmark: 'Comercio Aurora', brand_mark: 'C', brand_assets: null,
  pages: ['/', '/access/', '/request-access/'],
  theme: { accent: '#1748a7', accent_contrast: '#ffffff', display_font: 'manrope' },
  destinations: { ...accessFixture.tenant.destinations, app: 'https://panel.commerce.example/auth/login', support: 'https://wa.me/15035550123' },
};
accessFixture.pagesResponse.data.slug = accessFixture.tenant.slug;
Object.assign(accessFixture.pagesResponse.data.messages, accessMessages.es, requestAccessMessages.es, {
  'photographic.theme.palette': 'brand', 'photographic.hero.image': 'commerce',
});
// A commerce tenant with every optional block: Delivery, the named advertising
// channel, five shortcuts, the sales route and a visitor-entered percentage.
const COMMERCE_HOST = 'vendefacil.1platform.pro';
const commerce = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/vendefacil-site.json'), 'utf8')) as SiteFixture;
// The same tenant's content as PROD served it on 2026-10-02, before it opts in:
// deploying this renderer ahead of the content activation must keep it serving.
const PLAIN_COMMERCE_HOST = 'commerce-plain.example';
const plainCommerce = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/vendefacil-live-site.json'), 'utf8')) as SiteFixture;
plainCommerce.tenant = { ...plainCommerce.tenant, slug: 'commerce-plain', domain: PLAIN_COMMERCE_HOST };
plainCommerce.pagesResponse.data.slug = plainCommerce.tenant.slug;
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
      const selected = ({ [HOST]: fixture, [ALTERNATE_HOST]: alternate, [ACCESS_HOST]: accessFixture, [COMMERCE_HOST]: commerce, [PLAIN_COMMERCE_HOST]: plainCommerce } as Record<string, SiteFixture>)[host] ?? null;
      if (selected) return response.end(JSON.stringify({ success: true, data: selected.tenant, msg: 'Site resolved' }));
    } else {
      const match = /\/sites\/([^/]+)\/pages$/.exec(url.pathname);
      const content = match?.[1] === platformTenant.slug ? platformContent.get(url.searchParams.get('locale') ?? '') : null;
      if (content) return response.end(JSON.stringify(content));
      const selected = [fixture, alternate, accessFixture, commerce, plainCommerce].find((candidate) => candidate.tenant.slug === match?.[1]);
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
    args: [`--host-resolver-rules=${[HOST, ALTERNATE_HOST, PLATFORM_HOST, ACCESS_HOST, COMMERCE_HOST, PLAIN_COMMERCE_HOST].map((name) => `MAP ${name} 127.0.0.1`).join(', ')}`],
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
  // The edge's email obfuscation would turn the example into a /cdn-cgi/l/email-protection
  // link reading "[email protected]" without JavaScript. The marker keeps it plain text.
  expect(raw.body).toMatch(/<!--email_off-->[^<]*consulta@minombre\.com[^<]*<!--\/email_off-->/);
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
  expect(text).toContain('Los importes y movimientos de esta demostración son ficticios');
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
    // The semantic FAQ contract belongs to the tenant that publishes it.
    const questions = page.locator('#faq-list > details');
    expect(await questions.count()).toBeGreaterThanOrEqual(2);
    await questions.first().locator('summary').click();
    await expect(questions.first()).toHaveAttribute('open', '');
    await expect(questions.first().locator('p')).toBeVisible();
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
    await auditPage.locator('#faq-list > details').first().locator('summary').click();
    await expect(auditPage.locator('#faq-list > details').first().locator('p')).toBeVisible();
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

test('the demonstration has keyboard tabs, payment-channel filters and separate gross collections and withdrawals', async ({ landingPage: page }) => {
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
  await expect(page.locator('#panel-billing .panel-callout')).toContainText('antes de comisiones');
  await expect(page.locator('#faq-list details')).toHaveCount(3);
  await expect(page.locator('.panel-sidebar-note')).toHaveText('Cobros y retirospor separado');
  await expect(page.locator('#panel-billing [data-panel-money="collected"]')).toHaveText(/Q\s?480\.00/);
  await page.locator('[data-panel-filter="card"]').click();
  await expect(page.locator('#panel-transaction-rows tr:visible')).toHaveCount(1);
  await expect(page.locator('#panel-transaction-rows tr:visible')).toContainText(/Q\s*300\.00/);
  await expect(page.locator('#panel-filter-status')).toContainText('1');
  await page.locator('[data-panel-filter="link"]').click();
  await expect(page.locator('#panel-transaction-rows tr:visible')).toContainText(/Q\s*180\.00/);
  await page.locator('[data-panel-filter="all"]').click();
  await expect(page.locator('#panel-transaction-rows tr:visible')).toHaveCount(2);
  await billing.focus();
  await page.keyboard.press('End');
  await expect(withdrawals).toBeFocused();
  await expect(page.locator('#panel-withdrawals [data-panel-money="withdraw"]')).toHaveText(/Q\s?0\.00/);
  await expect(page.locator('#panel-withdrawals .panel-disabled')).toBeDisabled();
  await expect(page.locator('#panel-withdrawals .panel-page-desc')).toHaveText('Consulte el saldo disponible y los requisitos para solicitar un retiro.');
  await expect(page.locator('#panel-withdrawals .panel-disabled')).toHaveText('Solicitar retiro');
  await expect(page.locator('#withdraw-reason')).toHaveText('Esta vista de ejemplo no presenta saldo disponible ni una cuenta de retiro configurada.');
  await expect(page.locator('#method-title')).toHaveText('Cuenta de retiro no configurada');
  await expect(page.locator('#method-title')).toHaveCSS('color', 'rgb(32, 36, 34)');
  expect(await page.locator('.panel-section p').evaluateAll((paragraphs) => paragraphs.every((paragraph) => getComputedStyle(paragraph).textWrap === 'wrap'))).toBe(true);
  await expect(page.locator('#panel-withdrawals details summary')).toHaveText('Requisitos para solicitar un retiro');
  await expect(page.locator('#panel-withdrawals details li')).toHaveText(['Una cuenta de retiro configurada.', 'Saldo retirable suficiente en quetzales.', 'Confirmar el importe y la cuenta de destino.']);
  await expect(page.locator('#panel-withdrawals')).not.toContainText(/saldo mínimo|Sin métodos|Pedir retiro/);
  await expect(page.locator('#su-panel')).toHaveCSS('scroll-margin-top', '0px');
  await expect(page.locator('#su-panel .eyebrow')).toHaveCSS('font-family', /Manrope/);
  await expect(page.locator('#su-panel .eyebrow')).toHaveCSS('display', 'block');
  await expect(page.locator('.panel-empty > .icon')).toHaveCSS('display', 'inline');
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

for (const [host, path] of [[HOST, '/']] as const) {
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

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 800 }, { width: 430, height: 932 }, { width: 844, height: 390 }]) {
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
  test(`1Platform ${locale} resolves infrastructure from API content with independent brand and destinations`, async ({ landingPage: page }) => {
    const response = await page.goto(`http://${PLATFORM_HOST}:${appPort}${path}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('[data-infrastructure-home]')).toBeVisible();
    await expect(page.locator('.photographic-service')).toHaveCount(0);
    expect(resolvedHosts.has(PLATFORM_HOST)).toBe(true);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://${PLATFORM_HOST}${path}`);
    await expect(page.locator('.brand-header .brand-lockup')).toContainText(platformTenant.brand_wordmark!);
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', `https://${PLATFORM_HOST}/`);
    await expect(page.locator('meta[property="og:locale:alternate"]')).toHaveCount(1);
    await expect(page.locator('link[rel="sitemap"]')).toHaveAttribute('href', '/sitemap-index.xml');
    await expect(page.locator('link[type="application/rss+xml"]')).toHaveAttribute('href', locale === 'en' ? '/rss.xml' : '/es/rss.xml');
    await expect(page.locator('h1')).toHaveCSS('font-family', /Manrope/);
    await expect(page.locator('.pricing-card, #price-calculator, .panel-demo')).toHaveCount(0);
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Medipago|médicos?|consultorio|4\.9%|\bGTQ\b|\bUSD\b/i);
    const configured = platformContent.get(locale)!.data.messages;
    await expect(page.locator('.hero h1')).toHaveText(configured['infrastructure.hero.title'] + configured['infrastructure.hero.titleEmphasis']);
    await expect(page.locator('.brand-cta')).toHaveAttribute('href', platformTenant.destinations.support!);
    await expect(page.locator('.developers .button')).toHaveAttribute('href', new URL('/docs/saas/1platform-api/getting-started/', platformTenant.destinations.docs!).toString());
    await expect(page.locator('.brand-nav a')).toHaveText(Array.from({ length: 6 }, (_, index) => configured[`site.navigation.${index}.label`]));
    await expect(page.locator('[data-capability]')).toHaveCount(10);
    await expect(page.locator('[data-capability][aria-pressed="true"]')).toHaveCount(3);
    await page.setViewportSize({ width: 390, height: 844 });
    await checkOverflow(page);
    await expect(page.locator('.brand-header')).toHaveCSS('position', 'fixed');
    const menu = page.locator('.brand-menu-toggle');
    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#brand-mobile-nav')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
    await expect(page.locator('#brand-mobile-nav')).toBeHidden();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
    // A subsequent host resolution in the same browser must restore Medipago's
    // own composition, commission and contact, without retaining brand tokens.
    await gotoLanding(page, HOST);
    await expect(page.locator('[data-infrastructure-home], .brand-header')).toHaveCount(0);
    await expect(page.locator('[data-commission]')).toHaveText('4.9%');
    await expect(page.locator('.site-header .wordmark')).toHaveText('Medipago');
    await expect(page.locator('[data-support-cta="header"]')).toHaveAttribute('href', /^https:\/\/wa\.me\/50244866448\?text=/);
  });

  for (const width of [1440, 390]) {
    test(`infrastructure autoplay is continuous, visibility-aware and reduced-motion safe: ${locale} ${width}px`, async ({ landingPage: page }) => {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(`http://${PLATFORM_HOST}:${appPort}${path}`);
      const wire = page.locator('.hero-wire-travel').first();
      await expect(wire).toHaveCSS('animation-iteration-count', 'infinite');
      await expect(wire).toHaveCSS('animation-play-state', 'running');
      const first = await wire.evaluate((element) => getComputedStyle(element).strokeDashoffset);
      await expect.poll(() => wire.evaluate((element) => getComputedStyle(element).strokeDashoffset)).not.toBe(first);
      await page.locator('#arquitectura').scrollIntoViewIfNeeded();
      await expect(wire).toHaveCSS('animation-play-state', 'paused');
      await wire.evaluate(async (element) => { await Promise.all(element.getAnimations().map((animation) => animation.ready)); });
      const paused = await wire.evaluate((element) => getComputedStyle(element).strokeDashoffset);
      await page.waitForTimeout(200);
      expect(await wire.evaluate((element) => getComputedStyle(element).strokeDashoffset)).toBe(paused);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await expect(wire).toHaveCSS('animation-play-state', 'running');
      await expect.poll(() => wire.evaluate((element) => getComputedStyle(element).strokeDashoffset)).not.toBe(paused);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(wire).toHaveCSS('animation-name', 'none');
      await expect(page.locator('[data-replay], .hero-motion')).toHaveCount(0);
    });
  }
}

test('tenant access keeps login and WhatsApp onboarding reachable with tenant-owned destinations', async ({ landingPage: page }) => {
  await gotoLanding(page, ACCESS_HOST);
  await expect(page.locator('[data-access-entry]')).toHaveCount(2);
  await page.locator('.header-access').click();
  await expect(page).toHaveURL(new RegExp('/acceso/$'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Su panel,a un paso');
  await expect(page.locator('[data-access-action="login"]')).toHaveAttribute('href', 'https://panel.commerce.example/auth/login');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://${ACCESS_HOST}/acceso/`);
  await page.getByRole('link', { name: 'Solicitar acceso', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/solicitar-acceso/$'));
  const contact = new URL((await page.locator('[data-access-action="support"]').getAttribute('href'))!);
  expect(contact.origin + contact.pathname).toBe('https://wa.me/15035550123');
  expect(contact.searchParams.get('text')).toContain('Comercio Aurora');
  await expect(page.locator('body')).not.toContainText('Medipago');
  await expect(page.getByRole('link', { name: 'Ya tengo usuario', exact: true })).toHaveAttribute('href', 'https://panel.commerce.example/auth/login');
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole('link', { name: 'Volver al inicio', exact: true }).click();
  await expect(page).toHaveURL(`http://${ACCESS_HOST}:${appPort}/`);
  await gotoLanding(page);
  await expect(page.locator('[data-access-entry]')).toHaveCount(0);
  expect((await getWithHost(`${appBaseUrl}/acceso/`, HOST)).status).toBe(404);
});

test('tenant access remains readable and navigable on narrow and landscape screens', async ({ landingPage: page }) => {
  for (const [width, height] of [[320, 740], [390, 844], [844, 390], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await gotoLanding(page, ACCESS_HOST);
    await expect(page.locator('.header-access')).toBeVisible();
    await checkOverflow(page);
    await page.locator('.header-access').click();
    await expect(page.locator('[data-access-action="login"]')).toBeVisible();
    await checkOverflow(page);
    await page.getByRole('link', { name: 'Solicitar acceso', exact: true }).click();
    await expect(page.locator('[data-access-action="support"]')).toBeVisible();
    await checkOverflow(page);
  }
});

const commerceMessages = commerce.pagesResponse.data.messages;
const commerceSupport = commerce.tenant.destinations.support!;

test('a commerce tenant serves five solutions, Delivery, the named ad channel and the sales route with its own WhatsApp messages', async ({ landingPage: page }) => {
  const raw = await getWithHost(`${appBaseUrl}/`, COMMERCE_HOST);
  expect(raw.status).toBe(200);
  expect(raw.body).not.toMatch(/contact-dialog|copy-message|PROTOTYPE|prototipo|\{ads(Name|Network)/);
  await gotoLanding(page, COMMERCE_HOST);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('body')).toHaveAttribute('data-type-scale', 'compact');
  await expect(page.locator('.solution-navigation a')).toHaveText(['Cobros presenciales', 'Enlaces de cobro', 'Facturación', 'Delivery', 'Meta Ads']);
  await expect(page.locator('.service-card')).toHaveCount(3);
  await expect(page.locator('.business-card')).toHaveCount(2);
  await expect(page.locator('#delivery .delivery-milestone strong')).toHaveText(['Preparado', 'En camino', 'Entregado']);
  await expect(page.locator('#anuncios .campaign-channels')).toHaveText('Facebook · Instagram');
  await expect(page.locator('#anuncios .eyebrow')).toHaveText('Meta Ads');
  await expect(page.locator('.business-route strong')).toHaveText(['Meta Ads', 'Cobros', 'Facturación', 'Delivery']);
  expect(await page.locator('.hero-capabilities use').evaluateAll((uses) => uses.map((use) => use.getAttribute('href')))).toEqual(['#i-receipt', '#i-truck', '#i-megaphone']);
  for (const id of ['i-truck', 'i-megaphone']) await expect(page.locator(`symbol#${id}`)).toHaveCount(1);
  await expect(page.locator('.button-header')).toContainText('Quiero cobrar');
  await expect(page.locator('.site-footer .footer-contact')).toContainText('Quiero empezar');
  await expect(page.locator('.site-footer a[href="/solicitar-acceso/"]')).toHaveText('Solicitar acceso');
  // Every contact goes to the tenant's own WhatsApp with the message of its context.
  const destinations = await page.locator('[data-support-cta]').evaluateAll((links) => links.map((link) => ({
    placement: link.getAttribute('data-support-cta')!, href: link.getAttribute('href')!,
  })));
  expect(new Set(destinations.map((item) => item.placement))).toEqual(new Set(['header', 'hero', 'panel', 'onboarding', 'calculator', 'question', 'closing', 'footer', 'delivery', 'ads']));
  for (const { placement, href } of destinations) {
    const url = new URL(href);
    expect(`${url.origin}${url.pathname}`).toBe(commerceSupport);
    const expected = commerceMessages[`photographic.contact.messages.${placement}`]
      .replaceAll('{adsName}', 'Meta Ads').replaceAll('{adsNetwork1}', 'Facebook').replaceAll('{adsNetwork2}', 'Instagram');
    expect(url.searchParams.get('text'), placement).toBe(expected);
  }
  // Shortcuts and footer links land on blocks this page renders; Meta Ads is a tenant service, not a hidden provider.
  const anchors = await page.locator('a[href^="#"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')!.slice(1)));
  for (const id of new Set(anchors)) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  await page.locator('.solution-navigation a[href="#anuncios"]').click();
  await expect(page).toHaveURL(/#anuncios$/);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/Medipago|médic|consultorio|4\.9|\{ads/i);
});

test('the visitor types the commission: empty at first, validated per field and never a tenant rate', async ({ landingPage: page }) => {
  await gotoLanding(page, COMMERCE_HOST);
  const amount = page.locator('#calc-amount');
  const rate = page.locator('#calc-rate');
  const submit = page.locator('#price-calculator button[type="submit"]');
  await expect(rate).toHaveValue('');
  await expect(rate).toHaveAttribute('placeholder', 'Ingrese un porcentaje');
  await expect(page.locator('[data-commission], .calc-pricing')).toHaveCount(0);
  await expect(page.locator('#calc-net')).toHaveText('—');
  await expect(page.locator('#calc-status')).toHaveText(commerceMessages['photographic.calculator.empty']);
  await submit.click();
  await expect(rate).toBeFocused();
  await expect(rate).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#calc-error')).toHaveText(commerceMessages['photographic.calculator.invalidRate']);
  await expect(page.locator('#calc-status')).toHaveText(commerceMessages['photographic.calculator.incomplete']);
  await amount.fill('250');
  await rate.fill('3,50');
  await expect(rate).not.toHaveAttribute('aria-invalid');
  await expect(page.locator('#calc-error')).toBeEmpty();
  await rate.press('Enter');
  await expect(page.locator('#calc-net')).toHaveText(/Q\s?241\.25/);
  await expect(page.locator('#calc-fee')).toHaveText(/Q\s?8\.75/);
  await expect(page.locator('#calc-status')).toHaveText(commerceMessages['photographic.calculator.done']);
  await amount.fill('0');
  await expect(page.locator('#calc-net')).toHaveText('—');
  await expect(page.locator('#calc-status')).toHaveText(commerceMessages['photographic.calculator.changed']);
  await submit.click();
  await expect(amount).toBeFocused();
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#calc-error')).toHaveText(commerceMessages['photographic.calculator.invalidAmount']);
  for (const invalid of ['100.01', '-1', '1e2', '3.333']) {
    await amount.fill('100');
    await rate.fill(invalid);
    await submit.click();
    await expect(rate, invalid).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#calc-fee')).toHaveText('—');
  }
  await rate.fill('100');
  await submit.click();
  await expect(page.locator('#calc-net')).toHaveText(/Q\s?0\.00/);
});

test('without JavaScript the commerce landing keeps every block and explains the disabled simulation', async () => {
  if (!tenantBrowser) throw new Error('Tenant browser is not running');
  const context = await tenantBrowser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    expect((await page.goto(`http://${COMMERCE_HOST}:${appPort}/`))?.status()).toBe(200);
    await expect(page.locator('#calc-amount')).toBeDisabled();
    await expect(page.locator('#calc-rate')).toBeDisabled();
    await expect(page.locator('#price-calculator button[type="submit"]')).toBeDisabled();
    await expect(page.locator('#calc-status')).toHaveText(commerceMessages['photographic.ui.calculator_nojs']);
    for (const name of ['summary', 'billing', 'withdrawals']) await expect(page.locator(`#panel-${name}`)).toBeVisible();
    await expect(page.locator('.business-card .vertical-panel')).toHaveCount(2);
    for (const panel of await page.locator('.business-card .vertical-panel').all()) await expect(panel).toBeVisible();
    await expect(page.locator('#faq-list > details')).toHaveCount(6);
    await checkOverflow(page);
  } finally { await context.close(); }
});

test('the verticals animate on entry and re-entry, pause with the tab hidden and stay still with reduced motion', async ({ landingPage: page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await gotoLanding(page, COMMERCE_HOST);
  await expect(page.locator('[data-replay], .hero-motion, [data-motion-toggle]')).toHaveCount(0);
  for (const card of await page.locator('.business-card').all()) {
    await card.locator('.service-stage').scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute('data-animated', '');
    await expect(card).toHaveAttribute('data-playing', 'true');
    await expect.poll(() => card.evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length)).toBeGreaterThan(0);
    const firstStart = await card.evaluate((element) => element.getAnimations({ subtree: true })[0].startTime);
    // A hidden tab pauses the sequence where it is, without restarting it.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(card).toHaveAttribute('data-playing', 'false');
    await expect(card).toHaveAttribute('data-animated', '');
    await expect.poll(() => card.evaluate((element) => element.getAnimations({ subtree: true }).every((animation) => animation.playState !== 'running'))).toBe(true);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(card).toHaveAttribute('data-playing', 'true');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(card).not.toHaveAttribute('data-animated');
    await card.locator('.service-stage').scrollIntoViewIfNeeded();
    await expect.poll(() => card.evaluate((element) => element.getAnimations({ subtree: true })[0]?.startTime)).toBeGreaterThan(Number(firstStart));
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const card of await page.locator('.business-card').all()) {
    await expect(card).not.toHaveAttribute('data-animated');
    expect(await card.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
  }
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`the commerce landing reflows, keeps its menu, panel and FAQ usable and passes Axe at ${viewport.width}×${viewport.height}`, async ({ landingPage: page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoLanding(page, COMMERCE_HOST);
    await page.locator('.onboarding-photo').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
    await checkOverflow(page);
    if (viewport.width < 981) {
      const toggle = page.locator('.menu-toggle');
      await toggle.click();
      await expect(page.locator('#mobile-menu a')).toHaveText(['Soluciones', 'Cómo funciona', 'Su panel', 'Para quién', 'Calculadora', 'Preguntas']);
      // The last destination stays reachable even when the menu is taller than a landscape screen.
      const last = page.locator('#mobile-menu a').last();
      await last.focus();
      await expect(last).toBeInViewport({ ratio: 1 });
      await page.keyboard.press('Escape');
      await expect(toggle).toBeFocused();
    } else {
      await expect(page.locator('.desktop-nav a')).toHaveCount(6);
      await expect(page.locator('.header-access')).toBeVisible();
    }
    await page.locator('[data-panel-tab="billing"]').click();
    await expect(page.locator('#panel-billing [data-panel-money="collected"]')).toHaveText(/Q\s?480\.00/);
    await page.locator('[data-panel-filter="link"]').click();
    await expect(page.locator('#panel-transaction-rows tr:visible')).toHaveCount(1);
    await expect(page.locator('#panel-transaction-rows tr:visible')).toContainText(/Q\s?180\.00/);
    await page.locator('[data-panel-tab="withdrawals"]').click();
    await expect(page.locator('#panel-withdrawals [data-panel-money="withdraw"]')).toHaveText(/Q\s?0\.00/);
    await expect(page.locator('#panel-withdrawals .panel-disabled')).toBeDisabled();
    const faq = page.locator('#faq-list > details').last();
    await faq.locator('summary').click();
    await expect(faq).toHaveAttribute('open', '');
    await expect(faq.locator('p')).toContainText('Facebook e Instagram');
    await checkOverflow(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations)).toEqual([]);
  });
}

test('commerce verticals never leak into the medical tenant, and the same tenant without them still serves', async ({ landingPage: page }) => {
  for (const host of [COMMERCE_HOST, HOST, PLAIN_COMMERCE_HOST, COMMERCE_HOST, HOST]) {
    await gotoLanding(page, host);
    const full = host === COMMERCE_HOST;
    await expect(page.locator('.business-card, .business-route, .solution-navigation')).toHaveCount(full ? 4 : 0);
    await expect(page.locator('symbol#i-truck, symbol#i-megaphone')).toHaveCount(full ? 2 : 0);
    await expect(page.locator('#calc-rate')).toHaveCount(full ? 1 : 0);
    await expect(page.locator('[data-commission]')).toHaveCount(host === HOST ? 1 : 0);
    await expect(page.locator('.pricing-card')).toHaveCount(host === PLAIN_COMMERCE_HOST ? 1 : 0);
    if (full) await expect(page.locator('body')).toHaveAttribute('data-type-scale', 'compact');
    else await expect(page.locator('body')).not.toHaveAttribute('data-type-scale');
    const body = await page.locator('body').innerText();
    if (host === HOST) {
      expect(body).not.toMatch(/Vende Fácil|Meta Ads|Facebook|Instagram|Delivery/);
      await expect(page.locator('[data-support-cta="header"]')).toHaveAttribute('href', /^https:\/\/wa\.me\/50244866448\?/);
      await expect(page.locator('.service-card[id]')).toHaveCount(0);
    } else {
      expect(body).not.toMatch(/Medipago|médic|consultorio/i);
      await expect(page.locator('[data-support-cta="header"]')).toHaveAttribute('href', /^https:\/\/wa\.me\/50236532841\?/);
    }
    if (host === PLAIN_COMMERCE_HOST) expect(body).not.toMatch(/Meta Ads|Facebook|Instagram/);
  }
});
