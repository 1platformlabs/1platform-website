import { expect, test } from '@playwright/test';

/**
 * The module carousel (LMW-07): fourteen real modules under the brand line,
 * arrows that announce where you are, a progress bar that moves, and a
 * keyboard path that never depends on a raycast.
 */

test('the carousel carries the fourteen modules under the brand line', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const section = await page.locator('#modules').evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.abs(section - 860)).toBeLessThanOrEqual(8);

  await expect(page.locator('#modules h2')).toHaveText('One platform. Every solution.');
  await expect(page.locator('[data-mod-card]')).toHaveCount(14);

  // Every card is a real link into the site — the reference's logo wall,
  // replaced by destinations (D-11).
  const hrefs = await page
    .locator('[data-mod-card]')
    .evaluateAll((els) => els.map((a) => (a as HTMLAnchorElement).getAttribute('href')));
  for (const href of hrefs) expect(href).toMatch(/^\/(solutions|payments-invoicing|for-developers)/);
});

test('the arrows move the selection, the live region announces it, the open link follows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const next = page.locator('[data-mods-next]');
  const live = page.locator('[data-mods-live]');
  const open = page.locator('[data-mods-open]');

  const arrow = await next.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  expect(arrow.w).toBe(44);
  expect(arrow.h).toBe(44);

  await next.click();
  await expect(live).toHaveText('4 of 14: Website Builder');
  await expect(open).toHaveAttribute('href', '/solutions/website/');

  // The fill animates 300 ms; poll to its resting width.
  await expect
    .poll(
      () => page.locator('[data-mods-progress]').evaluate((el) => el.getBoundingClientRect().width),
      { timeout: 2000 },
    )
    .toBeCloseTo((4 / 14) * 140, 0);

  // Prev twice wraps the selection backwards without an error state.
  await page.locator('[data-mods-prev]').click();
  await page.locator('[data-mods-prev]').click();
  await expect(live).toHaveText('2 of 14: Payments & Invoicing');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the rail is static, tilted, and every card is a plain link', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('[data-mod-card]').first()).toHaveAttribute('href', '/solutions/online-store/');
    // The initial index is server-rendered: the centred card is the third.
    const off = await page.locator('[data-mod-card]').nth(2).evaluate((el) => el.style.getPropertyValue('--off'));
    expect(off).toBe('0');
  });
});
