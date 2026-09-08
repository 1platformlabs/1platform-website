import { expect, test } from '@playwright/test';
import { translateToEs } from '../src/i18n/routes';
import { servedHtml } from './helpers/served';

const stableLinks = [
  '/solutions/online-store/', '/solutions/content/', '/solutions/deliveries/',
  '/solutions/ads/', '/solutions/whitelabel/', '/payments-invoicing/', '/for-agencies/',
  '/for-developers/', '/solutions/', '/blog/', '/changelog/', '/about/', '/pricing/',
  '/terms/', '/privacy/', '/cookies/',
];

function footerLinks(html: string) {
  const footer = html.match(/<footer[\s>][\s\S]*?<\/footer>/)?.[0] ?? '';
  return [...footer.matchAll(/href="([^"#]*)"/g)].map((match) => match[1]);
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

    for (const link of stableLinks) {
      expect(links).toContain(locale === 'en' ? link : translateToEs(link));
    }
  });
}

test('the footer CTA and columns are usable at desktop and mobile widths', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about/');
  await expect(page.locator('.site-footer .btn--footer')).toHaveAttribute('href', 'https://app.1platform.pro/app/');
  await expect(page.locator('.footer-col')).toHaveCount(3);

  await page.setViewportSize({ width: 390, height: 844 });
  const firstColumn = page.locator('.footer-col').first();
  await firstColumn.locator('summary').click();
  await firstColumn.locator('summary').click();
  await expect(firstColumn).toHaveAttribute('open', /.*/);
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
  const footer = page.locator('.site-footer');
  await expect(footer).toBeVisible();
  await expect(footer.locator('form')).toHaveCount(0);
  await expect(footer.locator('input, textarea, select')).toHaveCount(0);
});
