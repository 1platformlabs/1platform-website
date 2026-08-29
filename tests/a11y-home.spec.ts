import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * axe over the finished home (LMW-12 CA-4): both languages, the menu closed
 * AND open, a FAQ row open — `color-contrast` fully on, no rule disabled.
 * The tag scope is the WCAG A/AA set: that is the bar the repo mandates
 * (Accessibility 100), and it includes every rule this epic could break.
 *
 * Floor before verdict: axe must have SEEN the surfaces under test — a scan
 * that never met the menu panel would report zero violations about it
 * (the portalled-dialog lesson).
 */

async function scan(page: Page) {
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
}

for (const path of ['/', '/es/']) {
  test(`${path}: zero violations with the page at rest`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    const results = await scan(page);
    // Floor: the scan saw the whole page, not a fragment.
    expect(results.passes.length).toBeGreaterThan(10);
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
      results.violations.map((v) => JSON.stringify(v, null, 1)).join('\n'),
    ).toEqual([]);
  });
}

test('/ with the menu open and a FAQ row open: still zero violations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await page.locator('.faq__item summary').first().click();

  const results = await scan(page);
  // Floor: the open panel was in the tree axe walked.
  const sawPanel = results.passes.some((p) => p.nodes.some((n) => n.html.includes('mobile-menu')));
  expect(sawPanel || results.violations.length > 0).toBe(true);
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
    results.violations.map((v) => JSON.stringify(v.nodes.map((n) => ({ id: v.id, t: n.target, s: n.failureSummary })), null, 1)).join('\n'),
  ).toEqual([]);
});
