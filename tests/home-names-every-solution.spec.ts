import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * The home page must name every solution the menu offers.
 *
 * WVF-06 argued that "a page that exists and is not linked is still not on the
 * site", and used that to take the header and footer from five entries to
 * seven. The home page was never checked against the same standard: it kept a
 * hand-written index of sixteen capabilities that nobody had to keep in sync,
 * so `/solutions/deliveries/` and `/solutions/ads/` shipped to production
 * reachable from the menu and the footer and absent from the body of the most
 * visited page on the site.
 *
 * Nothing was red. The pages existed, the menu linked them, the sitemap listed
 * them, every gate passed — the home index is just a different array, and no
 * test related the two.
 *
 * The invariant is one-directional on purpose: everything the menu offers has
 * to appear on the home, but the home may name things the menu does not (it
 * indexes capabilities that have no page of their own, like Webhooks or
 * Activity Logs, which is the whole point of that section).
 *
 * Header and footer are stripped before looking: they are present on every
 * page, so counting them would make this pass by construction — the question
 * is whether the BODY names them.
 */

const DIST = 'dist';

const LOCALES = [
  { label: 'en', home: join(DIST, 'index.html'), prefix: '' },
  { label: 'es', home: join(DIST, 'es', 'index.html'), prefix: '/es' },
];

/** Solution destinations the header offers, minus the `/solutions/` catch-all. */
function menuDestinations(html: string, prefix: string): string[] {
  const nav = html.match(/<nav class="site-header__nav"[\s\S]*?<\/nav>/)?.[0];
  if (!nav) throw new Error('the header nav did not match — the selector went stale');
  const hrefs = [...new Set([...nav.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]))];
  return hrefs.filter(
    (h) =>
      (h.startsWith(`${prefix}/solutions/`) || h === `${prefix}/payments-invoicing/`) &&
      h.replace(/\/$/, '') !== `${prefix}/solutions`,
  );
}

function bodyLinks(html: string): Set<string> {
  const body = html
    .replace(/<header[\s>][\s\S]*?<\/header>/g, '')
    .replace(/<footer[\s>][\s\S]*?<\/footer>/g, '');
  return new Set([...body.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]));
}

for (const { label, home, prefix } of LOCALES) {
  test(`the ${label} home page names every solution the menu offers`, () => {
    const html = readFileSync(home, 'utf8');
    const destinations = menuDestinations(html, prefix);

    // Floor. A prefix typo or a renamed nav class would yield an empty list,
    // and "0 missing" over 0 destinations reads exactly like a healthy page.
    expect(
      destinations.length,
      `no solution destinations found in the ${label} header — the selector or the prefix went stale`,
    ).toBeGreaterThanOrEqual(7);

    const linked = bodyLinks(html);
    const missing = destinations.filter((d) => !linked.has(d));

    expect(
      missing,
      `the ${label} home page offers these in its menu but never names them in its body:\n${missing.join('\n')}`,
    ).toEqual([]);
  });
}
