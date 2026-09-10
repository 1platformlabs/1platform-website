import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { LOCALE_NEUTRAL_OG_IMAGES, LOCALIZED_OG_IMAGES } from '../src/i18n/og';
import { CLIENT_DIR, publishedPagesByLocale } from './helpers/served';

/**
 * The share card of a Spanish page has to be written in Spanish.
 *
 * Issue #59: `/es/solutions/deliveries/` declared `og:locale = es_ES` and then
 * pointed at `solution-deliveries.png`, a card whose headline reads "Delivery
 * Management — Register, dispatch and track every shipment". The reader's first
 * contact with the product arrived in a language they had not chosen, and the
 * link looked like it led to an English page.
 *
 * WHERE THIS TEST LOOKS, AND WHY IT MOVED
 * ---------------------------------------
 * This file used to walk `dist/` and read `index.html` off disk, justified by
 * "the defect is a property of the deployed artefact". That justification was
 * true and is now false: with the Node adapter the build emits `dist/client`
 * (assets, plus the 17 blog pages that are still prerendered) and `dist/server`
 * (the code that renders everything else on demand). Only THREE indexable
 * Spanish pages survive as files — so the same walk, repointed at
 * `dist/client`, would have inspected 3 pages instead of 26 and stayed green.
 * The card of `/es/solutions/deliveries/`, the very page of issue #59, would
 * have gone unread.
 *
 * So the PAGE half now reads the served HTML, which is where the deployed
 * artefact lives today. The FILE half — "was this card actually drawn?" — still
 * reads disk, because an OG card genuinely is a file and `dist/client` is where
 * files now live. The two halves are about different things and only one of
 * them moved.
 */

const ogImageOf = (html: string) =>
  html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? null;

/**
 * Indexable Spanish pages only.
 *
 * 21 built pages carry no `og:image` at all — the six blog category listings,
 * the three comparison pages, `/features/` and `/why-1platform/` — and they are
 * symmetric across both trees, so it is not a Spanish problem. Measured: all 21
 * are `noindex`. A page nobody is meant to find or share does not need a card,
 * so requiring one here would be inventing a defect and would make this test
 * fail for a reason that has nothing to do with #59.
 *
 * The set is now the sitemap's `/es/` pages, minus anything `noindex`. That
 * subtraction is deliberately kept even though it currently removes nothing:
 * measured against the frozen F0 baseline, the sitemap's 26 Spanish URLs are
 * EXACTLY the 26 indexable Spanish pages the static build emitted (`comm -3`
 * over the two lists is empty), so the enumeration changed source without
 * changing membership. If a `noindex` page ever reaches the sitemap, the old
 * meaning of this test is the one that survives.
 *
 * Memoised inside a function rather than computed at module scope, because
 * module scope runs before Playwright has started the server.
 */
let cachedSpanishPages: Promise<Array<{ route: string; html: string }>> | null = null;

const spanishPages = () => {
  cachedSpanishPages ??= publishedPagesByLocale().then(({ es }) =>
    es.filter((p) => !p.html.includes('noindex')),
  );
  return cachedSpanishPages;
};

/** The floor counts PAGES, which is the thing that can silently shrink. It was
 *  26 on the static baseline; anything at or below 20 means the enumeration
 *  broke, and every loop below would then pass without reading a single card. */
const floorPages = (pages: unknown[]) =>
  expect(
    pages.length,
    `only ${pages.length} indexable Spanish pages were enumerated (26 on the F0 baseline). ` +
      'A probe that finds almost nothing is broken, not a pass — every assertion in this ' +
      'file iterates this set.',
  ).toBeGreaterThan(20);

