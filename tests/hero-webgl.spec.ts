import { expect, test } from '@playwright/test';
import { coverUv } from '../src/components/home/fan-scene';

/**
 * The WebGL upgrade (LMW-04 CA-2/CA-3, D-5): after idle the scene mounts,
 * reveals the canvas and fades the CSS layer — without moving anything (the
 * canvas sits absolutely over the layer, so the swap cannot shift layout).
 */

test('the WebGL UV crop matches CSS object-fit cover', () => {
  const portrait = coverUv(400, 900, 290, 900);
  expect(portrait.repeatX).toBeCloseTo(0.725);
  expect(portrait.repeatY).toBe(1);
  expect(portrait.offsetX).toBeCloseTo(0.1375);
  expect(portrait.offsetY).toBe(0);

  const landscape = coverUv(900, 400, 900, 290);
  expect(landscape.repeatX).toBe(1);
  expect(landscape.repeatY).toBeCloseTo(0.725);
  expect(landscape.offsetX).toBe(0);
  expect(landscape.offsetY).toBeCloseTo(0.1375);

  expect(coverUv(480, 480, 132, 132)).toEqual({
    repeatX: 1,
    repeatY: 1,
    offsetX: 0,
    offsetY: 0,
  });
  expect(coverUv(0, 480, 132, 132)).toEqual({
    repeatX: 1,
    repeatY: 1,
    offsetX: 0,
    offsetY: 0,
  });
});

test('the fan upgrades to WebGL and the CSS layer fades out', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const canvas = page.locator('canvas[data-scene="fan"]');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(canvas).toHaveAttribute('data-media-count', '14');
  await expect(page.locator('.fan--upgraded')).toHaveCount(1);

  const state = await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('canvas[data-scene="fan"]')!;
    const stage = document.querySelector('.fan__stage')!;
    const hero = document.getElementById('hero')!.getBoundingClientRect();
    return {
      width: c.width,
      height: c.height,
      stageOpacity: getComputedStyle(stage).opacity,
      heroHeight: hero.height,
    };
  });
  // The canvas fills the hero and renders at its real size, not a default.
  expect(state.width).toBeGreaterThanOrEqual(1440);
  expect(state.height).toBeGreaterThanOrEqual(state.heroHeight - 1);
  // The crossfade is a 400 ms transition; poll it to its end state.
  await expect
    .poll(
      () => page.locator('.fan__stage').evaluate((el) => parseFloat(getComputedStyle(el).opacity)),
      { timeout: 3000 },
    )
    .toBeLessThanOrEqual(0.01);

  // The viewport-height hero is not a one-shot measurement: rotating a
  // device or resizing a desktop must resize the upgraded canvas with it.
  await page.setViewportSize({ width: 1440, height: 760 });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const c = document.querySelector<HTMLCanvasElement>('canvas[data-scene="fan"]')!;
        const hero = document.getElementById('hero')!.getBoundingClientRect();
        return hero.height === 720 && c.height >= hero.height - 1;
      }),
    )
    .toBe(true);
});

test('navigating away disposes the scene (ViewTransitions re-fire page-load)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('canvas[data-scene="fan"]')).toBeVisible({ timeout: 15_000 });

  await page.locator('.site-header__actions a').first().waitFor();
  await page.goto('/about/');
  await expect(page.locator('canvas[data-scene]')).toHaveCount(0);

  // And coming back mounts a fresh one instead of a leaked context.
  await page.goto('/');
  await expect(page.locator('canvas[data-scene="fan"]')).toBeVisible({ timeout: 15_000 });
});
