import { expect, test } from '@playwright/test';
import { translateToEs } from '../src/i18n/routes';
import { servedHtml } from './helpers/served';

const stableLinks = ['/blog/', '/terms/', '/privacy/', '/cookies/'];

function footerLinks(html: string) {
  const footer = html.match(/<footer[\s>][\s\S]*?<\/footer>/)?.[0] ?? '';
  return [...footer.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
}

// The Spanish footer no longer carries `/es` + the English path: each entry
// sits at its own translated address, so the expectation is read from the route
// map instead of concatenated.
//
// This used to read `dist/index.html` and `dist/es/index.html` off disk, back
// when the static build wrote every page to a file and that file was
// byte-for-byte what production served. The Node adapter ended that: the two
// home pages are rendered on demand by `dist/server`, so there is no file left
// to read and the disk walk would have found nothing. The subject moved to the
// served HTML, so the spec moved with it — and it now measures the exact bytes
// the adapter emits, which is strictly closer to what a visitor gets than the
// artefact on disk ever was.
for (const [route, locale] of [['/', 'en'], ['/es/', 'es']] as const) {
  test(`the ${locale === 'en' ? 'English' : '/es'} footer preserves every public destination`, async () => {
    const links = footerLinks(await servedHtml(route));

    // The enumeration gets its own floor. Every assertion below is of the form
    // "this destination is among the links we found", so a footer regex that
    // matched nothing — a renamed element, a page served without its chrome —
    // would produce an empty list, and an empty list is a broken probe, not a
    // footer that legitimately lost sixteen links at once.
    expect(
      links.length,
      `the footer of ${route} yielded ${links.length} links, fewer than the ${stableLinks.length} ` +
        `destinations asserted below. That is a probe that stopped seeing the footer, not a pass.`,
    ).toBeGreaterThanOrEqual(stableLinks.length);

    for (const href of ['https://wa.me/50253946564', 'https://developer.1platform.pro/docs/saas/1platform-api/getting-started', 'https://developer.1platform.pro/api-reference/1platform-api']) expect(links).toContain(href);
    for (const anchor of ['capacidades', 'arquitectura', 'inteligencia']) expect(links).toContain(`${locale === 'es' ? '/es/' : '/'}#${anchor}`);
    for (const link of stableLinks) {
      expect(links).toContain(locale === 'en' ? link : translateToEs(link));
    }
  });
}

test('the footer columns and legal links are usable at desktop and mobile widths', async ({ page }) => {
  await page.goto('/about/');
  for (const width of [1440, 360, 390, 430, 844]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
    await expect(page.locator('.brand-footer-column')).toHaveCount(3);
    const contact = page.locator('.brand-footer-column a[href="https://wa.me/50253946564"]');
    await expect(contact).toBeVisible();
    await contact.focus();
    await expect(contact).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.brand-footer-bottom a')).toHaveCount(3);
  }
});

/**
 * The footer carried a newsletter capture whose submit handler opened a
 * `mailto:` to the public sales address, so filling it in — by a person or a
 * bot — produced a message aimed straight at that inbox. It was removed rather
 * than hardened, and a dedicated contact landing will take its place.
 *
 * This asserts the surface stays gone until then. It is deliberately about ANY
 * input the footer collects, not the one selector that was deleted: a
 * reinstated capture under a new class name is the same open relay.
 */
test('the footer collects nothing from the visitor', async ({ page }) => {
  await page.goto('/es/');
  const footer = page.locator('.brand-footer');
  await expect(footer).toBeVisible();
  await expect(footer.locator('form')).toHaveCount(0);
  await expect(footer.locator('input, textarea, select')).toHaveCount(0);
});
