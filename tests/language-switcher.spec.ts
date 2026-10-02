import { expect, test, type Page } from '@playwright/test';

/**
 * The language control.
 *
 * It is what makes the automatic choice a default rather than a cage, so the
 * properties that matter are: it keeps you on the page you were reading, it
 * remembers, and it never offers a language that does not exist.
 *
 * The shared infrastructure chrome exposes the same control below the header
 * on the landing and interior pages. It must preserve the page and preference
 * through a language change.
 */

/** The language control remains visible outside the mobile navigation menu. */
async function exposeLanguageControl(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.brand-languages')).toBeVisible();
}

test('switching to English keeps the page and sets the cookie', async ({ context, page }) => {
  await page.goto('/es/precios/');
  await exposeLanguageControl(page);

  await page.locator('a[data-lang-choice="en"]').first().click();
  await expect(page).toHaveURL(/\/pricing\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  const cookie = (await context.cookies()).find((c) => c.name === '1p_lang');
  expect(cookie?.value).toBe('en');
});

test('switching to Spanish keeps the page', async ({ page }) => {
  // "Keeps the page", not "keeps the path": the Spanish tree publishes Spanish
  // slugs, so staying on the same page means landing on its translated address.
  await page.goto('/pricing/');
  await exposeLanguageControl(page);
  await page.locator('a[data-lang-choice="es"]').first().click();
  await expect(page).toHaveURL(/\/es\/precios\/$/);
});

test('a blog post switches to its own translation, not the index', async ({ page }) => {
  await page.goto('/blog/getting-started-5-minutes/');
  await exposeLanguageControl(page);
  await page.locator('a[data-lang-choice="es"]').first().click();
  await expect(page).toHaveURL(/\/es\/blog\/primeros-pasos-en-5-minutos\/$/);
});

test('the cookie is written before language navigation replaces the document', async ({
  context,
  page,
}) => {
  // The landing navigates to the translated document. The preference must
  // already exist when that document runs its first-visit detection, or the
  // browser language would undo the explicit choice.
  await page.goto('/es/');
  await exposeLanguageControl(page);
  await page.locator('a[data-lang-choice="en"]').first().click();
  // Assert the destination, not the development port: isolated worktrees run
  // their static server on different ports but still exercise the same route.
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);

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
  await exposeLanguageControl(page);
  await page.locator('a[data-lang-choice="en"]').first().click();
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);

  // Fresh navigation, same context: the Spanish browser locale would otherwise
  // send this straight back to /es/.
  await page.goto('/pricing/');
  await expect(page).toHaveURL(/\/pricing\/$/);

  await context.close();
});

test('the current language is marked, not linked', async ({ page }) => {
  await page.goto('/es/precios/');
  await exposeLanguageControl(page);

  const current = page.locator('.brand-languages [aria-current="true"]');
  await expect(current).toHaveText(/ES/);
  await expect(current).toHaveAttribute('lang', 'es');

  // The current language must not be a link to itself.
  await expect(page.locator('.brand-languages a[data-lang-choice="es"]')).toHaveCount(0);
});

