import { expect, test } from '@playwright/test';

// Repo-mode copies are deliberate here: this gate reviews the proposed page
// composition without reading or changing SitePages in QA/PROD. The release
// runbook still gates the API-mode publication on its content patch.
const routes = [
  { name: 'payments-en', path: '/payments-invoicing/', locale: 'en', payments: true },
  { name: 'payments-es', path: '/es/pagos-y-facturacion/', locale: 'es', payments: true },
  { name: 'solutions-en', path: '/solutions/', locale: 'en', payments: false },
  { name: 'solutions-es', path: '/es/soluciones/', locale: 'es', payments: false },
] as const;

for (const route of routes) {
  for (const width of [1440, 390]) {
    test(`${route.name}-${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const response = await page.goto(route.path, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', route.locale);
      await page.evaluate(() => document.fonts.ready);

      if (route.payments) {
        await expect(page.locator('.remote__status')).toHaveText(
          route.locale === 'es' ? 'En preparación' : 'In preparation',
        );
        await expect(page.locator('.remote__warning')).toHaveText(
          route.locale === 'es'
            ? 'Un cobro sin respuesta todavía puede aprobarse. Revisa antes de volver a cobrar.'
            : 'A charge with no answer yet can still be approved. Check before charging again.',
        );
        await expect(page.locator('.remote__link')).toHaveAttribute(
          'href',
          /\/docs\/saas\/1platform-api\/terminal-de-tarjetas\/cobros-remotos$/,
        );
      } else {
        await expect(page.locator('.catalog__desc').filter({
          hasText: route.locale === 'es'
            ? 'Cobrar en ella desde tu sistema está en preparación.'
            : 'Charging on it from your system is in preparation.',
        })).toHaveCount(1);
      }

      // Materialize lazy images before the full-page render. No animation or
      // screenshot masks can hide missing content or a horizontal overflow.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
        window.scrollTo(0, 0);
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await expect(page).toHaveScreenshot(`${route.name}-${width}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
}
