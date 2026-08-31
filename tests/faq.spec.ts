import { expect, test } from '@playwright/test';

test('the home FAQ uses semantic details and remains available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('/');

  // A FLOOR, not an inventory. What this test protects is that the FAQ is a
  // list of real `<details>` that opens with JavaScript off — how many
  // questions the home asks is an editorial decision that changes with the
  // copy, and pinning the exact count turned "we added a question merchants
  // actually ask" into a red build. Zero, or a list that stopped matching the
  // selector, still fails here.
  const items = page.locator('.product-faq__item');
  expect(await items.count()).toBeGreaterThanOrEqual(2);
  await items.first().locator('summary').click();
  await expect(items.first()).toHaveAttribute('open', /.*/);
  await expect(items.first().locator('p')).toBeVisible();
  await context.close();
});
