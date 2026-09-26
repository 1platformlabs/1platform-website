import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { repoTenants } from '../src/data/site-tenants';
import { paintsCompiledAccent } from '../src/lib/tenant-theme';
import { openTenantPage } from './helpers/tenant-browser';

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

type ScanResults = Awaited<ReturnType<typeof scan>>;

function expectNoViolations(results: ScanResults) {
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
    results.violations.map((v) => JSON.stringify(v.nodes.map((n) => ({ id: v.id, t: n.target, s: n.failureSummary })), null, 1)).join('\n'),
  ).toEqual([]);
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

test('/ with the compact menu and a FAQ row open: still zero violations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await page.locator('.product-faq__item').first().evaluate((item) => item.setAttribute('open', ''));

  const results = await scan(page);
  // Floor: the open panel was in the tree axe walked.
  const sawPanel = results.passes.some((p) => p.nodes.some((n) => n.html.includes('mobile-menu')));
  expect(sawPanel || results.violations.length > 0).toBe(true);
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
    results.violations.map((v) => JSON.stringify(v.nodes.map((n) => ({ id: v.id, t: n.target, s: n.failureSummary })), null, 1)).join('\n'),
  ).toEqual([]);
});

/**
 * The same bar for a tenant of the clinics vertical (#122).
 *
 * Everything above drives `Host: localhost`, i.e. tenant #1 in the compiled
 * palette. A clinic home is the same `platform-commerce` template with its own
 * accent, face, copy and the token-drawn `ToolsScene` in place of the platform
 * render — so a contrast or landmark regression that only a repainted tenant
 * shows (Medipago in production) never met axe. `clinicas.1platform.dev` is the
 * repo fixture of that vertical; the browser reaches it with the real `Host`
 * (see `openTenantPage`), not through a header override.
 *
 * Floor before verdict: the scanned document must BE the clinic's — a host
 * that silently fell back to tenant #1 would re-scan the platform home and
 * pass for the wrong reason.
 */
const clinic = repoTenants().find((t) => t.slug === 'clinicas')!;

test('the clinics fixture is still the vertical this scan stands for', () => {
  expect(clinic.home_template).toBe('platform-commerce');
  // A repainted accent: the case tenant #1's scans can never reach.
  expect(paintsCompiledAccent(clinic)).toBe(false);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`clinic tenant /: zero violations at ${viewport.width}px`, async () => {
    const { browser, page } = await openTenantPage(clinic.domain, '/');
    try {
      await page.setViewportSize(viewport);
      // Floor: this is the clinic's home, with its own section art.
      await expect(page.locator('.tools-scene')).toHaveCount(1);
      await expect(page.locator('img[src*="platform-modules"]')).toHaveCount(0);
      const results = await scan(page);
      expect(results.passes.length).toBeGreaterThan(10);
      expectNoViolations(results);
    } finally {
      await browser.close();
    }
  });
}

// A one-page tenant publishes no other route, so its header carries no menu
// (#119) — the open state left to cover at the compact width is the FAQ.
test('clinic tenant / at 390px with a FAQ row open: still zero violations', async () => {
  const { browser, page } = await openTenantPage(clinic.domain, '/');
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#menu-toggle')).toHaveCount(0);
    const row = page.locator('.product-faq__item').first();
    await expect(row).toHaveCount(1);
    await row.evaluate((item) => item.setAttribute('open', ''));
    const results = await scan(page);
    // Floor: the opened row was in the tree axe walked.
    const sawFaq = results.passes.some((p) => p.nodes.some((n) => `${n.target.join(' ')} ${n.html}`.includes('product-faq')));
    expect(sawFaq || results.violations.length > 0).toBe(true);
    expectNoViolations(results);
  } finally {
    await browser.close();
  }
});
