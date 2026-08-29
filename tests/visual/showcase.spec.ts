import { expect, test } from '@playwright/test';

/**
 * One composed viewport per editorial background and breakpoint. The home-wide
 * baseline can only freeze one sticky state; these snapshots pin all five
 * human moments together with their matching product nodes and mobile crop.
 */
const SLUGS = ['store', 'payments', 'content', 'deliveries', 'ads'] as const;

for (const [label, width, height] of [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
] as const) {
  for (const slug of SLUGS) {
    test(`showcase-${slug}-${label}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/es/#canvas-showcase-${slug}`);
      await page.evaluate(() => document.fonts.ready);

      const background = page.locator(`[data-bg="${slug}"]`);
      await expect(background).toHaveClass(/is-active/);
      await expect(background.locator('img')).toHaveJSProperty('complete', true);
      await expect(page.locator(`[data-tab="${slug}"]`)).toHaveAttribute('aria-selected', 'true');

      await expect(page).toHaveScreenshot(`showcase-${slug}-${label}.png`, {
        maxDiffPixelRatio: 0.01,
        mask: [page.locator('canvas[data-scene]')],
      });
    });
  }
}
