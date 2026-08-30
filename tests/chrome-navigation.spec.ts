import { expect, test } from '@playwright/test';

test('the desktop rail exposes the primary navigation and solution destinations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const rail = page.locator('.site-header__rail');
  await expect(rail).toBeVisible();
  await expect(rail.locator('.site-header__logo')).toBeVisible();
  await expect(rail.locator('.site-header__cta')).toHaveAttribute('href', 'https://app.1platform.pro/app/');

  const solutions = page.locator('.site-header__solutions');
  await solutions.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(solutions).toHaveAttribute('open', /.*/);
  await expect(solutions.locator('.solutions-menu a')).toHaveCount(8);
  await expect(solutions.locator('.solutions-menu a').first()).toHaveAttribute('href', '/solutions/online-store/');
});

test('the compact menu is fully keyboard-operable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const toggle = page.locator('#menu-toggle');
  const menu = page.locator('#mobile-menu');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
  await expect(menu.locator('.mobile-menu__sublist a')).toHaveCount(8);
  await expect(menu.locator('.btn--primary')).toHaveAttribute('href', 'https://app.1platform.pro/app/');

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('reduced motion keeps the editorial home static and WebGL-free', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  expect(await page.locator('canvas').count()).toBe(0);
  const state = await page.locator('.editorial-hero__visual').evaluate((node) => ({
    transform: getComputedStyle(node).transform,
    transitionDuration: getComputedStyle(node).transitionDuration,
  }));
  expect(state.transform).toBe('none');
  expect(state.transitionDuration).toBe('0s');
});

test('the home retains reciprocal SEO alternatives and focused CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', 'https://1platform.pro/');
  await expect(page.locator('link[hreflang="es"]')).toHaveAttribute('href', 'https://1platform.pro/es/');
  await expect(page.locator('.editorial-hero__actions a').first()).toHaveAttribute('href', 'https://app.1platform.pro/app/');
  await expect(page.locator('.editorial-hero__actions a').nth(1)).toHaveAttribute('href', 'https://developer.1platform.pro/');
});
