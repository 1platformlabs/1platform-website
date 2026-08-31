import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const dist = 'dist';
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

for (const [file, prefix] of [['index.html', ''], [join('es', 'index.html'), '/es']] as const) {
  test(`the ${prefix || 'English'} footer preserves every public destination`, () => {
    const links = footerLinks(readFileSync(join(dist, file), 'utf8'));
    for (const link of stableLinks) expect(links).toContain(`${prefix}${link}`);
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
