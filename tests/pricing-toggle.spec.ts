import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Pricing with the reference's geometry and none of its figures (LMW-08,
 * D-12): a CSS-only two-state switch, three 387 × 794 cards per state, the
 * 1200 × 274 enterprise card — and not one dollar sign or percentage in the
 * whole section, which is the model this company publishes.
 */

test('metered is the default — no JavaScript involved — and the toggle swaps the cards', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.locator('.price-card--metered:visible')).toHaveCount(3);
  await expect(page.locator('.price-card--quoted:visible')).toHaveCount(0);

  await page.locator('label[for="pricing-quoted"]').click();
  await expect(page.locator('.price-card--quoted:visible')).toHaveCount(3);
  await expect(page.locator('.price-card--metered:visible')).toHaveCount(0);
  await context.close();
});

test('geometry at 1440: 1 428 tall, three 387 × 794 cards, the 1200 × 274 enterprise card', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const section = await page.locator('#pricing').evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.abs(section - 1428)).toBeLessThanOrEqual(8);

  const card = await page.locator('.price-card--metered').first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  expect(Math.abs(card.w - 387)).toBeLessThanOrEqual(2);
  expect(card.h).toBe(794);

  const ent = await page.locator('.ent').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  expect(ent.w).toBe(1200);
  expect(ent.h).toBe(274);

  // The lead card carries the luminous orange edge (CA-5).
  const lead = await page.locator('.price-card--lead').evaluate((el) => getComputedStyle(el).borderColor);
  expect(lead).toBe('rgb(240, 78, 35)');
});

test('not one figure anywhere in the section, in either language', () => {
  for (const file of ['index.html', join('es', 'index.html')]) {
    const html = readFileSync(join('dist', file), 'utf8');
    const section = html.match(/<section id="pricing"[\s\S]*?<\/section>/)?.[0];
    expect(section, `no #pricing section in ${file}`).toBeTruthy();
    const text = section!
      .replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/g, '')
      .replace(/<[^>]+>/g, ' ');
    expect(text).not.toMatch(/\$\s?\d/);
    expect(text).not.toMatch(/\d\s?%/);
    // "per month", "monthly fee" may appear only as the claim of ABSENCE.
    expect(text).not.toMatch(/\d+\s*(credits|créditos)/i);
  }
});
