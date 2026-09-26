import { expect, test } from '@playwright/test';

test('the desktop rail exposes the primary navigation and solution destinations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Standard page chrome remains a separate contract from the landing header.
  await page.goto('/about/');

  const rail = page.locator('.site-header__rail');
  await expect(rail).toBeVisible();
  await expect(rail.locator('.site-header__logo')).toBeVisible();
  await expect(rail.locator('.site-header__cta')).toHaveAttribute('href', 'https://app.1platform.pro/app/');

  const solutions = page.locator('.site-header__solutions');
  await solutions.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(solutions).toHaveAttribute('open', /.*/);
  // Five solutions plus "view all". Keep the exact count so a destination
  // silently disappearing from the standard menu still fails this contract.
  await expect(solutions.locator('.solutions-menu a')).toHaveCount(6);
  await expect(solutions.locator('.solutions-menu a').first()).toHaveAttribute('href', '/solutions/online-store/');
});

test('the standard compact menu is fully keyboard-operable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about/');

  const toggle = page.locator('#menu-toggle');
  const menu = page.locator('#mobile-menu');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
  await expect(menu.locator('.mobile-menu__sublist a')).toHaveCount(6);
  await expect(menu.locator('.btn--primary')).toHaveAttribute('href', 'https://app.1platform.pro/app/');

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('the landing compact menu transfers keyboard focus to its sections', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('.menu-toggle');
  const menu = page.locator('#mobile-menu');

  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await expect(menu.locator('a')).toHaveCount(6);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();

  await page.keyboard.press('Enter');
  await menu.locator('a[href="#su-panel"]').focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#su-panel')).toBeFocused();
});

test('reduced motion keeps the photographic home static and WebGL-free', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.service-card')).toHaveCount(3);
  await expect(page.locator('.hero')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('.hero-photo')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.hero-photo')).toHaveCSS('transform', 'none');
  await expect(page.locator('[data-replay]:visible')).toHaveCount(0);

  for (const selector of ['.service-card', '.flow-panel']) {
    for (const sequence of await page.locator(selector).all()) {
      await sequence.scrollIntoViewIfNeeded();
      await expect(sequence).toBeVisible();
      await expect(sequence).not.toHaveAttribute('data-animated');
      expect(await sequence.evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(0);
    }
  }
  await page.locator('[data-panel-tab="billing"]').click();
  await expect(page.locator('#panel-billing')).toBeVisible();
});

test('the photographic home names commerce capabilities and delivery in both languages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [path, titles, finalStep] of [
    ['/', ['Online payments.', 'Your store. Your brand.', 'Your invoice. Automatically.'], 'Invoice and deliver'],
    ['/es/', ['Pagos en línea.', 'Su tienda. Su marca.', 'Su factura. Automáticamente.'], 'Facture y entregue'],
  ] as const) {
    await page.goto(path);
    await expect(page.locator('input[type="radio"], [role="radio"], [role="radiogroup"]')).toHaveCount(0);
    await expect(page.locator('.hero-photo')).toBeVisible();
    // The animated hero is decorative; the secondary image carries the description.
    await expect(page.locator('.hero-photo')).toHaveAttribute('alt', '');
    await expect(page.locator('.onboarding-photo img')).toHaveAttribute('alt', /\S/);
    await expect(page.locator('.service-copy h3')).toHaveText([...titles]);
    await expect(page.locator('#steps-list > li')).toHaveCount(3);
    await expect(page.locator('#steps-list > li').last().locator('h3')).toHaveText(finalStep);
    await expect(page.locator('.flow-visual')).toHaveAttribute('role', 'img');
    await expect(page.locator('.flow-visual')).toHaveAttribute('aria-label', /\S/);
  }
});

test('the service cards align on desktop and stack without clipping on mobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const viewport of [
    { width: 1440, height: 900, columns: 3 },
    { width: 390, height: 844, columns: 1 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/es/');
    const geometry = await page.locator('.service-card').evaluateAll((cards) => cards.map((card) => {
      const box = card.getBoundingClientRect();
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
    for (const card of await page.locator('.service-card').all()) {
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator('h3')).toBeVisible();
      await expect(card.locator('.service-copy p')).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('the photograph moves and finite demonstrations restart automatically on re-entry', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const photo = page.locator('.hero-photo');
  await expect(photo).toHaveCSS('animation-name', 'hero-camera');
  const firstTransform = await photo.evaluate((node) => getComputedStyle(node).transform);
  await expect.poll(() => photo.evaluate((node) => getComputedStyle(node).transform)).not.toBe(firstTransform);

  const card = page.locator('.service-card').first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute('data-playing', 'true');
  await expect(card.locator('.product-panel')).toHaveCSS('animation-name', 'panel-arrive');
  await expect(card.locator('.product-panel')).toHaveCSS('animation-iteration-count', '1');
  await expect(page.locator('.hero')).toHaveAttribute('data-motion', 'paused');
  await expect(page.locator('[data-replay]')).toHaveCount(0);
  await expect(card.locator('h3')).toBeVisible();
  await expect.poll(() => card.evaluate((node) => Math.max(0, ...node.getAnimations({ subtree: true }).map((animation) => Number(animation.currentTime))))).toBeGreaterThan(300);

  const flow = page.locator('.flow-panel');
  await flow.scrollIntoViewIfNeeded();
  await expect(flow).toHaveAttribute('data-playing', 'true');
  await expect.poll(() => flow.evaluate((node) => Math.max(0, ...node.getAnimations({ subtree: true }).map((animation) => Number(animation.currentTime))))).toBeGreaterThan(300);
  const firstStart = await flow.evaluate((node) => node.getAnimations({ subtree: true })[0].startTime);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(flow).not.toHaveAttribute('data-animated');
  await flow.scrollIntoViewIfNeeded();
  await expect.poll(() => flow.evaluate((node) => node.getAnimations({ subtree: true })[0]?.startTime)).toBeGreaterThan(Number(firstStart));
});

test('the home retains reciprocal SEO alternatives and focused CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', 'https://1platform.pro/');
  await expect(page.locator('link[hreflang="es"]')).toHaveAttribute('href', 'https://1platform.pro/es/');
  const actions = page.locator('.hero-actions a');
  await expect(actions).toHaveCount(2);
  await expect(actions.first()).toHaveAttribute('href', 'https://app.1platform.pro/app/');
  await expect(actions.last()).toHaveAttribute('href', '#como-funciona');
});
