import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { readdirSync, statSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * Every `og:image` a page advertises has to be a file that shipped.
 *
 * Nothing in this repo looked at the assets under `public/` until now. The
 * failure mode is silent in both directions: a page that names an image the
 * build never copied serves a 404 to every social network that asks for it,
 * and a page that omits the property falls back to a generic card. Neither
 * shows up in the build, in `astro check`, or in any other test — the URL is
 * just a string in a `<meta>` tag until something outside the site fetches it.
 */

const DIST = 'dist';
const SITE = 'https://1platform.pro';

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

test('every og:image a built page declares exists in dist', () => {
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const file of pagesUnder(DIST)) {
    const html = readFileSync(file, 'utf8');
    for (const m of html.matchAll(/property="og:image"\s+content="([^"]+)"/g)) {
      const url = m[1];
      seen.add(url);
      const path = url.startsWith(SITE) ? url.slice(SITE.length) : url;
      if (!path.startsWith('/')) continue; // absolute foreign URL: not ours to check
      if (!existsSync(join(DIST, path))) {
        missing.push(`${relative(DIST, file)} -> ${url}`);
      }
    }
  }

  // Floor. A selector that stops matching would report "0 broken" forever,
  // which is the same output as a healthy site.
  expect(seen.size, 'no og:image found at all — the selector stopped matching')
    .toBeGreaterThan(5);

  expect(missing, `og:image files that do not exist:\n${missing.join('\n')}`).toEqual([]);
});
