import { expect, test } from '@playwright/test';

/**
 * First-visit language selection.
 *
 * The rule: Spanish browsers and everything that is not English go to /es/;
 * English browsers stay; an explicit choice always wins; and a Spanish URL is
 * never redirected, because a shared link outranks a browser setting and
 * Google renders JavaScript as en-US — redirecting /es/ would put the entire
 * Spanish tree at risk of being deindexed.
 *
 * Each test sets `locale`, which is what Playwright uses for
 * `navigator.language`, and starts from a fresh context so no cookie leaks
 * between cases.
 */

test.describe('sends a Spanish browser to Spanish', () => {
  test.use({ locale: 'es-MX' });

  test('redirects an unprefixed URL', async ({ page }) => {
    await page.goto('/pricing/');
    await expect(page).toHaveURL(/\/es\/pricing\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('keeps the query string and the fragment', async ({ page }) => {
    await page.goto('/pricing/?utm_source=test#faq');
    await expect(page).toHaveURL('/es/pricing/?utm_source=test#faq');
  });

  test('leaves no history entry behind it', async ({ page }) => {
    // The redirect replaces the current entry rather than pushing a new one,
    // so Back must escape the site instead of bouncing through the redirect
    // again. If it pushed, this would land on /pricing/ and redirect forever.
    await page.goto('/');
    await page.goto('/pricing/');
    await expect(page).toHaveURL(/\/es\/pricing\/$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/es\/$/);
  });
});

test.describe('leaves an English browser alone', () => {
  test.use({ locale: 'en-US' });

  test('does not redirect an unprefixed URL', async ({ page }) => {
    await page.goto('/pricing/');
    await expect(page).toHaveURL(/\/pricing\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('does not redirect away from Spanish either', async ({ page }) => {
    // The hard rule. An English-speaking visitor who follows a link to a
    // Spanish page gets the Spanish page.
    await page.goto('/es/pricing/');
    await expect(page).toHaveURL(/\/es\/pricing\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
});

test.describe('treats any other language as Spanish', () => {
  test.use({ locale: 'fr-FR' });

  test('sends a French browser to Spanish', async ({ page }) => {
    await page.goto('/pricing/');
    await expect(page).toHaveURL(/\/es\/pricing\/$/);
  });
});

test.describe('an explicit choice beats the browser', () => {
  test.use({ locale: 'es-MX' });

  test('the cookie suppresses the redirect', async ({ context, page }) => {
    await context.addCookies([
      { name: '1p_lang', value: 'en', url: 'http://localhost:4321' },
    ]);

    await page.goto('/pricing/');
    await expect(page).toHaveURL(/\/pricing\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test.describe('never redirects without somewhere to go', () => {
  test.use({ locale: 'es-MX' });

  test('a page with no declared Spanish alternate stays put', async ({ page }) => {
    // The 404 has no Spanish twin and declares no alternates, so the guard
    // finds no hreflang="es" and does nothing. This is the mechanism that makes
    // redirecting to a page that does not exist structurally impossible.
    await page.goto('/404.html');
    await expect(page).toHaveURL(/\/404\.html$/);
    await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveCount(0);
  });
});

test.describe('redirects at most once', () => {
  test.use({ locale: 'es-MX' });

  test('counts hard loads and client-router navigations together', async ({ page }) => {
    // Counting `framenavigated` alone would not discriminate: the site mounts
    // Astro's client router, so an in-site click swaps the document without a
    // frame navigation. A test that only watched frames would pass even if the
    // script looped. Both signals are counted.
    const hard: string[] = [];
    const soft: string[] = [];

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) hard.push(frame.url());
    });
    await page.exposeFunction('__recordSoftNav', (url: string) => void soft.push(url));
    await page.addInitScript(() => {
      const push = history.pushState.bind(history);
      const replace = history.replaceState.bind(history);
      history.pushState = (...args: Parameters<typeof push>) => {
        // @ts-expect-error injected by exposeFunction
        window.__recordSoftNav?.(String(args[2] ?? location.href));
        return push(...args);
      };
      history.replaceState = (...args: Parameters<typeof replace>) => {
        // @ts-expect-error injected by exposeFunction
        window.__recordSoftNav?.(String(args[2] ?? location.href));
        return replace(...args);
      };
    });

    await page.goto('/pricing/');
    await expect(page).toHaveURL(/\/es\/pricing\/$/);
    await page.waitForTimeout(500);

    // Distinct destinations, not raw events: the client router can report the
    // same URL more than once while settling, which is not a redirect. What a
    // loop would look like is a THIRD distinct address, or the same pair
    // alternating.
    const visited = [...new Set(hard)];
    expect(visited, `hard navigations: ${hard.join(', ')}`).toHaveLength(2);
    expect(visited[1]).toMatch(/\/es\/pricing\/$/);
    expect(soft.length, `router navigations: ${soft.join(', ')}`).toBeLessThanOrEqual(1);
  });
});

test.describe('the document language survives a soft navigation', () => {
  test.use({ locale: 'es-MX' });

  test('lang stays es after the client router swaps the document', async ({ page }) => {
    // The router copies the root element's attributes across a swap. We depend
    // on that for <html lang>, so it is asserted rather than assumed.
    await page.goto('/es/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');

    await page.getByRole('link', { name: 'Precios', exact: true }).first().click();
    await expect(page).toHaveURL(/\/es\/pricing\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
});

test.describe('without JavaScript', () => {
  test.use({ locale: 'es-MX', javaScriptEnabled: false });

  test('the English page is served, complete and unredirected', async ({ page }) => {
    const response = await page.goto('/pricing/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/pricing\/$/);

    // Content must be visible without JS, not merely present in the DOM: the
    // reveal-on-scroll pattern starts at opacity 0 and is only un-hidden by a
    // script, so "the markup is there" would not have caught it.
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('the language control is still a working link', async ({ page }) => {
    await page.goto('/pricing/');
    const toSpanish = page.locator('a[data-lang-choice="es"]').first();
    await expect(toSpanish).toHaveAttribute('href', '/es/pricing/');

    await toSpanish.click();
    await expect(page).toHaveURL(/\/es\/pricing\/$/);
  });
});
