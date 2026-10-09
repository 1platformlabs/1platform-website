// Real bank only. No server, network interception, mocks or fixture data.
// node tests/bench/browser_vendefacil_services.mjs before|active|control|regression|rollback OUT
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const [phase, output] = process.argv.slice(2);
assert(['before', 'active', 'control', 'regression', 'rollback'].includes(phase) && output);
mkdirSync(output, { recursive: true });
const ports = { branch: 5021, main: 5121 }, host = 'vendefacil.1platform.pro';
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }];
const results = [];
const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP vendefacil.1platform.pro 127.0.0.1, MAP medipago.gt 127.0.0.1, MAP 1platform.pro 127.0.0.1'] });
const check = (name, ok, detail) => { results.push({ name, pass: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); assert(ok, name); };
const api = async path => { const r = await fetch(`http://127.0.0.1:8710/api/v1${path}`); assert.equal(r.status, 200); return (await r.json()).data; };
const normalize = text => text.replace(/\s+/g, ' ').trim();
const aliases = text => text.replaceAll('{adsName}', 'Meta Ads').replaceAll('{adsNetwork1}', 'Facebook').replaceAll('{adsNetwork2}', 'Instagram');
async function open(domain, port, viewport, path = '/') {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', locale: path === '/es/' ? 'es-GT' : 'en-US' });
  const page = await context.newPage();
  const response = await page.goto(`http://${domain}:${port}${path}`);
  assert.equal(response.status(), 200, `${domain}:${port}${path}`);
  await page.locator('main h1, .hero h1').first().waitFor();
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode(); })); });
  return page;
}
async function overflow(page) {
  check(`no horizontal overflow ${page.viewportSize().width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}
async function measure(page) {
  return page.locator('.solutions-grid > article').evaluateAll(elements => elements.map(element => {
    const b = element.getBoundingClientRect(), stage = element.querySelector('.service-stage').getBoundingClientRect();
    const copy = element.querySelector('.service-stage').previousElementSibling.getBoundingClientRect();
    return { id: element.id, width: b.width, height: b.height, x: b.x, y: b.y, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
      text: element.innerText.replace(/\s+/g, ' ').trim(), stageX: stage.x, stageY: stage.y, copyRight: copy.right, copyBottom: copy.bottom };
  }));
}
async function awaitPublishedContent(port, enabled) {
  // A real PUT does not invalidate the SSR process's 60-second cache. Observe
  // the intended persisted generation before measuring; never restart it away.
  const page = await browser.newPage();
  try {
    await expect.poll(async () => {
      const response = await page.goto(`http://${host}:${port}/`);
      return response.status() === 200 && await page.locator('#price-calculator').count() === 1 && await page.locator('#tienda-online').count() === Number(enabled);
    }, { timeout: 75_000, intervals: [1000] }).toBe(true);
  } finally { await page.close(); }
}
try {
  if (phase === 'before' || phase === 'rollback' || phase === 'regression') {
    if (phase === 'rollback') for (const port of Object.values(ports)) await awaitPublishedContent(port, false);
    const surfaces = phase === 'rollback' ? [[host, '/']] : [...(phase === 'before' ? [[host, '/']] : []), ['medipago.gt', '/'], ['1platform.pro', '/'], ['1platform.pro', '/es/']];
    for (const [domain, path] of surfaces) for (const viewport of viewports) {
      const hashes = [];
      for (const [label, port] of Object.entries(ports)) {
        const page = await open(domain, port, viewport, path);
        await expect(page.locator('#tienda-online,#correo-profesional')).toHaveCount(0);
        await overflow(page);
        const png = await page.screenshot({ path: `${output}/${phase}-${domain}-${path === '/' ? 'root' : 'es'}-${viewport.width}-${label}.png`, fullPage: true });
        hashes.push(createHash('sha256').update(png).digest('hex'));
        await page.close();
      }
      check(`${phase} exact rendering ${domain}${path} ${viewport.width}`, hashes[0] === hashes[1], hashes);
    }
  } else if (phase === 'control') {
    const page = await browser.newPage();
    await expect.poll(async () => (await page.goto(`http://${host}:${ports.main}/`)).status(), { timeout: 75_000, intervals: [1000] }).toBe(503);
    check('main rejects new configured anchors with 503', true);
    await expect(page.locator('meta[name="photographic-capabilities"]')).toHaveCount(0);
    await page.screenshot({ path: `${output}/control-unavailable.png` });
    // The same acceptance premise that succeeds in the branch must fail here.
    let discriminates = false;
    try { assert.equal(await page.locator('.solutions-grid > article').count(), 6); } catch { discriminates = true; }
    check('same six-card assertion fails on main', discriminates);
    await page.close();
  } else {
    await awaitPublishedContent(ports.branch, true);
    const manifest = await api('/sites/by-host?host=' + host);
    const content = await api('/sites/vendefacil/pages?locale=es');
    const messages = Object.assign({}, ...content.pages.map(page => page.blocks));
    assert.equal(messages['photographic.solutions.mode'], 'uniform');
    const reviews = await api('/sites/vendefacil/reviews');
    check('no fabricated reviews in the real bank', reviews.summary.count === 0);
    for (const viewport of viewports) {
      const page = await open(host, ports.branch, viewport);
      await expect(page.locator('body')).toHaveAttribute('data-enhanced', 'true');
      await expect(page.locator('meta[name="photographic-capabilities"]')).toHaveAttribute('content', 'uniform-services-v1');
      const sizes = await measure(page);
      check(`six ordered cards ${viewport.width}`, JSON.stringify(sizes.map(x => x.id)) === JSON.stringify(['cobros-presenciales', 'enlaces-de-cobro', 'facturacion', 'delivery', 'tienda-online', 'correo-profesional']));
      for (const card of sizes) {
        check(`${viewport.width} ${card.id} equal and unclipped`, Math.abs(card.width - sizes[0].width) < 0.05 && Math.abs(card.height - sizes[0].height) < 0.05 && card.clientHeight === card.scrollHeight);
        check(`${viewport.width} ${card.id} responsive orientation`, viewport.width > 560 && viewport.width <= 1100 ? card.stageX > card.copyRight : card.stageY >= card.copyBottom - 1);
      }
      const grid = await page.locator('.solutions-grid').boundingBox(), ads = await page.locator('#anuncios').boundingBox();
      check(`full width advertising below ${viewport.width}`, Math.abs(grid.width - ads.width) < 0.05 && ads.y > sizes[5].y + sizes[5].height);
      await overflow(page);
      await expect(page.locator('.solution-navigation a')).toHaveText(['Cobros presenciales', 'Enlaces de cobro', 'Facturación', 'Delivery', 'Tienda en línea', 'Correo profesional', 'Meta Ads']);
      for (const [id, key] of [['tienda-online', 'store'], ['correo-profesional', 'email']]) {
        await page.locator(`.solution-navigation a[href="#${id}"]`).focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`#${id}$`));
        await page.keyboard.press('Tab');
        const cta = page.locator(`[data-support-cta="${key}"]`);
        await expect(cta).toBeFocused();
        check(`visible keyboard focus ${key} ${viewport.width}`, await cta.evaluate(el => getComputedStyle(el).outlineStyle !== 'none'));
      }
      for (const link of await page.locator('[data-support-cta]').all()) {
        const placement = await link.getAttribute('data-support-cta'), target = new URL(await link.getAttribute('href'));
        assert.equal(target.origin + target.pathname, manifest.destinations.support);
        assert.equal(target.searchParams.get('text'), aliases(messages[`photographic.contact.messages.${placement}`]));
      }
      check(`all commercial CTAs use tenant destination and message ${viewport.width}`, true);
      for (const anchor of await page.locator('a[href^="#"]').all()) {
        const id = (await anchor.getAttribute('href')).slice(1);
        if (id) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
      }
      check(`no active animation with reduced motion ${viewport.width}`, await page.locator('.solutions-grid > article').evaluateAll(cards => cards.every(card => card.getAnimations({ subtree: true }).length === 0)));
      await expect(page.locator('#resenas,#contact-dialog')).toHaveCount(0);
      check(`no demo review storage ${viewport.width}`, await page.evaluate(() => Object.keys(localStorage).length === 0));
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await page.screenshot({ path: `${output}/bank-${viewport.width}-full.png`, fullPage: true });
      for (const index of viewport.width > 1100 ? [0, 3] : [0, 1, 2, 3, 4, 5]) {
        await page.locator('.solutions-grid > article').nth(index).evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 105, behavior: 'instant' }));
        await page.screenshot({ path: `${output}/bank-${viewport.width}-${index}.png` });
      }
      // Optional same-browser visual reference; not an API substitute.
      if (process.env.VFS_REFERENCE_URL) {
        const ref = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        await ref.goto(process.env.VFS_REFERENCE_URL);
        await ref.evaluate(() => document.fonts.ready);
        const expected = await measure(ref);
        check(`prototype geometry and complete copy ${viewport.width}`, sizes.every((card, i) => Math.abs(card.width - expected[i].width) < 0.05 && Math.abs(card.height - expected[i].height) < 0.05 && normalize(card.text) === normalize(expected[i].text)), { actual: sizes, reference: expected });
        for (const index of viewport.width > 1100 ? [0, 3] : [0, 1, 2, 3, 4, 5]) {
          await ref.locator('.solutions-grid > article').nth(index).evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 105, behavior: 'instant' }));
          await ref.screenshot({ path: `${output}/reference-${viewport.width}-${index}.png` });
        }
        await ref.close();
      }
      const axe = await new AxeBuilder({ page }).analyze();
      check(`Axe ${viewport.width}`, axe.violations.length === 0, axe.violations.map(v => v.id));
      if (viewport.width < 981) {
        const menu = page.locator('.menu-toggle');
        await menu.click();
        await expect(page.locator('#mobile-menu')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(menu).toBeFocused();
      }
      await page.locator('[data-panel-tab="billing"]').click();
      await expect(page.locator('#panel-billing [data-panel-money="collected"]')).toHaveText(/Q\s?480\.00/);
      await page.locator('[data-panel-filter="link"]').click();
      await expect(page.locator('#panel-transaction-rows tr:visible')).toHaveCount(1);
      await page.locator('[data-panel-tab="withdrawals"]').click();
      await expect(page.locator('#panel-withdrawals [data-panel-money="withdraw"]')).toHaveText(/Q\s?0\.00/);
      await page.locator('#calc-rate').fill('3,50');
      await page.locator('#calc-amount').fill('250');
      await page.locator('#calc-rate').press('Enter');
      await expect(page.locator('#calc-net')).toHaveText(/Q\s?241\.25/);
      await page.locator('#calc-rate').fill('-1');
      await page.locator('#calc-rate').press('Enter');
      await expect(page.locator('#calc-rate')).toHaveAttribute('aria-invalid', 'true');
      await page.locator('#price-calculator').screenshot({ path: `${output}/calculator-error-${viewport.width}.png` });
      await page.locator('.header-access').click();
      await expect(page.locator('[data-access-action="login"]')).toHaveAttribute('href', manifest.destinations.app);
      await page.screenshot({ path: `${output}/access-${viewport.width}.png`, fullPage: true });
      await page.getByRole('link', { name: 'Solicitar acceso', exact: true }).click();
      await expect(page.locator('[data-access-action="support"]')).toHaveAttribute('href', /^https:\/\/wa\.me\/50236532841\?text=/);
      await page.screenshot({ path: `${output}/request-access-${viewport.width}.png`, fullPage: true });
      await overflow(page);
      check(`access, request, calculator, panel and menu preserved ${viewport.width}`, true);
      await page.close();
    }
    const page = await open(host, ports.branch, viewports[0]);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const card of await page.locator('.business-card').all()) {
      await card.locator('.service-stage').scrollIntoViewIfNeeded();
      await expect(card).toHaveAttribute('data-playing', 'true');
      await expect.poll(() => card.evaluate(el => el.getAnimations({ subtree: true }).some(a => a.playState === 'running'))).toBe(true);
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      await expect(card).toHaveAttribute('data-playing', 'false');
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
      await expect(card).toHaveAttribute('data-playing', 'true');
    }
    check('commerce animations run and pause with hidden document', true);
    await page.close();
    const nojs = await browser.newPage({ javaScriptEnabled: false, viewport: viewports[1] });
    await nojs.goto(`http://${host}:${ports.branch}/`);
    await expect(nojs.locator('.solutions-grid > article')).toHaveCount(6);
    await expect(nojs.locator('#calc-rate')).toBeDisabled();
    await overflow(nojs);
    check('complete services without JavaScript', true);
    await nojs.close();
  }
} finally {
  writeFileSync(`${output}/${phase}-results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
