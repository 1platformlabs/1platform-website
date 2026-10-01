import { test as base, expect, chromium, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// 1platform-infraestructura-branding. No mocks, interception, fixture server
// or synthetic responses. Run only in the authorized private real-service bank.
const port = Number(process.env.WEBSITE_E2E_PORT || 4421);
const controlPort = Number(process.env.WEBSITE_E2E_CONTROL_PORT || 4521);
const output = process.env.WEBSITE_E2E_EVIDENCE || 'test-results/real-landings';
// The tenant's own support destination is DATA: read it from the bench API rather
// than freezing a number (the first real run found the hardcoded one was stale).
const apiPort = Number(process.env.WEBSITE_E2E_API_PORT || 8110);
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
  const response = await fetch(`http://127.0.0.1:${apiPort}/api/v1/sites/by-host?host=medipago.gt`);
  expect(response.status).toBe(200);
  const support = (await response.json()).data.destinations.support as string;
  expect(support).toMatch(/^https:\/\/wa\.me\/\d+$/);
  expect(support).not.toBe('https://wa.me/50253946564');
  homes[0].cta = support;
});
test.afterAll(async () => { await browser?.close(); });
async function visit(page: Page, host = 'medipago.gt', path = '/') {
  expect((await page.goto(`http://${host}:${port}${path}`))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}
const homes = [
  { host: 'medipago.gt', path: '/', id: 'medipago', title: 'Cobre con tarjeta', locale: 'es-GT', cta: '' },
  { host: '1platform.pro', path: '/', id: 'oneplatform-en', title: 'Infrastructure foryour next solution', locale: 'en', cta: 'https://wa.me/50253946564' },
  { host: '1platform.pro', path: '/es/', id: 'oneplatform-es', title: 'Infraestructura parasu próxima solución', locale: 'es', cta: 'https://wa.me/50253946564' },
];
for (const home of homes) {
  for (const width of [1440, 360, 390, 430, 844]) {
    test(`${home.id} ${width}: actual Host, metadata, tenant content, a11y and visual`, async ({ live: page }) => {
      await page.setViewportSize({ width, height: width === 844 ? 390 : width < 500 ? 844 : 900 });
      await visit(page, home.host, home.path);
      await expect(page.locator('html')).toHaveAttribute('lang', home.locale);
      await expect(page.locator('h1')).toContainText(home.title);
      await expect(page.locator('h1')).toHaveCSS('font-family', /Manrope/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://${home.host}${home.path}`);
      await expect(page.locator('.hero-motion,.hero-eyebrow')).toHaveCount(0);
      const copy = await page.locator('body').innerText();
      expect(copy).not.toMatch(/Para médicos especialistas|factura asistida|tarifas pendientes|prototipo|Android/i);
      expect(await page.locator('head').innerHTML()).not.toMatch(/name="robots"[^>]*noindex/);
      const destinations = await page.locator(home.id === 'medipago' ? '[data-support-cta]' : '.brand-cta,.contact .button').evaluateAll(es => es.map(e => e.getAttribute('href')!));
      expect(destinations.length).toBeGreaterThanOrEqual(home.id === 'medipago' ? 6 : 2);
      for (const href of destinations) expect(href.split('?')[0]).toBe(home.cta);
      if (home.id === 'medipago') {
        await expect(page.locator('body')).toHaveAttribute('data-home-template', 'photographic-service');
        await expect(page.locator('body')).toHaveAttribute('data-enhanced', 'true');
        await expect(page.locator('.panel-demo')).toHaveCSS('font-family', /PanelInter/);
        await expect(page.locator('.panel-demo')).toHaveCSS('font-size', '16px');
        await expect(page.locator('.panel-footnote p')).toHaveCSS('font-size', '16px');
        await expect(page.locator('[data-panel-mode="collections"]')).toHaveCount(1);
        await expect(page.locator('#faq-list details')).toHaveCount(3);
        expect(copy).toContain('Los importes y movimientos de esta demostración son ficticios');
        expect(copy).toMatch(/facturación automática/i);
        expect(copy).not.toMatch(/\bUSD\b|\$480/);
        await expect(page.locator('#calc-net')).toHaveText(/Q\s?95\.10/);
      } else {
        await expect(page.locator('[data-infrastructure-home]')).toBeVisible();
        await expect(page.locator('[data-capability]')).toHaveCount(10);
        await expect(page.locator('[data-capability][aria-pressed="true"]')).toHaveCount(3);
        await expect(page.locator('.panel-demo')).toHaveCount(0);
        await expect(page.locator('.ai-demo-note')).toContainText(home.locale === 'es' ? 'están en desarrollo' : 'in development');
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
test('keyboard navigation and each brand’s own illustrative controls retain focus', async ({ live: page }) => {
  for (const host of ['medipago.gt', '1platform.pro']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, host);
    const medipago = host === 'medipago.gt';
    const toggle = page.locator(medipago ? '.menu-toggle' : '.brand-menu-toggle');
    const menu = page.locator(medipago ? '#mobile-menu' : '.brand-mobile-nav');
    await toggle.focus(); await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape'); await expect(toggle).toBeFocused();
    await expect(menu).toBeHidden();
    await toggle.click(); await menu.locator(medipago ? 'a[href="#su-panel"]' : 'a[href$="#capacidades"]').click();
    await expect(page.locator(medipago ? '#su-panel' : '#capacidades')).toBeFocused();
    await expect(page.locator(medipago ? '.site-header' : '.brand-header')).toHaveCSS('position', 'fixed');
    await expect(menu).toBeHidden();
    if (!medipago) {
      const mutations: string[] = [];
      page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) mutations.push(request.url()); });
      const capability = page.locator('[data-capability]').first();
      await capability.focus(); await page.keyboard.press('Space');
      await expect(capability).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('[data-selected-list] li')).toHaveCount(2);
      await page.locator('[data-ai-switch]').focus(); await page.keyboard.press('Space');
      await expect(page.locator('[data-ai-switch]')).toHaveAttribute('aria-pressed', 'true');
      expect(mutations).toEqual([]);
      continue;
    }
    const summary = page.locator('[data-panel-tab="summary"]');
    await summary.focus(); await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-panel-tab="billing"]')).toBeFocused();
    await expect(page.locator('#panel-billing [data-panel-money="collected"]')).toHaveText(/Q\s?480\.00/);
    await expect(page.locator('#panel-billing .panel-callout')).toContainText('antes de comisiones');
    await page.locator('[data-panel-filter="card"]').click();
    await expect(page.locator('#panel-transaction-rows tr:visible')).toHaveCount(1);
    await page.screenshot({ path: join(output, `${host}-panel-mobile.png`) });
    await page.keyboard.press('Tab');
    await page.locator('[data-panel-tab="withdrawals"]').click();
    await expect(page.locator('#panel-withdrawals [data-panel-money="withdraw"]')).toHaveText(/0\.00/);
    await expect(page.locator('#panel-withdrawals .panel-disabled')).toBeDisabled();
    await expect(page.locator('#panel-withdrawals .panel-disabled')).toHaveText('Solicitar retiro');
    await expect(page.locator('#withdraw-reason')).toHaveText('Esta vista de ejemplo no presenta saldo disponible ni una cuenta de retiro configurada.');
    await expect(page.locator('#method-title')).toHaveText('Cuenta de retiro no configurada');
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
test('email capability and the clinic example remain tenant content, never a fabricated contact', async ({ live: page }) => {
  for (const home of homes) {
    await visit(page, home.host, home.path);
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    if (home.id === 'medipago') {
      const section = page.locator('.onboarding-section');
      await expect(section).toContainText('consulta@minombre.com');
      await expect(section.locator('h2')).not.toBeEmpty();
      expect((await section.locator('[data-support-cta]').getAttribute('href'))!.split('?')[0]).toBe(home.cta);
      expect(await section.innerText()).toMatch(/Medipago|usted|su /i);
    } else {
      const email = page.locator(`[data-capability="${home.locale === 'es' ? 'Correo' : 'Email'}"]`);
      await expect(email).toContainText(home.locale === 'es' ? 'Comunicación desde su dominio' : 'Communicate from your domain');
      expect(await page.locator('main').innerText()).not.toMatch(/Medipago|pacientes|consulta@minombre.com/i);
    }
  }
});
test('each approved illustration autoplays on entry and return without retired controls', async ({ live: page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const home of homes) {
    await visit(page, home.host, home.path);
    await expect(page.getByRole('button', { name: /Ver animaciones|Replay|Repetir|Pausar fondo|Pause/i })).toHaveCount(0);
    if (home.id !== 'medipago') {
      const wire = page.locator('.hero-wire-travel').first();
      await expect(wire).toHaveCSS('animation-iteration-count', 'infinite');
      await expect(wire).toHaveCSS('animation-play-state', 'running');
      await page.locator('#capacidades').scrollIntoViewIfNeeded();
      await expect(wire).toHaveCSS('animation-play-state', 'paused');
      await page.locator('#inicio').scrollIntoViewIfNeeded();
      await expect(wire).toHaveCSS('animation-play-state', 'running');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(wire).toHaveCSS('animation-name', 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      continue;
    }
    const sequences = page.locator('[data-sequence]');
    expect(await sequences.count()).toBeGreaterThanOrEqual(3);
    for (const item of await sequences.all()) {
      await (item.locator('.service-stage').or(item).first()).scrollIntoViewIfNeeded();
      await expect(item).toHaveAttribute('data-animated', '');
      await page.evaluate(() => scrollTo(0, 0));
      await expect(item).not.toHaveAttribute('data-animated');
      await (item.locator('.service-stage').or(item).first()).scrollIntoViewIfNeeded();
      await expect(item).toHaveAttribute('data-animated', '');
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const item of await sequences.all()) await expect(item).not.toHaveAttribute('data-animated');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
});
test('progressive enhancement: usable native FAQ and content without JS', async () => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const home of homes) {
    await visit(page, home.host, home.path);
    if (home.id === 'medipago') {
      for (const id of ['summary', 'billing', 'withdrawals']) await expect(page.locator(`#panel-${id}`)).toBeVisible();
      await page.locator('#faq-list summary').first().click();
      await expect(page.locator('#faq-list details').first()).toHaveAttribute('open', '');
      await expect(page.locator('#calc-amount')).toBeDisabled(); await expect(page.locator('#calc-net')).toHaveText(/95\.10/);
    } else {
      await expect(page.locator('.brand-noscript-nav')).toBeVisible();
      await expect(page.locator('[data-selected-list] li')).toHaveCount(3);
      await expect(page.locator('[data-infrastructure-home] h1')).toContainText(home.title);
      await page.locator('.brand-noscript-nav a').first().click();
      await expect(page).toHaveURL(/#capacidades$/);
    }
  }
  await context.close();
});
test('secondary routes preserve their content with approved chrome and the independent tenant remains identical', async ({ live: page }) => {
  for (const [host, path, id] of [['1platform.pro','/pricing/','pricing'], ['1platform.pro','/es/soluciones/','solutions-es'], ['aurora.example','/','independent']]) {
    await visit(page, host, path);
    const text = await page.locator('main').innerText();
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.locator('body').getAttribute('data-home-template')).not.toBe('photographic-service');
    const branch = await page.screenshot({ animations: 'disabled', path: join(output, `${id}.png`) });
    if (id !== 'independent') {
      // This epic changes 1Platform's shared chrome intentionally. Its legacy
      // page body remains the captured content; only the other tenant is held
      // to pixel equality. Controls precede this epic's content activation.
      const baseline = JSON.parse(readFileSync(join(output, 'control-render.json'), 'utf8'));
      expect(text).toBe(baseline[id].text);
      await expect(page.locator('.brand-header')).toBeVisible();
      await expect(page.locator('#site-header .brand-lockup')).toHaveAttribute('aria-label', /^1Platform\b/);
      await expect(page.locator('.brand-cta')).toHaveAttribute('href', 'https://wa.me/50253946564');
      continue;
    }
    const control = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    expect((await control.goto(`http://${host}:${controlPort}${path}`))?.status()).toBe(200);
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
  await expect(page.locator('h1')).toContainText('Cobre con tarjeta');
});

test('published blog, article and guide destinations preserve locale, history and deep links', async ({ live: page }) => {
  await visit(page, '1platform.pro', '/es/#arquitectura');
  await page.reload();
  await expect(page.locator('#architecture-title')).toBeVisible();
  await page.locator('.brand-nav a[href="/es/blog/"]').click();
  await expect(page).toHaveURL(/\/es\/blog\/$/);
  const article = page.locator('.archive-item a[href*="/es/blog/"]').first();
  const href = await article.getAttribute('href');
  expect(href).toBeTruthy();
  await article.click();
  // Wait for the ARTICLE, not any h1: the archive's own h1 is visible before the navigation commits.
  await expect(page).toHaveURL(new URL(href!, page.url()).href);
  await expect(page.locator('h1')).toBeVisible();
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/es\/blog\/$/);
  await page.goForward();
  expect(new URL(page.url()).pathname).toBe(new URL(href!, page.url()).pathname);
  await expect(page.locator('.brand-nav a').nth(4)).toHaveAttribute('href', /\/docs\/saas\/1platform-api\/getting-started\/?$/);
  await page.locator('.brand-languages [data-lang-choice="en"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toBeVisible();
});
