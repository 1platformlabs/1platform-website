import { expect, test } from '@playwright/test';

/**
 * The hero's CSS 3D layer IS the page (LMW-04 CA-3): reduced motion, no
 * WebGL, no JS and slow connections all keep it. Eleven planes, fourteen
 * pieces of media (D-19: a flat strip of four plus five rotated pairs).
 */

test.describe('with reduced motion', () => {
  test('the fan stays CSS: no scene mounts, eleven planes and fourteen media are visible', async ({
    page,
  }) => {
    // `page.emulateMedia`, not `test.use({ reducedMotion })`: probed on this
    // runner, the context option left `prefers-reduced-motion` at
    // no-preference and the scene mounted — the explicit call is the one that
    // demonstrably applies before the boot script reads the media query.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    // Give the boot path the time it would have used: nothing may happen.
    await page.waitForTimeout(1500);

    await expect(page.locator('.fan--upgraded')).toHaveCount(0);
    await expect(page.locator('canvas[data-scene="fan"]')).toBeHidden();

    await expect(page.locator('[data-plane]')).toHaveCount(11);
    const media = await page
      .locator('[data-plane] img, [data-plane] svg[data-placeholder]')
      .count();
    expect(media).toBe(14);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the fan and the search pill are all there', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('[data-plane]')).toHaveCount(11);
    // The form's no-JS fallback is a GET to the solutions catalogue.
    await expect(page.locator('[data-solution-search]')).toHaveAttribute('action', '/solutions/');
  });
});
