import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

/**
 * What the home actually makes the browser download in JavaScript (LMW-04
 * CA-6 as amended — see the deviation in the epic's PROGRESO).
 *
 * The budget is 200 KB gzip, not the plan's 180: three 0.185 ships split in
 * two (`three.module.min` 86.8 KB gz + `three.core.min` 101.5 KB gz), so the
 * plan's "three = 86.8" measured HALF the library and its 180 KB budget is
 * unsatisfiable with three at all. 200 = the whole library (~188) plus our
 * own ~13 KB, with no room for a second dependency — which is the point of a
 * budget.
 *
 * Measured over the network, not the dist/ tree: the three chunk loads lazily
 * after idle, and a static sum can neither see a request that never fires nor
 * miss one that does. `scripts/check-tells.sh` rule #14 keeps the static
 * floor-check for `npm run check`.
 */

const BUDGET = 204_800;

test('the JS the home loads, gzipped, stays inside the budget', async ({ page }) => {
  const sizes = new Map<string, number>();
  page.on('response', async (response) => {
    const url = response.url();
    if (!/\.m?js(\?|$)/.test(url)) return;
    try {
      sizes.set(url, gzipSync(await response.body()).byteLength);
    } catch {
      /* a cancelled response has no body; it also cost no bytes */
    }
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  // Let the idle-mounted scene fetch its chunk — the biggest one.
  await page.waitForTimeout(4000);

  const total = [...sizes.values()].reduce((a, b) => a + b, 0);

  // Floor first: a measurement that saw neither the boot script nor the three
  // chunk is not a pass, it is a broken probe.
  expect(sizes.size).toBeGreaterThanOrEqual(3);
  expect(total).toBeGreaterThan(100_000);

  expect(
    total,
    `home JS is ${total} bytes gzip over ${sizes.size} files:\n${[...sizes.entries()]
      .map(([u, s]) => `  ${s}\t${u}`)
      .join('\n')}`,
  ).toBeLessThanOrEqual(BUDGET);
});
