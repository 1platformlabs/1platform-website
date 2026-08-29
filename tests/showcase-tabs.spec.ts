import { expect, test } from '@playwright/test';

/**
 * The showcase's pill follows the scroll and drives it (LMW-05 CA-4): the
 * panel on screen selects its tab, a tab click travels to its panel, and the
 * arrows move the selection. Anchors underneath, so nothing needs JS to reach
 * a panel.
 */

test('scrolling to a panel activates its tab, its entry row and its background', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#canvas-showcase-content');
  await page.waitForTimeout(600);

  const tab = page.locator('[data-tab="content"]');
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-entry="content"]')).toBeVisible();
  await expect(page.locator('[data-bg="content"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-bg="store"]')).not.toHaveClass(/is-active/);
});

test('a tab click travels to its panel', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#canvas-showcase-store');
  await page.waitForTimeout(400);

  await page.locator('[data-tab="ads"]').click();
  await expect(page.locator('[data-tab="ads"]')).toHaveAttribute('aria-selected', 'true');
  await expect
    .poll(async () => {
      const box = await page.locator('#canvas-showcase-ads').boundingBox();
      return box ? Math.abs(box.y) < 450 : false;
    }, { timeout: 5000 })
    .toBe(true);
});

test('the arrows move the selection and focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#canvas-showcase-store');
  await page.waitForTimeout(400);

  await page.locator('[data-tab="store"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-tab="payments"]')).toBeFocused();
  await expect(page.locator('[data-tab="payments"]')).toHaveAttribute('aria-selected', 'true');
});

test('without JavaScript the tabs are anchors and every panel is on the page', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.locator('[data-showcase-panel]')).toHaveCount(5);
  await expect(page.locator('[data-tab="deliveries"]')).toHaveAttribute(
    'href',
    '#canvas-showcase-deliveries',
  );
  // The first background is server-rendered active so the section is never black.
  await expect(page.locator('[data-bg="store"]')).toHaveClass(/is-active/);
  await context.close();
});