for (const width of [1440, 390]) {
  test(`the landing language control is keyboard-operable at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/es/');
    const group = page.locator('.brand-languages');
    await expect(group).toBeVisible();
    await expect(group.getByRole('group', { name: 'Idioma', exact: true })).toBeVisible();
    await expect(group.locator('[aria-current="true"]')).toHaveText(/^ES(?:\s|$)/);
    await expect(group.locator('[aria-current="true"]')).toHaveAttribute('lang', 'es');
    await expect(group.locator('a[data-lang-choice="es"]')).toHaveCount(0);

    const english = group.locator('a[data-lang-choice="en"]');
    await expect(english).toHaveAttribute('href', '/');
    await expect(english).toHaveAttribute('hreflang', 'en');
    await english.focus();
    await expect(english).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);
    expect((await context.cookies()).find((cookie) => cookie.name === '1p_lang')?.value).toBe('en');

    await expect(page.locator('.brand-languages [aria-current="true"]')).toHaveText(/^EN(?:\s|$)/);
    await expect(page.locator('.brand-languages a[data-lang-choice="es"]')).toHaveAttribute('href', '/es/');
  });
}

test('a language with no translation is offered as unavailable, never as a link', async ({
  page,
}) => {
  // The 404 declares no alternates at all, so neither language is navigable
  // from it and the control must say so rather than link somewhere broken.
  await page.goto('/404.html');
  await exposeLanguageControl(page);

  await expect(page.locator('.brand-languages [aria-disabled="true"]')).toHaveCount(1);
  await expect(page.locator('.brand-languages a[data-lang-choice]')).toHaveCount(0);
});

test('an unavailable language explains itself to the eye, not only to a screen reader', async ({
  page,
}) => {
  // Found by looking at the screenshot rather than by an assertion: the reason
  // the option is dead lived only in sr-only text, so a sighted reader saw a
  // greyed "ES" that reads as broken. `cursor: not-allowed` was the sole visual
  // hint and it requires a pointer, which a touch screen does not have.
  await page.goto('/404.html');
  await exposeLanguageControl(page);

  const off = page.locator('.brand-languages [aria-disabled="true"]');
  const explanation = await off.getAttribute('title');

  expect(explanation, 'the unavailable option carries a visible explanation').toBeTruthy();
  // Same sentence in both channels: one string, nothing to drift apart.
  // textContent, not innerText: the sr-only copy is visually clipped and the
  // assertion is about the two channels carrying the same sentence.
  expect((await off.textContent())!.replace(/\s+/g, ' ')).toContain(explanation!.replace(/\s+/g, ' '));
});

test('the control is reachable and operable by keyboard alone', async ({ page }) => {
  await page.goto('/es/precios/');
  await exposeLanguageControl(page);

  const link = page.locator('.brand-languages a[data-lang-choice="en"]');
  await link.focus();
  await expect(link).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/pricing\/$/);
});

test('each option names its language in that language', async ({ page }) => {
  for (const path of ['/pricing/', '/es/precios/']) {
    await page.goto(path);
    await exposeLanguageControl(page);
    const group = page.locator('.brand-languages');
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
  await page.goto('/es/blog/');
  const active = page.locator('.brand-nav [aria-current="page"]');
  await expect(active).toHaveCount(1);
  await expect(active).toHaveText('Blog');
});

test('the active legal document is marked in Spanish', async ({ page }) => {
  await page.goto('/es/privacidad/');
  const current = page.locator('.legal__docs [aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveText('Política de privacidad');
});

test('the logo returns to the home page of the language being read', async ({ page }) => {
  await page.goto('/es/nosotros/');
  await page.locator('header a.brand-lockup').click();
  await expect(page).toHaveURL(/\/es\/$/);
});

test('a modifier click does not record a preference in this tab', async ({ context, page }) => {
  // Cmd/ctrl-click opens the other language in a NEW tab and leaves this one
  // where it is. Recording the choice here would pin this tab to a language the
  // reader never switched it to — and because the preference outranks
  // detection, it would keep doing so on every later visit.
  await page.goto('/pricing/');
  await exposeLanguageControl(page);
  await page.locator('a[data-lang-choice="es"]').first().click({ modifiers: ['ControlOrMeta'] });

  await expect(page).toHaveURL(/\/pricing\/$/);
  expect((await context.cookies()).find((c) => c.name === '1p_lang')).toBeUndefined();
});

test('the language code carries lang, the accessible name does not', async ({ page }) => {
  // The accessible name is written in the language of the PAGE, so marking the
  // whole anchor as the OTHER language made a screen reader read an English
  // sentence with Spanish phonemes.
  await page.goto('/pricing/');
  await exposeLanguageControl(page);
  const link = page.locator('.brand-languages a[data-lang-choice="es"]');

  await expect(link).toHaveAttribute('hreflang', 'es');
  await expect(link).not.toHaveAttribute('lang', /.*/);
  await expect(link.locator('span[lang="es"]')).toHaveText('ES');
});
