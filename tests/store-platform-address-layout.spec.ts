import { expect, test } from '@playwright/test';

for (const locale of ['en', 'es']) {
  for (const width of [390, 1280]) {
    test(`store address cards use the available width (${locale}, ${width})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(locale === 'es' ? '/es/soluciones/tienda-online/' : '/solutions/online-store/');
      const section = page.locator('#store-address');
      await expect(section).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const cards = section.locator('.feature-card');
      await expect(cards).toHaveCount(2);
      const grid = await section.locator('.feature-grid').boundingBox();
      const first = await cards.nth(0).boundingBox();
      const second = await cards.nth(1).boundingBox();
      expect(grid).not.toBeNull();
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(first!.width / grid!.width).toBeGreaterThan(width > 760 ? 0.48 : 0.98);
      if (width > 760) {
        expect(Math.abs(first!.y - second!.y)).toBeLessThan(1);
        const headings = await cards.locator('h3').evaluateAll(nodes => nodes.map(node => ({
          y: node.getBoundingClientRect().y,
          height: node.getBoundingClientRect().height,
          lineHeight: Number.parseFloat(getComputedStyle(node).lineHeight),
        })));
        expect(Math.abs(headings[0].y - headings[1].y)).toBeLessThan(1);
        for (const heading of headings) expect(heading.height).toBeLessThan(heading.lineHeight * 1.5);
      } else {
        expect(second!.y).toBeGreaterThan(first!.y + first!.height);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
}
