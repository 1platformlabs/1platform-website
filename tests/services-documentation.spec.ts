import { expect, test } from '@playwright/test';

const destinations = [
  'pagos-en-linea', 'facturacion-electronica', 'envios', 'suscripciones', 'publicidad',
  'sitios-web-y-contenido/publicar-con-dominio', 'dominios-y-correo',
  'agentes-de-ia/integrar-en-su-aplicacion', 'telemetria/integrar-telemetria', 'plataforma/marca-blanca',
];

for (const locale of ['es', 'en']) {
  test(`ten contextual documentation links preserve illustrative controls (${locale})`, async ({ page }) => {
    await page.goto(locale === 'es' ? '/es/' : '/');
    const cards = page.locator('.capability-entry');
    await expect(cards).toHaveCount(10);
    await expect(page.locator('.capability a')).toHaveCount(0);
    for (let index = 0; index < destinations.length; index++) {
      const button = cards.nth(index).getByRole('button');
      const link = cards.nth(index).getByRole('link');
      await expect(link).toHaveAttribute('href', new RegExp(`/docs/saas/1platform-api/${destinations[index]}/$`));
      await expect(link).toHaveAccessibleName(new RegExp(locale === 'es' ? '^Ver documentación:' : '^View documentation:'));
      const before = await button.getAttribute('aria-pressed');
      await button.focus();
      await page.keyboard.press('Space');
      await expect(button).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
      await page.keyboard.press('Tab');
      await expect(link).toBeFocused();
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator('.capability-text em')).toHaveCount(3);
  });
}
