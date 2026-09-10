import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { CLIENT_DIR, publishedPages } from './helpers/served';
import { getWithHost } from './helpers/http-host';

/**
 * Every `og:image` a page advertises has to be a file that shipped.
 *
 * Nothing in this repo looked at the assets under `public/` until now. The
 * failure mode is silent in both directions: a page that names an image the
 * build never copied serves a 404 to every social network that asks for it,
 * and a page that omits the property falls back to a generic card. Neither
 * shows up in the build, in `astro check`, or in any other test — the URL is
 * just a string in a `<meta>` tag until something outside the site fetches it.
 *
 * WHY THIS SPEC READS TWO DIFFERENT PLACES
 * ----------------------------------------
 * This assertion has two halves, and the Node adapter moved only one of them.
 *
 * The DECLARATION half used to be read off disk, and the justification was
 * that `dist/<route>/index.html` was byte-for-byte the artefact production
 * served. That stopped being true: the build now emits `dist/client` (assets
 * plus the handful of still-prerendered blog pages) and `dist/server` (the code
 * that renders everything else on demand). A page is no longer a file, so
 * walking `dist/` no longer finds pages — and the dangerous part is that it
 * does not fail, it just finds fewer. Pointed at `dist/client` this walk would
 * have inspected 16 pages instead of the 98 it used to, reported "0 broken",
 * and stayed green. So the declarations are now read from the SERVED HTML, via
 * the sitemap, which is generated from the real route table and therefore
 * cannot silently shrink to whatever happens to be prerendered.
 *
 * The EXISTENCE half did not move, and should not. What it asks is whether a
 * file shipped in the build output, and that is still literally a file: the OG
 * cards are static assets copied from `public/`, so they live under
 * `dist/client/og/`. Turning this into an HTTP HEAD for symmetry would test the
 * adapter's static-file middleware instead of the question the spec is asking.
 * Only the path prefix changed — `dist` became `dist/client`, which is where
 * the same bytes are now written.
 */

const SITE = 'https://1platform.pro';

/**
 * The declaring pages are a NARROWER set than "every published page", so they
 * carry their own floor. The route enumeration already floors at 40 inside the
 * helper; that floor cannot see this one shrinking, which is exactly the
 * near-miss this suite is guarding against — a floor that counts the wrong
 * unit. Measured against the frozen F0 baseline: 52 of the 98 built HTML files
 * declared an `og:image`, and those 52 are precisely the real pages (the other
 * 46 were redirect stubs, which the sitemap does not list at all).
 */
const MIN_PAGES_DECLARING_OG = 40;

test('every og:image a served page declares exists in the build output', async () => {
  const missing: string[] = [];
  const seen = new Set<string>();
  let pagesDeclaring = 0;

  // Computed inside the test, not at module scope: reading a page is a fetch
  // now, and module scope runs before Playwright has started the server.
  const pages = await publishedPages();

  for (const { route, html } of pages) {
    let declaredHere = false;
    for (const m of html.matchAll(/property="og:image"\s+content="([^"]+)"/g)) {
      const url = m[1];
      seen.add(url);
      declaredHere = true;
      const path = url.startsWith(SITE) ? url.slice(SITE.length) : url;
      if (!path.startsWith('/')) continue; // absolute foreign URL: not ours to check
      if (!existsSync(join(CLIENT_DIR, path))) {
        missing.push(`${route} -> ${url}`);
      }
    }
    if (declaredHere) pagesDeclaring += 1;
  }

  // Floors. A selector that stops matching, or an enumeration that collapses to
  // the few prerendered pages, would report "0 broken" forever — which is the
  // same output as a healthy site. Both units get counted, because they fail
  // independently: the page count catches a shrunken probe, the URL count
  // catches a `<meta>` shape this regex no longer recognises.
  expect(
    pagesDeclaring,
    `only ${pagesDeclaring} served pages declared an og:image, below the floor of ` +
      `${MIN_PAGES_DECLARING_OG}. A broken probe is not a pass: with too few pages ` +
      `enumerated, "every og:image exists" is true vacuously.`,
  ).toBeGreaterThanOrEqual(MIN_PAGES_DECLARING_OG);

  expect(seen.size, 'no og:image found at all — the selector stopped matching')
    .toBeGreaterThan(5);

  expect(missing, `og:image files that do not exist:\n${missing.join('\n')}`).toEqual([]);
});

test('a tenant-derived og:image is accepted only when its route is actually servable', async () => {
  const port = Number(process.env.PLAYWRIGHT_PORT ?? 4321)
  const html = await getWithHost(`http://127.0.0.1:${port}/`, 'clinicas.1platform.dev')
  expect(html.status).toBe(200)
  const image = html.body.match(/property="og:image"\s+content="([^"]+)"/)?.[1]
  expect(image, 'the derived tenant head must declare an OG route').toBe(
    'https://clinicas.1platform.dev/brand/social.png',
  )

  const asset = await getWithHost(`http://127.0.0.1:${port}/brand/social.png`, 'clinicas.1platform.dev')
  expect(asset.status, 'a route named in an og:image must be retrievable by a crawler').toBe(200)
  expect(asset.headers['content-type']).toContain('image/png')
})
