import { expect, test, type Page } from '@playwright/test';

/**
 * The header, measured against the reference geometry (LMW-03).
 *
 * Two controls and nothing else on the bar: a 230 × 42 pill on the left with
 * the logo and the menu button, and two calls to action on the right. The
 * navigation lives in the panel the button opens — at every width — and the
 * panel still carries every destination the site had, so nothing became
 * unreachable when it stopped being visible.
 *
 * The CTAs are asserted at 44 px, not the reference's 40: the target-size
 * floor is a MUST of this repo and wins over parity (D-6). "Sign In" is the
 * same string as the reference, so its width is comparable; the second label
 * is this site's ("Get Started Free"), so only its height is.
 */

const PAGES = ['/', '/about/', '/es/pricing/'];

const rect = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      x: r.x, y: r.y, width: r.width, height: r.height,
      position: cs.position, radius: cs.borderRadius, fontSize: cs.fontSize,
      background: cs.backgroundColor,
    };
  });

for (const path of PAGES) {
  test(`${path}: the bar is fixed, 74 px, and carries only the pill and two CTAs`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);

    const header = await rect(page, 'header.site-header');
    expect(header.position).toBe('fixed');
    expect(header.height).toBe(74);
    expect(header.y).toBe(40);

    const pill = await rect(page, '.brand-pill');
    expect(pill.width).toBe(230);
    expect(pill.height).toBe(42);
    expect(pill.radius).toBe('6px');
    expect(pill.x).toBe(16);

    // No visible navigation link anywhere outside the pill and the actions.
    const strayLinks = await page
      .locator('header.site-header a:visible')
      .evaluateAll((els) =>
        els.filter((a) => !a.closest('.brand-pill') && !a.closest('.site-header__actions')).length,
      );
    expect(strayLinks).toBe(0);

    const ctas = page.locator('.site-header__actions a');
    await expect(ctas).toHaveCount(2);
    for (const i of [0, 1]) {
      const cta = await ctas.nth(i).evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { height: r.height, width: r.width, radius: cs.borderRadius, fontSize: cs.fontSize };
      });
      expect(cta.height).toBe(44);
      expect(cta.radius).toBe('6px');
      expect(cta.fontSize).toBe('12.8px');
    }
    // "Sign In" is the reference's own label, so its width is comparable in
    // English; the Spanish label is longer and only its height is asserted.
    if (!path.startsWith('/es/')) {
      const signIn = await rect(page, '.site-header__signin');
      expect(Math.abs(signIn.width - 66)).toBeLessThanOrEqual(8);
    }
  });
}

test('the menu button opens the panel by keyboard, the panel holds the whole navigation, Escape closes it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const toggle = page.locator('#menu-toggle');
  const panel = page.locator('#mobile-menu');
  await expect(panel).toBeHidden();

  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();

  // Five items, in order, then the seven solution destinations, then the CTA
  // and the language control.
  const topLevel = await panel.locator('nav > ul > li > a.nav-link').allTextContents();
  expect(topLevel.map((s) => s.trim())).toEqual(['Solutions', 'Features', 'Pricing', 'Docs', 'Blog']);

  const destinations = await panel
    .locator('.mobile-menu__sublist a')
    .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')));
  for (const d of [
    '/solutions/online-store/',
    '/solutions/website/',
    '/solutions/content/',
    '/solutions/deliveries/',
    '/solutions/ads/',
    '/solutions/whitelabel/',
    '/payments-invoicing/',
  ]) {
    expect(destinations).toContain(d);
  }
  await expect(panel.locator('.lang')).toBeVisible();
  await expect(panel.locator('.ref-btn--full')).toBeVisible();

  // Focus moved into the panel; Escape closes and returns it to the button.
  const focusedInside = await page.evaluate(() => !!document.activeElement?.closest('#mobile-menu'));
  expect(focusedInside).toBe(true);
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('at 390 px the pill shrinks to logo + button and only the primary CTA stays', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const pill = await rect(page, '.brand-pill');
  expect(pill.height).toBe(42);
  expect(pill.width).toBeLessThan(230);
  await expect(page.locator('.site-header__signin')).toBeHidden();
  await expect(page.locator('.site-header__actions a:visible')).toHaveCount(1);

  // The menu still opens on a phone and still lists everything.
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#mobile-menu')).toBeVisible();
  // Seven destinations plus the "view all" catch-all.
  await expect(page.locator('#mobile-menu .mobile-menu__sublist a')).toHaveCount(8);
});

test('without JavaScript the navigation is still reachable: the panel renders open under the pill', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await expect(page.locator('#mobile-menu .mobile-menu__sublist a')).toHaveCount(8);
  await expect(page.locator('#mobile-menu .lang')).toBeVisible();
  await context.close();
});

test('the menu button meets the 44 px target floor on both axes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  // The drawn box is 40 × 40 (reference); the hit area is extended by a
  // pseudo-element to 44 × 44. Probing the pseudo-element's box is the only
  // way to see the target, not the paint.
  const target = await page.locator('#menu-toggle').evaluate((el) => {
    const r = el.getBoundingClientRect();
    const after = getComputedStyle(el, '::after');
    const inset = parseFloat(after.inset || after.top || '0');
    return { drawn: r.width, target: r.width - inset * 2 };
  });
  expect(target.drawn).toBe(40);
  expect(target.target).toBeGreaterThanOrEqual(44);
});
