import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

const budget = 65_536;

test('the public home keeps its JavaScript under the editorial budget', async ({ page }) => {
  const sizes = new Map<string, number>();
  page.on('response', async (response) => {
    if (!/\.m?js(\?|$)/.test(response.url())) return;
    try {
      sizes.set(response.url(), gzipSync(await response.body()).byteLength);
    } catch {
      // Cancelled responses do not contribute transfer bytes.
    }
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const total = [...sizes.values()].reduce((sum, size) => sum + size, 0);

  expect(sizes.size).toBeGreaterThanOrEqual(1);
  expect(total).toBeGreaterThan(1_000);
  expect(total).toBeLessThanOrEqual(budget);
  await expect(page.locator('canvas')).toHaveCount(0);
});
