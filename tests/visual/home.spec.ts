import { expect, test } from '@playwright/test';

/**
 * The visual baseline: full-page screenshots of the finished home in both
 * languages and at the required desktop and mobile widths.
 *
 * Baselines are Linux renders, produced inside the Playwright container so
 * the letterforms are the same bytes every time (text shaping is the OS's):
 *
 *     npm run test:visual:update   # regenerates — look at every changed image
 *     npm run test:visual          # compares
 *
 * This spec lives outside the default `npm test` run (playwright.config.ts
 * ignores tests/visual) because a macOS render against a Linux baseline fails
 * on typography alone; the visual gate runs through the container. A stray
 * `-darwin` snapshot must never be committed — .gitignore refuses them.
 *
 * Scroll first so native lazy image loading settles before capture.
 */

for (const [name, path, width, height] of [
  ['home-en-1440', '/', 1440, 900],
  ['home-es-1440', '/es/', 1440, 900],
  ['home-en-390', '/', 390, 844],
  ['home-es-390', '/es/', 390, 844],
] as const) {
  test(name, async ({ page }) => {
    await page.setViewportSize({ width, height });
    // The static rendering is the baseline used to review layout changes.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);

    // Walk the page so every lazy image below the fold has loaded, then back.
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
}
