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
  ['/', 'en', 'See what changed'],
  ['/es/', 'es', 'Ver qué cambió'],
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
    await expect(link).toHaveAttribute('href', locale === 'es' ? '/es/changelog/' : '/changelog/');

    // The header moved down by exactly the bar's height, and stays there
    // after scrolling — both are fixed.
    const headerTop = () => page.locator('header.site-header').evaluate((el) => el.getBoundingClientRect().top);
    expect(await headerTop()).toBe(40);
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(300);
    expect(await headerTop()).toBe(40);
    expect(await bar.evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
  });
}

test('the offset the bar adds reaches every anchor: a hash navigation leaves the target fully visible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pricing/');
  // Any id on the page will do; measure that scrolling it into view leaves it
  // below the fixed chrome (bar + header = 114 px).
  const id = await page.evaluate(() => {
    const el = [...document.querySelectorAll('main [id]')].find((e) => e.getBoundingClientRect().top > 1200);
    return el?.id ?? '';
  });
  expect(id).not.toBe('');
  await page.evaluate((i) => document.getElementById(i)!.scrollIntoView(), id);
  const top = await page.evaluate((i) => document.getElementById(i)!.getBoundingClientRect().top, id);
  expect(top).toBeGreaterThanOrEqual(114);
});
