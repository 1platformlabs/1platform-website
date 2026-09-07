import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Every internal link the header offers must resolve to a page the build
 * actually produced.
 *
 * `home-names-every-solution.spec.ts` already ties the menu to the home page's
 * body copy, and `i18n-build.spec.ts` ties the English tree to its Spanish
 * counterpart — but nothing walked the header itself and confirmed each
 * `href` it emits is a real address in `dist/`. That gap is exactly the shape
 * of issue #199 (1platform-content-ai): a QA crawl reported the Spanish nav
 * 404ing on its own links. It did not reproduce against a live build — every
 * reported path existed — but nothing would have caught it here if it had,
 * which is the point of this guard.
 *
 * Desktop rail and mobile menu are checked separately even though they render
 * the same `navItems` array, because a future edit could touch one markup
 * block without the other going stale in the same way.
 */

const DIST = 'dist';

const LOCALES = [
  { label: 'en', home: join(DIST, 'index.html') },
  { label: 'es', home: join(DIST, 'es', 'index.html') },
];

const REGIONS: Record<string, RegExp> = {
  'desktop rail': /<nav class="site-header__nav"[\s\S]*?<\/nav>/,
  'mobile menu': /<div class="mobile-menu"[\s\S]*?<\/header>/,
};

/** Internal hrefs (leading "/") found inside one region of the header markup. */
function internalHrefs(html: string, region: RegExp, label: string): string[] {
  const block = html.match(region)?.[0];
  if (!block) throw new Error(`the ${label} region did not match — the selector went stale`);
  return [...new Set([...block.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]))];
}

for (const { label, home } of LOCALES) {
  for (const [region, pattern] of Object.entries(REGIONS)) {
    test(`every ${region} link on the ${label} header resolves to a built page`, () => {
      const html = readFileSync(home, 'utf8');
      const hrefs = internalHrefs(html, pattern, region);

      // Floor, not an inventory: a class rename would make the match above
      // throw, but a narrower regex drift could still return an empty array
      // and let the assertion below pass on nothing.
      expect(hrefs.length, `no internal links found in the ${label} ${region}`).toBeGreaterThan(5);

      const missing = hrefs.filter((href) => !existsSync(join(DIST, href, 'index.html')));
      expect(missing, `${label} ${region} links to routes the build never produced:\n${missing.join('\n')}`).toEqual(
        [],
      );
    });
  }
}
