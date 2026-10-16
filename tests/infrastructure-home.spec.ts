import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const route = '/es/';

for (const [path, name, description, status, count] of [
  ['/es/', 'Nube', 'Servidores y bases de datos para sus ambientes', 'EN PREPARACIÓN', 'capacidades seleccionadas'],
  ['/', 'Cloud', 'Servers and databases for your environments', 'IN DEVELOPMENT', 'capabilities selected'],
]) {
  test(`${path}: Cloud is an illustrative, keyboard-selectable service in development`, async ({ page }) => {
    await page.goto(path);
    const cloud = page.locator(`[data-capability="${name}"]`);
    await expect(cloud.locator('.capability-number')).toHaveText('11');
    await expect(cloud.locator('small')).toHaveText(description);
    await expect(cloud.locator('em')).toHaveText(status);
    await expect(cloud).toHaveAttribute('aria-pressed', 'false');
    await expect(cloud.locator('..').locator('a')).toHaveCount(0);
    await expect(page.locator('[data-selection-count]')).toHaveText(`3 ${count}`);
    const mutations: string[] = [];
    page.on('request', (request) => {
      if (!['GET', 'HEAD'].includes(request.method())) mutations.push(request.url());
    });
    await page.locator('.capability-documentation').last().focus();
    await page.keyboard.press('Tab');
    await expect(cloud).toBeFocused();
    expect(await cloud.evaluate((button) => button.matches(':focus-visible'))).toBe(true);
    expect(await cloud.evaluate((button) => getComputedStyle(button).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Space');
    await expect(cloud).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-selected-list] li').last()).toHaveText(`${name} · ${status}`);
    await expect(page.locator('[data-selection-count]')).toHaveText(`4 ${count}`);
    await page.keyboard.press('Enter');
    await expect(cloud).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-selection-count]')).toHaveText(`3 ${count}`);
    expect(mutations).toEqual([]);
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 430, height: 932 },
  { width: 844, height: 390 },
]) {
  test(`infrastructure remains readable and selectable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(route);
    const home = page.locator('[data-infrastructure-home]');
    await expect(home).toBeVisible();
    await expect(home.locator('h1')).toHaveText('Infraestructura parasu próxima solución');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(home.locator('[data-capability]')).toHaveCount(11);
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    const selected = home.locator('[data-capability][aria-pressed="true"]');
    await expect(selected).toHaveCount(3);
    while (await selected.count()) await selected.first().click();
    await expect(home.locator('[data-selection-count]')).toHaveText('0 capacidades seleccionadas');
    await expect(home.locator('[data-selected-list]')).toHaveText('Seleccione servicios para su integración');
    for (const button of await home.locator('[data-capability]').all()) await button.click();
    await expect(home.locator('[data-selected-list] li')).toHaveCount(11);
    await expect(home.locator('[data-selection-count]')).toHaveText('11 capacidades seleccionadas');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('the keyboard-operated AI preview only changes illustrative content', async ({ page }) => {
  await page.goto(route);
  const mutations: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method())) mutations.push(request.url());
  });
  const control = page.locator('[data-ai-switch]');
  await control.focus();
  await page.keyboard.press('Space');
  await expect(control).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-ai-switch-label]')).toHaveText('IA en la demo');
  await expect(page.locator('#ai-preview')).toContainText('Su producto ofrece un agente de ventas');
  await expect(page.locator('.ai-demo-note')).toContainText('están en desarrollo');
  await page.keyboard.press('Space');
  await expect(control).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#ai-preview')).toContainText('Su producto conecta con un asesor');
  expect(mutations).toEqual([]);
});

test('the hero runs continuously and pauses outside the viewport with a static reduced-motion alternative', async ({ page }) => {
  await page.goto(route);
  const wire = page.locator('.infrastructure-home .hero-wire-travel').first();
  await expect(wire).toHaveCSS('animation-iteration-count', 'infinite');
  await expect(wire).toHaveCSS('animation-play-state', 'running');
  await page.locator('#capacidades').scrollIntoViewIfNeeded();
  await expect(wire).toHaveCSS('animation-play-state', 'paused');
  await page.locator('#inicio').scrollIntoViewIfNeeded();
  await expect(wire).toHaveCSS('animation-play-state', 'running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(wire).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('button', { name: /Pausar|Ver animaciones|Repetir recorrido/ })).toHaveCount(0);
});

test('locale content, deep links and browser history preserve the real routes', async ({ page }) => {
  await page.goto('/es/#arquitectura');
  await expect(page.locator('#architecture-title')).toBeVisible();
  const docs = page.locator('.layer-card--infrastructure a');
  await expect(docs).toHaveAttribute('href', /\/docs\/saas\/1platform-api\/getting-started\/?$/);
  await expect(page.locator('.contact .button')).toHaveAttribute('href', 'https://wa.me/50253946564');
  await page.reload();
  await expect(page.locator('#architecture-title')).toBeVisible();
  await page.goto('/es/blog/');
  await page.goBack();
  await expect(page.locator('[data-infrastructure-home]')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/es\/blog\//);
  await page.context().clearCookies();
  await page.goto('/');
  await expect(page.locator('.infrastructure-home h1')).toHaveText('Infrastructure foryour next solution');
  await expect(page.locator('[data-selection-count]')).toHaveText('3 capabilities selected');
});


test('mobile navigation and illustrative content remain accessible without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(new URL('/es/', baseURL).toString());
    await expect(page.locator('.brand-noscript-nav')).toBeVisible();
    await expect(page.locator('.brand-noscript-nav a')).toHaveCount(7);
    await expect(page.locator('[data-selected-list] li')).toHaveCount(3);
    await expect(page.locator('[data-infrastructure-home] h1')).toHaveText('Infraestructura parasu próxima solución');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('.brand-noscript-nav a').first().click();
    await expect(page).toHaveURL(/#capacidades$/);
  } finally { await context.close(); }
});