test.describe('the share card follows the page language', () => {
  /**
   * One worker, in order. The root config is `fullyParallel`, which used to be
   * free when every test read files off disk; now two of these three tests each
   * pull 26 pages over HTTP from the single-process adapter, and running them
   * simultaneously made the server reset connections mid-batch (`ECONNRESET`,
   * reproduced on the first run of this rewrite). `default` mode — not `serial`
   * — because a failure in the first test must not skip the second: they guard
   * different defects, and hiding one behind the other is exactly the kind of
   * silent narrowing this rewrite exists to prevent. It also means the page
   * enumeration is fetched once and shared.
   */
  test.describe.configure({ mode: 'default' });

  test('every Spanish page names a card that is Spanish or wordless', async () => {
    const pages = await spanishPages();
    floorPages(pages);

    const neutral = new Set<string>(LOCALE_NEUTRAL_OG_IMAGES);
    const offenders: string[] = [];

    for (const page of pages) {
      const raw = ogImageOf(page.html);
      expect(raw, `${page.route} declares no og:image at all`).not.toBeNull();
      const path = new URL(raw!).pathname;
      if (neutral.has(path)) continue;
      if (!path.endsWith('-es.png')) offenders.push(`${page.route} -> ${path}`);
    }

    expect(
      offenders,
      'these Spanish pages advertise an English share card (issue #59)',
    ).toEqual([]);
  });

  test('every card named by a Spanish page was actually drawn', async () => {
    // The failure mode this catches is worse than an English card: a missing
    // image makes platforms render no card at all, and nothing in the build
    // complains, because `og:image` is just a string.
    //
    // This is the one place the two halves meet: the NAME comes from the served
    // page, the FILE is looked for under `dist/client`, which is where the
    // adapter now puts everything that is genuinely static. Resolving the name
    // against disk is still the right check — a served 200 for the image would
    // only prove the server can answer, not that the card was drawn.
    const pages = await spanishPages();
    floorPages(pages);

    const missing: string[] = [];
    for (const page of pages) {
      const raw = ogImageOf(page.html);
      const path = new URL(raw!).pathname;
      if (!existsSync(join(CLIENT_DIR, path))) missing.push(`${page.route} -> ${path}`);
    }
    expect(missing, 'these share cards are advertised but not shipped').toEqual([]);
  });

  test('the localized list and the drawn files agree, in both directions', () => {
    // Without this, the list and the generator drift: someone adds a card to
    // `generate-og-images.py` and forgets the list, or the reverse, and the
    // first two tests keep passing because nothing points at the new card yet.
    //
    // Pure disk, and it stays that way: the subject here is the drawn PNGs, not
    // a page. Only the directory moved, `dist` -> `dist/client`.
    //
    // The lists are compile-time constants, so they cannot shrink the way an
    // enumeration can — but an empty one would still make both loops below pass
    // without checking a single file, so they are floored too.
    expect(
      LOCALIZED_OG_IMAGES.length,
      'the localized-card list is empty — both directions below would pass vacuously',
    ).toBeGreaterThan(0);
    expect(
      LOCALE_NEUTRAL_OG_IMAGES.length,
      'the locale-neutral list is empty — the second direction below would pass vacuously',
    ).toBeGreaterThan(0);

    for (const english of LOCALIZED_OG_IMAGES) {
      const spanish = english.replace(/\.png$/, '-es.png');
      expect(existsSync(join(CLIENT_DIR, english)), `${english} is listed but not shipped`).toBe(
        true,
      );
      expect(
        existsSync(join(CLIENT_DIR, spanish)),
        `${english} is listed as localized, but ${spanish} was never drawn — ` +
          'add it to CARDS in scripts/generate-og-images.py and re-run it',
      ).toBe(true);
    }
    for (const neutral of LOCALE_NEUTRAL_OG_IMAGES) {
      expect(existsSync(join(CLIENT_DIR, neutral)), `${neutral} is listed but not shipped`).toBe(
        true,
      );
      expect(
        existsSync(join(CLIENT_DIR, neutral.replace(/\.png$/, '-es.png'))),
        `${neutral} is declared locale-neutral, yet a Spanish variant exists — ` +
          'decide which it is, the two lists cannot both be right',
      ).toBe(false);
    }
  });
});
