import { expect, test } from '@playwright/test';
import { publishedRoutes } from './helpers/served';

/** The approved shared menu indexes needs and infrastructure sections rather
 * than the old commerce page directory. Every indexed solution must still be
 * named in the body: chrome alone cannot make an empty or missing section pass.
 * Published interior route preservation is covered by the SSR and route suites. */
for (const [locale, home, interior] of [['en', '/', '/about/'], ['es', '/es/', '/es/nosotros/']] as const) {
  test(`the ${locale} home describes every solution section offered by the shared navigation`, async ({ page }) => {
    expect(await publishedRoutes()).toContain(home);
    await page.goto(interior);
    const links = await page.locator('.brand-nav a').evaluateAll((anchors) => anchors.map((anchor) => (anchor as HTMLAnchorElement).href));
    expect(links).toHaveLength(6);
    const sections = links.map((href) => new URL(href)).filter((url) => url.pathname === home && url.hash).map((url) => url.hash);
    // Exactly the three approved needs: solutions, infrastructure and AI.
    expect(sections).toEqual(['#capacidades', '#arquitectura', '#inteligencia']);
    await page.goto(home);
    for (const id of sections) {
      const section = page.locator(`main ${id}`);
      await expect(section).toHaveCount(1);
      await expect(section.locator('h2')).toHaveCount(1);
      await expect(section.locator('h2')).not.toBeEmpty();
      const prose = section.locator('p').first();
      await expect(prose).not.toBeEmpty();
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
    }
    await expect(page.locator('main [data-capability]')).toHaveCount(10);
  });
}
