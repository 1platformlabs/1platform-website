import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';

import { LOCALE_NEUTRAL_OG_IMAGES, LOCALIZED_OG_IMAGES } from '../src/i18n/og';

/**
 * The share card of a Spanish page has to be written in Spanish.
 *
 * Issue #59: `/es/solutions/deliveries/` declared `og:locale = es_ES` and then
 * pointed at `solution-deliveries.png`, a card whose headline reads "Delivery
 * Management — Register, dispatch and track every shipment". The reader's first
 * contact with the product arrived in a language they had not chosen, and the
 * link looked like it led to an English page.
 *
 * Read from `dist/` on purpose. The defect is a property of the deployed
 * artefact, and the only way to see it is to look at what the built page
 * actually names.
 */

const DIST = 'dist';

function pagesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === 'index.html') out.push(full);
    }
  };
  walk(dir);
  return out;
}

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
 */
const spanishPages = () =>
  pagesUnder(DIST)
    .filter((p) => relative(DIST, p).startsWith('es/'))
    .filter((p) => !readFileSync(p, 'utf8').includes('noindex'));

test.describe('the share card follows the page language', () => {
  test('every Spanish page names a card that is Spanish or wordless', () => {
    const pages = spanishPages();
    expect(pages.length, 'no indexable Spanish pages were built at all').toBeGreaterThan(20);

    const neutral = new Set<string>(LOCALE_NEUTRAL_OG_IMAGES);
    const offenders: string[] = [];

    for (const page of pages) {
      const raw = ogImageOf(readFileSync(page, 'utf8'));
      expect(raw, `${relative(DIST, page)} declares no og:image at all`).not.toBeNull();
      const path = new URL(raw!).pathname;
      if (neutral.has(path)) continue;
      if (!path.endsWith('-es.png')) offenders.push(`${relative(DIST, page)} -> ${path}`);
    }

    expect(
      offenders,
      'these Spanish pages advertise an English share card (issue #59)',
    ).toEqual([]);
  });

  test('every card named by a Spanish page was actually drawn', () => {
    // The failure mode this catches is worse than an English card: a missing
    // image makes platforms render no card at all, and nothing in the build
    // complains, because `og:image` is just a string.
    const missing: string[] = [];
    for (const page of spanishPages()) {
      const raw = ogImageOf(readFileSync(page, 'utf8'));
      const path = new URL(raw!).pathname;
      if (!existsSync(join(DIST, path))) missing.push(`${relative(DIST, page)} -> ${path}`);
    }
    expect(missing, 'these share cards are advertised but not shipped').toEqual([]);
  });

  test('the localized list and the drawn files agree, in both directions', () => {
    // Without this, the list and the generator drift: someone adds a card to
    // `generate-og-images.py` and forgets the list, or the reverse, and the
    // first two tests keep passing because nothing points at the new card yet.
    for (const english of LOCALIZED_OG_IMAGES) {
      const spanish = english.replace(/\.png$/, '-es.png');
      expect(existsSync(join(DIST, english)), `${english} is listed but not shipped`).toBe(true);
      expect(
        existsSync(join(DIST, spanish)),
        `${english} is listed as localized, but ${spanish} was never drawn — ` +
          'add it to CARDS in scripts/generate-og-images.py and re-run it',
      ).toBe(true);
    }
    for (const neutral of LOCALE_NEUTRAL_OG_IMAGES) {
      expect(existsSync(join(DIST, neutral)), `${neutral} is listed but not shipped`).toBe(true);
      expect(
        existsSync(join(DIST, neutral.replace(/\.png$/, '-es.png'))),
        `${neutral} is declared locale-neutral, yet a Spanish variant exists — ` +
          'decide which it is, the two lists cannot both be right',
      ).toBe(false);
    }
  });
});
