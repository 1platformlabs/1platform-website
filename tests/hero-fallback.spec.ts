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

  for (const { width, height } of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    test(`the editorial hero reflows cleanly at ${width} × ${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);

      const layout = await page.evaluate(() => {
        const hero = document.getElementById('hero')!.getBoundingClientRect();
        const headline = document.querySelector('.hero-ref__headline')!;
        const headlineRect = headline.getBoundingClientRect();
        const foot = document.querySelector('.hero-ref__foot')!.getBoundingClientRect();
        const lineHeight = Number.parseFloat(getComputedStyle(headline).lineHeight);
        return {
          heroHeight: hero.height,
          lineCount: Math.round(headlineRect.height / lineHeight),
          headlineBottom: headlineRect.bottom,
          footTop: foot.top,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });

      expect(layout.heroHeight).toBe(Math.max(height - 40, 720));
      expect(layout.lineCount).toBe(width <= 768 ? 3 : 2);
      expect(layout.headlineBottom).toBeLessThan(layout.footTop);
      expect(layout.scrollWidth).toBe(layout.clientWidth);
      await expect(page.locator('#hero h1')).toHaveAccessibleName('One Platform. Every Solution.');

      const input = page.locator('#hero-search-input');
      await input.focus();
      await expect(input).toBeFocused();
    });
  }
});
