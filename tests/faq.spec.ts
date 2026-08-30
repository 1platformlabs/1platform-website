import { expect, test } from '@playwright/test';

test('the home FAQ uses semantic details and remains available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('/');

  const items = page.locator('.editorial-faq__item');
  await expect(items).toHaveCount(2);
  await items.first().locator('summary').click();
  await expect(items.first()).toHaveAttribute('open', /.*/);
  await expect(items.first().locator('p')).toBeVisible();
  await context.close();
});
