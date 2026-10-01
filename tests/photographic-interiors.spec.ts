import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const contentRoot = join(process.cwd(), 'src/content/blog');
const locales = ['en', 'es'] as const;
const blogPath = (locale: string) => locale === 'es' ? '/es/blog/' : '/blog/';
const storePath = (locale: string) => locale === 'es' ? '/es/soluciones/tienda-online/' : '/solutions/online-store/';

for (const locale of locales) {
  test.describe(`photographic interiors ${locale}`, () => {
    test.use({ locale });

    test('archive query survives reload, Back/Forward and article navigation', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(blogPath(locale));
      const tiedArticles = locale === 'es'
        ? ['lanzar-una-tienda-online-en-30-minutos', 'integrar-pagos-en-tu-saas']
        : ['integrating-payments-into-your-saas', 'launch-online-store-30-minutes'];
      for (const [index, slug] of tiedArticles.entries()) {
        await expect(page.locator('.archive-link').nth(index)).toHaveAttribute('href', `${blogPath(locale)}${slug}/`);
      }
      const allRows = await page.locator('.archive-item').count();
      const filter = page.locator('[data-filter="api-tutorials"]');
      await filter.click();
      await expect(page).toHaveURL(/category=api-tutorials/);
      const matches = page.locator('.archive-item[data-category="api-tutorials"]');
      await expect(page.locator('.archive-item:visible')).toHaveCount(await matches.count());
      await expect(filter).toHaveAttribute('aria-current', 'true');
      await page.reload();
      await expect(page.locator('.archive-item:visible')).toHaveCount(await matches.count());
      await page.locator('[data-filter="all"]').click();
      await expect(page.locator('.archive-item:visible')).toHaveCount(allRows);
      await page.goBack();
      await expect(page.locator('.archive-item:visible')).toHaveCount(await matches.count());
      await page.goForward();
      await expect(page.locator('.archive-item:visible')).toHaveCount(allRows);
      await page.locator('[data-filter="api-tutorials"]').click();
      const articleLink = page.locator('.archive-item:visible .archive-link').first();
      const articleUrl = await articleLink.getAttribute('href');
      await articleLink.click();
      await expect(page).toHaveURL(new RegExp(`${articleUrl}$`));
      await expect(page.locator('.article-copy')).toBeVisible();
      await page.goBack();
      await expect(page.locator('[data-filter="api-tutorials"]')).toHaveAttribute('aria-current', 'true');
      await expect(page.locator('.archive-item:visible')).toHaveCount(await matches.count());
    });

    test('mobile selector announces its count and unknown category safely shows all', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${blogPath(locale)}?category=not-a-topic`);
      const total = await page.locator('.archive-item').count();
      await expect(page.locator('.archive-item:visible')).toHaveCount(total);
      await page.locator('#archive-topic').selectOption('api-tutorials');
      const count = await page.locator('.archive-item[data-category="api-tutorials"]').count();
      await expect(page.locator('.filter-count')).toContainText(String(count));
      await expect(page.locator('.filter-count')).toHaveAttribute('aria-live', 'polite');
      await expect(page.locator('.archive-item:visible')).toHaveCount(count);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://1platform.pro${blogPath(locale)}`);
      await page.reload();
      await expect(page.locator('#archive-topic')).toHaveValue('api-tutorials');
    });

    test('every existing editorial route retains title, date, language and deep headings', async ({ page }) => {
      const files = readdirSync(join(contentRoot, locale)).filter((name) => name.endsWith('.md'));
      for (const file of files) {
        const source = readFileSync(join(contentRoot, locale, file), 'utf8');
        const title = JSON.parse(source.match(/^title: (".*")$/m)![1]) as string;
        const pubDate = source.match(/^pubDate: (.+)$/m)![1];
        const route = `${blogPath(locale)}${file.replace(/\.md$/, '')}/`;
        const response = await page.goto(route);
        expect(response?.status(), route).toBe(200);
        await expect(page.locator('h1')).toHaveText(title.replace(/[.\s]+$/, ''));
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://1platform.pro${route}`);
        await expect(page.locator('.article-hero-meta time').first()).toHaveAttribute('datetime', new RegExp(`^${pubDate}`));
        const headings = page.locator('.article-copy h2[id]');
        expect(await headings.count(), route).toBeGreaterThan(0);
        const firstId = await headings.first().getAttribute('id');
        await expect(page.locator(`.interior-toc a[href="#${firstId}"]`)).toHaveCount(1);
        await page.goto(`${route}#${firstId}`);
        await expect(page.locator(`.article-copy [id="${firstId}"]`)).toBeVisible();
        await expect(page.locator('meta[name="robots"][content*="noindex" i]')).toHaveCount(0);
        const twin = await page.locator(`link[rel="alternate"][hreflang="${locale === 'en' ? 'es' : 'en'}"]`).getAttribute('href');
        expect(twin, route).toBeTruthy();
      }
    });

    for (const viewport of [{ width: 1440, height: 900 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }]) {
      test(`has readable, overflow-free interiors at ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const article = locale === 'es' ? 'facturacion-electronica-para-negocios-online/' : 'electronic-invoicing-online-business/';
        for (const route of [blogPath(locale), storePath(locale), `${blogPath(locale)}${article}`]) {
          await page.goto(route);
          await page.evaluate(() => document.fonts.ready);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
          await expect(page.locator('.photographic-interior h1')).toBeVisible();
          expect(await page.locator('.photographic-interior h1').evaluate((node) => getComputedStyle(node).fontFamily)).toContain('Manrope');
        }
      });
    }
  });
}

test('desktop category links also filter on the server without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, locale: 'en', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('/blog/');
  await page.locator('[data-filter="api-tutorials"]').click();
  await expect(page).toHaveURL(/category=api-tutorials/);
  const count = await page.locator('.archive-item[data-category="api-tutorials"]').count();
  await expect(page.locator('.archive-item:visible')).toHaveCount(count);
  await context.close();
});
