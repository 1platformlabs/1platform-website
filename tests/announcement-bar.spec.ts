import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { pickAnnouncement } from '../src/components/announcement';

/**
 * The announcement bar (LMW-02): 40 px, fixed, above the header, showing the
 * NEWEST changelog entry of the page's language — never invented copy.
 */

function newestTitle(locale: 'en' | 'es'): string {
  const dir = join('src', 'content', 'changelog', locale);
  const entries = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = readFileSync(join(dir, f), 'utf8');
      const title = raw.match(/^title:\s*"(.+)"\s*$/m)?.[1];
      const date = raw.match(/^date:\s*(\S+)\s*$/m)?.[1];
      if (!title || !date) throw new Error(`frontmatter missing in ${f}`);
      return { title, date: new Date(date) };
    });
  // Floor: an empty directory would make "shows the newest" vacuous.
  expect(entries.length).toBeGreaterThan(2);
  return pickAnnouncement(entries)!.title;
}

test('the picker chooses the newest entry and returns null for an empty changelog', () => {
  expect(pickAnnouncement([])).toBeNull();
  const picked = pickAnnouncement([
    { title: 'older', date: new Date('2024-01-01') },
    { title: 'newest', date: new Date('2026-05-20') },
    { title: 'middle', date: new Date('2025-06-01') },
  ]);
  expect(picked?.title).toBe('newest');
});

for (const [path, locale, cta] of [
  ['/pricing/', 'en', 'See what changed'],
  ['/es/precios/', 'es', 'Ver qué cambió'],
] as const) {
  test(`${path}: a 40 px fixed bar shows the newest ${locale} changelog title and links to the changelog`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);

    const bar = page.locator('aside.announcement[role="note"]');
    await expect(bar).toBeVisible();
    const box = await bar.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, height: r.height, position: getComputedStyle(el).position };
    });
    expect(box.top).toBe(0);
    expect(box.height).toBe(40);
    expect(box.position).toBe('fixed');

    await expect(bar.locator('.announcement__title')).toHaveText(newestTitle(locale));
    const link = bar.locator('a.announcement__link');
    await expect(link).toHaveText(new RegExp(cta));
    await expect(link).toHaveAttribute('href', locale === 'es' ? '/es/novedades/' : '/changelog/');

    // The rail keeps a breathing gap below the announcement and remains fixed.
    const headerTop = () => page.locator('header.site-header').evaluate((el) => el.getBoundingClientRect().top);
    expect(await headerTop()).toBe(72);
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(300);
    expect(await headerTop()).toBe(72);
    expect(await bar.evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
  });
}

test('the offset the bar adds reaches every anchor: a hash navigation leaves the target fully visible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pricing/');
  // Any id on the page will do; measure that scrolling it into view leaves it
  // below the fixed chrome (bar + floating rail).
  const id = await page.evaluate(() => {
    const el = [...document.querySelectorAll('main [id]')].find((e) => e.getBoundingClientRect().top > 1200);
    return el?.id ?? '';
  });
  expect(id).not.toBe('');
  await page.evaluate((i) => document.getElementById(i)!.scrollIntoView(), id);
  const top = await page.evaluate((i) => document.getElementById(i)!.getBoundingClientRect().top, id);
  expect(top).toBeGreaterThanOrEqual(130);
});

/**
 * ── The bar is 1Platform's changelog, so it is 1Platform's bar ──────────────
 *
 * `BaseLayout` reads the changelog through `getLocalized('changelog', …)`: the
 * content collection in THIS REPOSITORY. That is the platform's own product
 * news — its title, its voice, its link to `/changelog/`.
 *
 * Until this gate, that strip rendered inside every tenant's chrome. Measured
 * on the clinic's 404 page, whose home is exempt only because it happens to
 * pass `showAnnouncement={false}`:
 *
 *   "El sitio web se reenfocó en la tienda online, los pagos y la plataforma
 *    para desarrolladores"  →  /novedades/
 *
 * …under a clinic's domain, linking to a route that clinic does not publish
 * and which therefore answers 404.
 *
 * ⚠️ THE PROVIDER/BRAND SWEEP CANNOT SEE THIS. A changelog title need not
 * contain the string "1Platform" — the current one does not — so
 * `no-leak-across-tenants.spec.ts` reads the strip and finds nothing banned.
 * The rule has to be about PROVENANCE, not about spelling, which is what this
 * test asserts: the bar appears only for a tenant that publishes the changelog.
 */
test('the changelog strip appears only for a tenant that publishes the changelog', async () => {
  const { getWithHost } = await import('./helpers/http-host')
  const { repoTenants } = await import('../src/data/site-tenants')
  const base = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? '4321'}`

  const tenants = repoTenants()
  expect(tenants.length, 'a cross-tenant assertion needs at least two tenants').toBeGreaterThanOrEqual(2)

  for (const tenant of tenants) {
    const publishes = tenant.pages.includes('/changelog/')
    // The 404 page is the one page EVERY tenant renders, and the only one a
    // page-set enumeration can never reach — which is exactly where the leak
    // was found. Asking for a route nobody publishes is how we get it.
    const res = await getWithHost(`${base}/no-existe-esta-ruta/`, tenant.domain)
    expect(res.status, `${tenant.domain} must answer 404 for an unpublished route`).toBe(404)

    const hasBar = res.body.includes('class="announcement"')
    expect(
      hasBar,
      publishes
        ? `${tenant.slug} publishes /changelog/ and must still get its strip — a gate that hides it from everyone is not a fix`
        : `${tenant.slug} does not publish /changelog/, yet the platform's changelog strip is rendering on its page`,
    ).toBe(publishes)
  }

  // Floor: with every tenant on the same side of the branch this proves nothing.
  const publishing = tenants.filter((t) => t.pages.includes('/changelog/')).length
  expect(publishing, 'at least one tenant must publish the changelog').toBeGreaterThan(0)
  expect(publishing, 'at least one tenant must NOT publish it, or there is no gate to test').toBeLessThan(
    tenants.length,
  )
})
