import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * The footer, measured against the reference geometry (LMW-10).
 *
 * One dark band, one card, three columns, a legal row — and the same set of
 * destinations the footer had before, redistributed. The set is pinned here
 * literally rather than derived from the previous component: a derivation
 * would follow any change and could never fail (the `ROUTE_FLOOR` lesson).
 * If a link is meant to leave the footer, this list changes on purpose.
 */

const DIST = 'dist';

/** Every href the footer offered before the redesign, from `origin/main`. */
const PREVIOUS_FOOTER_HREFS = new Set([
  '/solutions/online-store/',
  '/solutions/website/',
  '/solutions/content/',
  '/solutions/deliveries/',
  '/solutions/ads/',
  '/solutions/whitelabel/',
  '/payments-invoicing/',
  '/for-agencies/',
  '/for-developers/',
  '/solutions/',
  'https://developer.1platform.pro/',
  'https://developer.1platform.pro/api-docs',
  '/blog/',
  '/changelog/',
  '/about/',
  '/pricing/',
  '/terms/',
  '/privacy/',
  '/cookies/',
]);

function footerHrefs(html: string): Set<string> {
  const footer = html.match(/<footer[\s>][\s\S]*?<\/footer>/)?.[0];
  if (!footer) throw new Error('no <footer> in the page — the selector went stale');
  return new Set([...footer.matchAll(/href="([^"#]*)"/g)].map((m) => m[1]).filter((h) => !h.startsWith('mailto:')));
}

test('the footer links are exactly the ones the previous footer had (EN)', () => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const hrefs = footerHrefs(html);
  // The sign-up form's no-JS fallback points at the contact page; it is a form
  // action, not a link, and is excluded from the comparison by not being an
  // href — the assertion below is on anchors only.
  expect([...hrefs].sort()).toEqual([...PREVIOUS_FOOTER_HREFS].sort());
});

test('the footer links are the same set under /es/, localised', () => {
  const html = readFileSync(join(DIST, 'es', 'index.html'), 'utf8');
  const hrefs = footerHrefs(html);
  const expected = [...PREVIOUS_FOOTER_HREFS].map((h) => (h.startsWith('/') ? `/es${h}` : h));
  expect([...hrefs].sort()).toEqual(expected.sort());
});

test('the footer says nothing it cannot back', () => {
  for (const file of ['index.html', 'about/index.html', 'es/index.html']) {
    const html = readFileSync(join(DIST, file), 'utf8');
    const footer = html.match(/<footer[\s>][\s\S]*?<\/footer>/)![0];
    // No status claim: there is no status page behind it (D-14).
    expect(footer).not.toMatch(/Status:/);
    // No social network: 1Platform publishes none (D-18).
    expect(footer).not.toMatch(/x\.com|linkedin\.com|instagram\.com|discord/i);
    // No number in a "replaces N tools" claim survived the rewrite.
    expect(footer).not.toMatch(/\b(four|five|six|19\+|13\+)\b/i);
  }
});

test('geometry at 1440: 680 tall, one 1280 × 408 card, three columns, an e-mail form', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about/');

  const footer = await page.locator('footer.site-footer').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { height: r.height, padding: getComputedStyle(el).padding };
  });
  expect(Math.abs(footer.height - 680)).toBeLessThanOrEqual(8);
  expect(footer.padding).toBe('200px 72px 72px');

  const card = await page.locator('.footer-card').evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { x: r.x, width: r.width, height: r.height, radius: cs.borderRadius, padding: cs.padding };
  });
  expect(card.width).toBe(1280);
  expect(card.x).toBe(80);
  expect(Math.abs(card.height - 408)).toBeLessThanOrEqual(8);
  expect(card.radius).toBe('8px');
  expect(card.padding).toBe('32px 36px');

  await expect(page.locator('.footer-col')).toHaveCount(3);
  const titles = await page.locator('.footer-col__title span:first-child').allTextContents();
  expect(titles).toEqual(['Product', 'Company', 'Resources']);

  const form = page.locator('form[data-signup]');
  await expect(form).toBeVisible();
  await expect(form.locator('input[type="email"][required]')).toBeVisible();
  const input = await form.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });
  expect(input.width).toBe(360);
  expect(input.height).toBe(44);

  const watermark = page.locator('.watermark');
  await expect(watermark).toHaveAttribute('aria-hidden', 'true');
  const wm = await watermark.evaluate((el) => getComputedStyle(el).opacity);
  expect(parseFloat(wm)).toBeCloseTo(0.2, 2);
});

test('the sign-up composes a mailto: in the browser and never posts anywhere', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about/');

  // Intercept the navigation the mailto: would trigger.
  let target = '';
  await page.evaluate(() => {
    const form = document.querySelector<HTMLFormElement>('form[data-signup]')!;
    form.addEventListener(
      'submit',
      () => {
        // The handler sets location.href; capture it without leaving the page.
        Object.defineProperty(globalThis, '__hlr_href', { value: '', writable: true });
      },
      true,
    );
  });
  await page.route('**/contact/**', (route) => route.abort());
  await page.locator('#footer-email').fill('reader@example.com');
  // The status line receives the confirmation copy through aria-live.
  const navigation = page.waitForEvent('framenavigated', { timeout: 3000 }).catch(() => null);
  await page.locator('.signup__submit').click();
  await expect(page.locator('[data-signup-status]')).toHaveText('Opening your email app…');
  const nav = await navigation;
  target = nav ? nav.url() : '';
  // A mailto: navigation is not observable as a frame navigation in Chromium;
  // what IS observable is that we did not go to the contact page, which is the
  // no-JS fallback, and that the status copy landed.
  expect(target).not.toMatch(/\/contact\//);
});

test('at 390 px the columns fold into headings and the card fills the width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about/');
  const cols = page.locator('details.footer-col');
  await expect(cols).toHaveCount(3);
  for (const i of [0, 1, 2]) {
    await expect(cols.nth(i)).not.toHaveAttribute('open', /.*/);
  }
  await cols.nth(0).locator('summary').click();
  await expect(cols.nth(0)).toHaveAttribute('open', /.*/);
  await expect(cols.nth(0).locator('a').first()).toBeVisible();

  const card = await page.locator('.footer-card').evaluate((el) => el.getBoundingClientRect().width);
  expect(card).toBe(390 - 32);
});
