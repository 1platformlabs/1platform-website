import { test as base, expect, chromium, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// WMT-05/06/11, scoped approved migration. No mocks, request interception,
// webServer fixture or synthetic responses. Start the canonical private bank.
const port = Number(process.env.WEBSITE_E2E_PORT || 4421);
const output = process.env.WEBSITE_E2E_EVIDENCE || 'test-results/real-landings';
let browser: Browser;
const hosts = ['medipago.gt', '1platform.pro', 'aurora.example', 'unknown.example', 'www.medipago.gt'];
const test = base.extend<{ live: Page }>({
  live: async ({}, use) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await use(await context.newPage());
    await context.close();
  },
});
test.skip(!process.env.WEBSITE_E2E_PORT, 'Requires the authorized private real-service bank');
test.beforeAll(async () => {
  mkdirSync(output, { recursive: true });
  browser = await chromium.launch({ args: [`--host-resolver-rules=${hosts.map(h => `MAP ${h} 127.0.0.1`).join(', ')}`] });
});
test.afterAll(async () => { await browser?.close(); });
async function visit(page: Page, host = 'medipago.gt', path = '/') {
  expect((await page.goto(`http://${host}:${port}${path}`))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}
const homes = [
  { host: 'medipago.gt', path: '/', id: 'medipago', title: 'Cobre con tarjeta.', locale: 'es-GT', cta: 'https://wa.me/50244866448', currency: 'Q' },
  { host: '1platform.pro', path: '/', id: 'oneplatform-en', title: 'Sell online.', locale: 'en', cta: 'https://app.1platform.pro/app/', currency: '$' },
  { host: '1platform.pro', path: '/es/', id: 'oneplatform-es', title: 'Venda en línea.', locale: 'es', cta: 'https://app.1platform.pro/app/', currency: '$' },
];
for (const home of homes) {
  for (const width of [1440, 390]) {
    test(`${home.id} ${width}: actual Host, metadata, tenant content, a11y and visual`, async ({ live: page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await visit(page, home.host, home.path);
      await expect(page.locator('body')).toHaveAttribute('data-home-template', 'photographic-service');
      await expect(page.locator('body')).toHaveAttribute('data-enhanced', 'true');
      await expect(page.locator('html')).toHaveAttribute('lang', home.locale);
      await expect(page.locator('h1')).toContainText(home.title);
      await expect(page.locator('h1')).toHaveCSS('font-family', /Manrope/);
      await expect(page.locator('.panel-demo')).toHaveCSS('font-family', /PanelInter/);
      await expect(page.locator('.panel-demo')).toHaveCSS('font-size', '16px');
      await expect(page.locator('.panel-footnote p')).toHaveCSS('font-size', '16px');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://${home.host}${home.path}`);
      await expect(page.locator('.hero-motion,.hero-eyebrow')).toHaveCount(0);
      const copy = await page.locator('body').innerText();
      expect(copy).not.toMatch(/Para médicos especialistas|factura asistida|tarifas pendientes|prototipo|Android/i);
      expect(await page.locator('head').innerHTML()).not.toMatch(/name="robots"[^>]*noindex/);
      const destinations = await page.locator('[data-support-cta]').evaluateAll(es => es.map(e => e.getAttribute('href')!));
      expect(destinations.length).toBeGreaterThan(5);
      for (const href of destinations) expect(href.split('?')[0]).toBe(home.cta);
      if (home.id === 'medipago') {
        expect(copy).toMatch(/datos.*ficticios/i);
        expect(copy).toMatch(/facturación automática/i);
        expect(copy).not.toMatch(/\bUSD\b|\$480/);
        await expect(page.locator('#calc-net')).toHaveText(/Q\s?95\.10/);
      } else {
        expect(copy).not.toMatch(/Medipago|4\.9%|Q\s?95\.10/);
        await expect(page.locator('#price-calculator')).toHaveCount(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
      await page.screenshot({ path: join(output, `${home.id}-${width}.png`), fullPage: true });
    });
  }
}
test('keyboard navigation, focus, menu and panel tabs on both brands', async ({ live: page }) => {
  for (const host of ['medipago.gt', '1platform.pro']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, host);
    const toggle = page.locator('.menu-toggle');
    await toggle.focus(); await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape'); await expect(toggle).toBeFocused();
    await expect(page.locator('#mobile-menu')).toBeHidden();
    await toggle.click(); await page.locator('#mobile-menu a[href="#su-panel"]').click();
    await expect(page.locator('#su-panel')).toBeFocused();
    await expect(page.locator('.site-header')).toHaveCSS('position', 'fixed');
    await expect(page.locator('#mobile-menu')).toBeHidden();
    const summary = page.locator('[data-panel-tab="summary"]');
    await summary.focus(); await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-panel-tab="billing"]')).toBeFocused();
    await page.locator('[data-panel-filter="expense"]').click();
    await expect(page.locator('#panel-transaction-rows tr:visible')).toHaveCount(1);
    await page.screenshot({ path: join(output, `${host}-panel-mobile.png`) });
    await page.keyboard.press('Tab');
    await page.locator('[data-panel-tab="withdrawals"]').click();
    await expect(page.locator('#panel-withdrawals [data-panel-money="withdraw"]')).toHaveText(/0\.00/);
    await expect(page.locator('#panel-withdrawals .panel-disabled')).toBeDisabled();
  }
});
test('calculator cent rounding, errors and recovery use one editable amount', async ({ live: page }) => {
  await visit(page);
  const form = page.locator('#price-calculator'); const amount = page.locator('#calc-amount');
  await expect(form.locator('input,select,textarea')).toHaveCount(1);
  for (const [value, fee, net] of [['100', '4.90', '95.10'], ['5', '0.25', '4.75'], ['0.01', '0.00', '0.01'], ['100,00', '4.90', '95.10']]) {
    await amount.fill(value); await amount.press('Enter');
    await expect(page.locator('#calc-fee')).toHaveText(new RegExp(`Q\\s?${fee.replace('.', '\\.')}`));
    await expect(page.locator('#calc-net')).toHaveText(new RegExp(`Q\\s?${net.replace('.', '\\.')}`));
  }
  for (const value of ['0', '-1', '1.234', '1e2']) {
    await amount.fill(value); await amount.press('Enter');
    await expect(amount).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#calc-net')).toHaveText('—');
  }
  await amount.fill('100'); await amount.press('Enter');
  await expect(amount).not.toHaveAttribute('aria-invalid');
});
test('photograph animates, pauses offscreen and respects reduced motion', async ({ live: page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await visit(page);
  const photo = page.locator('.hero-photo');
  await expect(page.locator('.hero')).toHaveAttribute('data-motion', 'playing');
  const matrix = await photo.evaluate(el => getComputedStyle(el).transform);
  await expect.poll(() => photo.evaluate(el => getComputedStyle(el).transform)).not.toBe(matrix);
  await page.locator('.flow-panel').scrollIntoViewIfNeeded();
  await expect(page.locator('.hero')).toHaveAttribute('data-motion', 'paused');
  await expect(page.locator('.flow-panel')).toHaveAttribute('data-animated', '');
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator('.hero')).toHaveAttribute('data-motion', 'playing');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.hero')).toHaveAttribute('data-motion', 'reduced');
  await expect(photo).toHaveCSS('animation-name', 'none');
});
test('progressive enhancement: usable native FAQ and content without JS', async () => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const home of homes) {
    await visit(page, home.host, home.path);
    for (const id of ['summary', 'billing', 'withdrawals']) await expect(page.locator(`#panel-${id}`)).toBeVisible();
    await page.locator('#faq-list summary').first().click();
    await expect(page.locator('#faq-list details').first()).toHaveAttribute('open', '');
    if (home.id === 'medipago') { await expect(page.locator('#calc-amount')).toBeDisabled(); await expect(page.locator('#calc-net')).toHaveText(/95\.10/); }
  }
  await context.close();
});
test('secondary routes and independent tenant retain origin/main rendering', async ({ live: page }) => {
  for (const [host, path, id] of [['1platform.pro','/pricing/','pricing'], ['1platform.pro','/es/solutions/','solutions-es'], ['aurora.example','/','independent']]) {
    await visit(page, host, path);
    const text = await page.locator('main').innerText();
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.locator('body').getAttribute('data-home-template')).not.toBe('photographic-service');
    const branch = await page.screenshot({ animations: 'disabled', path: join(output, `${id}.png`) });
    if (id !== 'independent') {
      // Main cannot read the new closed template enum after activation. Its
      // secondary-page control was captured before activation on this same DB.
      const baseline = JSON.parse(readFileSync(join(output, 'control-render.json'), 'utf8'));
      expect(text).toBe(baseline[id].text);
      expect(branch.equals(readFileSync(join(output, `control-${id}.png`)))).toBe(true);
      continue;
    }
    const control = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    expect((await control.goto(`http://${host}:4521${path}`))?.status()).toBe(200);
    await control.evaluate(() => document.fonts.ready);
    expect(await control.locator('main').innerText()).toBe(text);
    // Independent legacy tenant uses the same DB and both real APIs.
    if (id === 'independent') expect((await control.screenshot({ animations: 'disabled' })).equals(branch)).toBe(true);
    await control.close();
  }
});
test('unknown host and unpublished routes fail closed; host aliases stay tenant scoped', async ({ live: page }) => {
  expect((await page.goto(`http://unknown.example:${port}/`))?.status()).toBe(404);
  expect((await page.goto(`http://medipago.gt:${port}/pricing/`))?.status()).toBe(404);
  expect((await page.goto(`http://www.medipago.gt:${port}/`))?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText('Cobre con tarjeta.');
});
