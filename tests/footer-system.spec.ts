import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const dist = 'dist';
const stableLinks = [
  '/solutions/online-store/', '/solutions/website/', '/solutions/content/', '/solutions/deliveries/',
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

test('the footer CTA and e-mail control are usable at desktop and mobile widths', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about/');
  await expect(page.locator('.site-footer .btn--footer')).toHaveAttribute('href', 'https://app.1platform.pro/app/');
  await expect(page.locator('.signup input[type="email"]')).toHaveAttribute('required', '');
  await expect(page.locator('.footer-col')).toHaveCount(3);

  await page.setViewportSize({ width: 390, height: 844 });
  const firstColumn = page.locator('.footer-col').first();
  await firstColumn.locator('summary').click();
  await firstColumn.locator('summary').click();
  await expect(firstColumn).toHaveAttribute('open', /.*/);
});
