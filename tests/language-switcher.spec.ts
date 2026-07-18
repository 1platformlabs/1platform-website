import { expect, test } from '@playwright/test';

/**
 * The language control.
 *
 * It is what makes the automatic choice a default rather than a cage, so the
 * properties that matter are: it keeps you on the page you were reading, it
 * remembers, and it never offers a language that does not exist.
 */

test('switching to English keeps the page and sets the cookie', async ({ context, page }) => {
  await page.goto('/es/pricing/');

  await page.locator('a[data-lang-choice="en"]').first().click();
  await expect(page).toHaveURL(/\/pricing\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  const cookie = (await context.cookies()).find((c) => c.name === '1p_lang');
  expect(cookie?.value).toBe('en');
});

test('switching to Spanish keeps the page', async ({ page }) => {
  await page.goto('/pricing/');
  await page.locator('a[data-lang-choice="es"]').first().click();
  await expect(page).toHaveURL(/\/es\/pricing\/$/);
});

test('a blog post switches to its own translation, not the index', async ({ page }) => {
  await page.goto('/blog/getting-started-5-minutes/');
  await page.locator('a[data-lang-choice="es"]').first().click();
  await expect(page).toHaveURL(/\/es\/blog\/getting-started-5-minutes\/$/);
});

test('the cookie is written before the client router swaps the document', async ({
  context,
  page,
}) => {
  // The site mounts Astro's client router, so this click exchanges the document
  // rather than reloading. If the cookie were written after the swap it would
  // be lost, and the automatic redirect would undo the user's choice on their
  // next visit — which would make the control useless.
  await page.goto('/es/');
  await page.locator('a[data-lang-choice="en"]').first().click();
  await expect(page).toHaveURL(/localhost:4321\/$/);

  const cookie = (await context.cookies()).find((c) => c.name === '1p_lang');
  expect(cookie?.value).toBe('en');

  // And it must survive: going back to an unprefixed URL now stays English
  // even though this context's browser locale is the default en-US anyway —
  // what is asserted here is that the choice persisted at all.
  expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000 + 60 * 60 * 24 * 150);
});

test('the choice survives a new page load', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'es-MX' });
  const page = await context.newPage();

  await page.goto('/es/');
  await page.locator('a[data-lang-choice="en"]').first().click();
  await expect(page).toHaveURL(/localhost:4321\/$/);

  // Fresh navigation, same context: the Spanish browser locale would otherwise
  // send this straight back to /es/.
  await page.goto('/pricing/');
  await expect(page).toHaveURL(/\/pricing\/$/);

  await context.close();
});

test('the current language is marked, not linked', async ({ page }) => {
  await page.goto('/es/pricing/');

  const current = page.locator('.lang--desktop [aria-current="true"]');
  await expect(current).toHaveText(/ES/);
  await expect(current).toHaveAttribute('lang', 'es');

  // The current language must not be a link to itself.
  await expect(page.locator('.lang--desktop a[data-lang-choice="es"]')).toHaveCount(0);
});

test('a language with no translation is offered as unavailable, never as a link', async ({
  page,
}) => {
  // The 404 declares no alternates at all, so neither language is navigable
  // from it and the control must say so rather than link somewhere broken.
  await page.goto('/404.html');

  await expect(page.locator('.lang--desktop [aria-disabled="true"]')).toHaveCount(1);
  await expect(page.locator('.lang--desktop a[data-lang-choice]')).toHaveCount(0);
});

test('the control is reachable and operable by keyboard alone', async ({ page }) => {
  await page.goto('/es/pricing/');

  const link = page.locator('.lang--desktop a[data-lang-choice="en"]');
  await link.focus();
  await expect(link).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/pricing\/$/);
});

test('each option names its language in that language', async ({ page }) => {
  for (const path of ['/pricing/', '/es/pricing/']) {
    await page.goto(path);
    const group = page.locator('.lang--desktop');
    await expect(group.locator('[lang="en"]')).toHaveCount(1);
    await expect(group.locator('[lang="es"]')).toHaveCount(1);
    // The accessible name carries the endonym even though the visible label is
    // the two-letter code.
    await expect(group).toContainText('EN');
    await expect(group).toContainText('ES');
  }
});

test('the active nav item is marked in Spanish', async ({ page }) => {
  // This is the regression the epic had to fix: the header compared the path
  // against English root hrefs, so under /es/ nothing was ever active.
  await page.goto('/es/solutions/');
  const active = page.locator('.site-header__nav .nav-link.is-active');
  await expect(active).toHaveCount(1);
  await expect(active).toHaveText('Soluciones');
});

test('the active legal document is marked in Spanish', async ({ page }) => {
  await page.goto('/es/privacy/');
  const current = page.locator('.legal__docs [aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveText('Política de privacidad');
});

test('the logo returns to the home page of the language being read', async ({ page }) => {
  await page.goto('/es/about/');
  await page.locator('header a.logo').click();
  await expect(page).toHaveURL(/\/es\/$/);
});
