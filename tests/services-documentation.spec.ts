import { expect, test } from '@playwright/test';

for (const locale of ['es', 'en']) {
  test(`capability cards share one interaction and documentation remains in its section (${locale})`, async ({ page }) => {
    await page.goto(locale === 'es' ? '/es/' : '/');
    const cards = page.locator('.capability-grid button');
    await expect(cards).toHaveCount(17);
    // Declared: eight cards until expanded; once expanded all 17 share one keyboard interaction.
    await expect(cards.nth(8)).toBeHidden();
    await page.locator('[data-capabilities-more]').click();
    await expect(page.locator('.capability-grid a')).toHaveCount(0);
    for (let index = 0; index < 17; index++) {
      const button = cards.nth(index);
      const before = await button.getAttribute('aria-pressed');
      await button.focus();
      await page.keyboard.press('Space');
      await expect(button).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
      if (index < 16) {
        await page.keyboard.press('Tab');
        await expect(cards.nth(index + 1)).toBeFocused();
      }
    }
    await expect(page.locator('.capability-text em')).toHaveCount(1);
    await expect(page.locator('.developers .button')).toHaveAttribute('href', /\/docs\/saas\/1platform-api\/getting-started\/$/);
  });
}
