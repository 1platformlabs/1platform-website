import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * The FAQ (LMW-09, D-13): eight native rows, one open at a time, and a
 * FAQPage JSON-LD that carries the SAME eight — semantic data, no rich-result
 * promise.
 */

test('eight rows, 61 px closed, exclusive opening, no JavaScript needed', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('/');

  const items = page.locator('.faq__item');
  await expect(items).toHaveCount(8);

  const section = await page.locator('#faq').evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.abs(section - 821)).toBeLessThanOrEqual(12);

  const inner = await page.locator('.faq__inner').evaluate((el) => el.getBoundingClientRect().width);
  expect(inner).toBe(896);

  const row = await items.first().locator('summary').evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.abs(row - 61)).toBeLessThanOrEqual(2);

  // `name="faq"`: opening the second closes the first — the browser's own
  // exclusivity, no script anywhere.
  await items.nth(0).locator('summary').click();
  await expect(items.nth(0)).toHaveAttribute('open', /.*/);
  await items.nth(1).locator('summary').click();
  await expect(items.nth(1)).toHaveAttribute('open', /.*/);
  await expect(items.nth(0)).not.toHaveAttribute('open', /.*/);
  await context.close();
});

test('the JSON-LD FAQPage carries the same eight questions the accordion renders', () => {
  for (const file of ['index.html', join('es', 'index.html')]) {
    const html = readFileSync(join('dist', file), 'utf8');
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    const payloads = blocks.map((m) => JSON.parse(m[1]));
    const faq = payloads.flat().find((p) => p['@type'] === 'FAQPage');
    expect(faq, `no FAQPage JSON-LD in ${file}`).toBeTruthy();
    expect(faq.mainEntity).toHaveLength(8);

    const rendered = [...html.matchAll(/<summary[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/g)].map((m) =>
      m[1].trim(),
    );
    const declared = faq.mainEntity.map((q: { name: string }) => q.name);
    for (const q of declared) expect(rendered).toContain(q);
  }
});
