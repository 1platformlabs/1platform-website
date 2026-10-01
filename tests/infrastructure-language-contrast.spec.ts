import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// These existing pages keep a light first surface when they adopt the shared
// chrome. The approved infrastructure/photographic heroes remain dark.
for (const width of [360, 1440]) {
  for (const route of ['/pricing/', '/about/', '/terms/', '/language-contrast-not-found/']) {
    test(`language controls retain contrast on ${route} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(route);
      const missing = route === '/language-contrast-not-found/';
      expect(response?.status()).toBe(missing ? 404 : 200);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('.infrastructure-home, .photographic-interior')).toHaveCount(0);

      const languages = page.locator('.brand-languages');
      await expect(languages).toBeVisible();
      await expect(languages).toHaveCSS('color', 'rgb(13, 28, 58)');
      await expect(languages.locator('.lang')).toHaveCSS('border-top-color', 'rgb(92, 105, 123)');
      await expect(languages.locator('.lang')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      const current = languages.locator('.lang__item--current');
      await expect(current).toContainText('EN');
      await expect(current).toHaveCSS('color', 'rgb(255, 255, 255)');
      await expect(current).toHaveCSS('background-color', 'rgb(13, 28, 58)');

      const alternate = languages.locator('[data-lang-choice="es"]');
      if (missing) {
        await expect(alternate).toHaveCount(0);
        await expect(languages.locator('.lang__item--off')).toHaveAttribute('aria-disabled', 'true');
      } else {
        await expect(alternate).toHaveCSS('color', 'rgb(13, 28, 58)');
        await page.keyboard.press('Tab');
        await alternate.focus();
        await expect(alternate).toBeFocused();
        await expect(alternate).toHaveCSS('outline-style', 'solid');
        await expect(alternate).toHaveCSS('outline-width', '3px');
        await expect(alternate).toHaveCSS('outline-color', 'rgb(40, 84, 167)');
      }

      const accessibility = await new AxeBuilder({ page })
        .include('.brand-languages')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(accessibility.violations).toEqual([]);
    });
  }
}
