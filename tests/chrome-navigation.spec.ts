import { expect, test } from '@playwright/test';

const navigation = ['Solutions', 'Infrastructure', 'AI', 'Blog', 'Documentation', 'Contact'];
const destinations = ['/#capacidades', '/#arquitectura', '/#inteligencia', '/blog/', 'https://developer.1platform.pro/docs/saas/1platform-api/getting-started', 'https://wa.me/50253946564'];

test('the same desktop chrome exposes the approved navigation on the home and interior pages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ['/', '/about/', '/blog/']) {
    await page.goto(path);
    const header = page.locator('.brand-header');
    await expect(header).toBeVisible();
    await expect(header.locator('.brand-lockup')).toBeVisible();
    await expect(header.locator('.brand-cta')).toHaveAttribute('href', 'https://wa.me/50253946564');
    await expect(header.locator('.brand-nav a')).toHaveText(navigation);
    expect(await header.locator('.brand-nav a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(destinations);
  }
});

test('the shared compact menu is fully keyboard-operable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about/');
  const toggle = page.locator('.brand-menu-toggle');
  const menu = page.locator('#brand-mobile-nav');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
  await expect(menu.locator('a')).toHaveCount(7);
  await expect(menu.locator('a').last()).toHaveAttribute('href', 'https://wa.me/50253946564');
  await page.keyboard.press('Tab');
  await expect(menu.locator('a').first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('the landing compact menu transfers keyboard focus to its sections', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('.brand-menu-toggle');
  const menu = page.locator('#brand-mobile-nav');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await menu.locator('a[href="/#capacidades"]').focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#capacidades')).toBeFocused();
  await expect(page).toHaveURL(/#capacidades$/);
});

test('reduced motion keeps the infrastructure illustration static and WebGL-free', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(0);
  const wires = page.locator('.hero-wire-travel');
  await expect(wires).toHaveCount(3);
  for (const wire of await wires.all()) {
    await expect(wire).toHaveCSS('animation-name', 'none');
    expect(await wire.evaluate((node) => node.getAnimations().length)).toBe(0);
  }
  await expect(page.locator('[data-replay], .hero-motion')).toHaveCount(0);
  const capability = page.locator('[data-capability]').last();
  await capability.click();
  await expect(capability).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-selected-list] li')).toHaveCount(4);
});

test('the infrastructure home names the approved capabilities and honest availability in both languages', async ({ page }) => {
  for (const [path, names, preparation] of [
    ['/', ['Payments', 'Invoicing', 'Delivery', 'Subscriptions', 'Digital advertising', 'Sites and domains', 'Email', 'Agents', 'Telemetry', 'White label'], ['PAYMENTS IN DEVELOPMENT', 'INTEGRATION IN DEVELOPMENT', 'WHATSAPP IN DEVELOPMENT']],
    ['/es/', ['Cobros', 'Facturación', 'Delivery', 'Suscripciones', 'Publicidad digital', 'Sitios y dominios', 'Correo', 'Agentes', 'Telemetría', 'Marca blanca'], ['COBROS EN PREPARACIÓN', 'INTEGRACIÓN EN PREPARACIÓN', 'WHATSAPP EN PREPARACIÓN']],
  ] as const) {
    await page.goto(path);
    await expect(page.locator('.capability-text strong')).toHaveText([...names]);
    await expect(page.locator('.capability-text em')).toHaveText([...preparation]);
    await expect(page.locator('.hero-pulse')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.integration-preview')).toHaveAttribute('aria-labelledby', 'integration-title');
    await expect(page.locator('.connected-note')).toContainText('WhatsApp');
    await expect(page.locator('.ai-demo-note')).toContainText(path === '/' ? 'in development' : 'en desarrollo');
    await expect(page.locator('.payment-card').nth(1)).toContainText(path === '/' ? 'in development' : 'en preparación');
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/Salesforce|HubSpot|Zapier|Slack|100%|unlimited sales|ventas ilimitadas/);
  }
});

test('the need cards align on desktop and stack without clipping on mobile', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900, columns: 3 },
    { width: 390, height: 844, columns: 1 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/es/');
    const cards = page.locator('.outcome-grid article');
    const geometry = await cards.evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, width: box.width, height: box.height };
    }));
    expect(geometry).toHaveLength(3);
    expect(Math.max(...geometry.map(({ width }) => width)) - Math.min(...geometry.map(({ width }) => width))).toBeLessThanOrEqual(1);
    expect(new Set(geometry.map(({ top }) => Math.round(top))).size).toBe(viewport.columns === 1 ? 3 : 1);
    for (const box of geometry) {
      expect(box.height).toBeGreaterThan(0);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(viewport.width);
    }
    if (viewport.columns === 1) {
      expect(geometry[1].top).toBeGreaterThanOrEqual(geometry[0].bottom);
      expect(geometry[2].top).toBeGreaterThanOrEqual(geometry[1].bottom);
    } else {
      expect(Math.max(...geometry.map(({ height }) => height)) - Math.min(...geometry.map(({ height }) => height))).toBeLessThanOrEqual(1);
    }
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator('h3')).toBeVisible();
      await expect(card.locator('p')).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('the continuous infrastructure animation resumes automatically on re-entry', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const wire = page.locator('.hero-wire-travel').first();
  await expect(wire).toHaveCSS('animation-name', 'hero-wire-travel');
  await expect(wire).toHaveCSS('animation-iteration-count', 'infinite');
  const start = await wire.evaluate((node) => getComputedStyle(node).strokeDashoffset);
  await expect.poll(() => wire.evaluate((node) => getComputedStyle(node).strokeDashoffset)).not.toBe(start);
  await page.locator('#arquitectura').scrollIntoViewIfNeeded();
  await expect(wire).toHaveCSS('animation-play-state', 'paused');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(wire).toHaveCSS('animation-play-state', 'running');
  await expect(page.locator('[data-replay]')).toHaveCount(0);
});

test('the home retains reciprocal SEO alternatives and focused project CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', 'https://1platform.pro/');
  await expect(page.locator('link[hreflang="es"]')).toHaveAttribute('href', 'https://1platform.pro/es/');
  const actions = page.locator('.hero-actions a');
  await expect(actions).toHaveCount(2);
  await expect(actions.first()).toHaveAttribute('href', '#capacidades');
  await expect(actions.last()).toHaveAttribute('href', 'https://wa.me/50253946564');
});
