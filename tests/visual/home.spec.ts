import { expect, test } from '@playwright/test';

/**
 * The visual baseline (LMW-12 CA-5): full-page screenshots of the finished
 * home in both languages and both widths, COMPARED — never regenerated — on
 * every run (`maxDiffPixelRatio: 0.01`).
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
 * Scroll first, settle after: the page mounts scenes lazily and full-page
 * capture needs the whole tree painted. The WebGL canvases are masked — a GPU
 * render is not byte-stable across drivers; the CSS layers under them are
 * what the baseline pins.
 */

for (const [name, path, width, height] of [
  ['home-en-1440', '/', 1440, 900],
  ['home-es-1440', '/es/', 1440, 900],
  ['home-en-390', '/', 390, 844],
  ['home-es-390', '/es/', 390, 844],
] as const) {
  test(name, async ({ page }) => {
    await page.setViewportSize({ width, height });
    // Reduced motion: reveals settle instantly and the scenes never mount, so
    // the capture pins the CSS layers — the deterministic ones.
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
      mask: [page.locator('canvas[data-scene]')],
    });
  });
}
