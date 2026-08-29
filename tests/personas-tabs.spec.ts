import { expect, test } from '@playwright/test';

/**
 * The persona stack (LMW-06): the segmented control re-deals the fan of
 * audience cards, the satellites follow the front card, and the whole thing
 * unrolls into a plain column when no script can deal it.
 */

test('the control brings an audience to the front and its satellites with it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const front = () => page.locator('[data-persona-card][data-pos="0"]');
  await expect(front()).toHaveAttribute('data-persona-card', 'small-business');

  // Cards behind the front are stacked paper: out of the accessibility tree.
  await expect(page.locator('[data-persona-card][aria-hidden="true"]')).toHaveCount(4);
  await expect(page.locator('[data-persona-sat="small-business"]:visible')).toHaveCount(4);

  await page.locator('[data-seg-tab="agencies"]').click();
  await expect(front()).toHaveAttribute('data-persona-card', 'agencies');
  await expect(page.locator('[data-seg-tab="agencies"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-persona-sat="agencies"]:visible')).toHaveCount(4);
  await expect(page.locator('[data-persona-sat="small-business"]:visible')).toHaveCount(0);

  // Arrow keys move the selection from the tablist.
  await page.locator('[data-seg-tab="agencies"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(front()).toHaveAttribute('data-persona-card', 'developers');
});

test('the front card measures as the reference and links to its destination', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const section = await page.locator('#personas').evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.abs(section - 933)).toBeLessThanOrEqual(8);

  const card = await page.locator('[data-persona-card][data-pos="0"]').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, center: r.x + r.width / 2, padding: getComputedStyle(el).padding };
  });
  expect(card.width).toBe(400);
  expect(Math.abs(card.center - 720)).toBeLessThanOrEqual(2);
  expect(card.padding).toBe('12px 12px 16px');

  await expect(page.locator('[data-persona-card="small-business"] .pcard__title a')).toHaveAttribute(
    'href',
    '/solutions/online-store/',
  );
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every audience is visible in a column and the control is anchors', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.locator('[data-persona-card]:visible')).toHaveCount(5);
    await expect(page.locator('[data-persona-card][aria-hidden="true"]')).toHaveCount(0);
    await expect(page.locator('[data-seg-tab="developers"]')).toHaveAttribute(
      'href',
      '#persona-developers',
    );
  });
});
