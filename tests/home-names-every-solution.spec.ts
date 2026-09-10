import { expect, test } from '@playwright/test';
import { publishedRoutes, servedHtml } from './helpers/served';
import { translateToEs } from '../src/i18n/routes';

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
 *
 * WHERE THE HOME PAGE COMES FROM NOW
 * ----------------------------------
 * This spec used to read `dist/index.html` and `dist/es/index.html`, and that
 * was the honest thing to do while the build wrote every page to disk: the file
 * it opened was byte-for-byte the file production served. The Node adapter
 * ended that. `dist/` is now `dist/client` (assets plus the few prerendered
 * pages) and `dist/server` (the code that renders the rest on demand), and the
 * two home pages are rendered on demand — they are not files at all any more.
 *
 * So the subject moved to the served HTML, which is strictly closer to what a
 * visitor gets: the same adapter, the same render path production runs. The
 * assertion is unchanged. What it means is unchanged. Only the fetch changed,
 * and with it these callbacks became async.
 */

const LOCALES = [
  { label: 'en' as const, home: '/' },
  { label: 'es' as const, home: '/es/' },
];

/**
  * Solution destinations the header offers, minus the section index itself.
  *
  * The roots are asked of the route map rather than built as `${prefix}` plus
  * the English path: under /es/ they are `/es/soluciones/` and
  * `/es/pagos-y-facturacion/`, and a filter that kept concatenating would match
  * nothing at all — which reads as "the menu offers no solutions" and passes
  * every assertion below by finding nothing to check.
  */
function menuDestinations(html: string, locale: 'en' | 'es'): string[] {
  const nav = html.match(/<nav class="site-header__nav"[\s\S]*?<\/nav>/)?.[0];
  if (!nav) throw new Error('the header nav did not match — the selector went stale');
  const at = (path: string) => (locale === 'en' ? path : translateToEs(path));
  const section = at('/solutions/');
  const payments = at('/payments-invoicing/');
  const hrefs = [...new Set([...nav.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]))];
  return hrefs.filter(
    (h) => (h.startsWith(section) || h === payments) && h !== section,
  );
}

function bodyLinks(html: string): Set<string> {
  const body = html
    .replace(/<header[\s>][\s\S]*?<\/header>/g, '')
    .replace(/<footer[\s>][\s\S]*?<\/footer>/g, '');
  return new Set([...body.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]));
}

for (const { label, home } of LOCALES) {
  test(`the ${label} home page names every solution the menu offers`, async () => {
    // The home used to be a path on disk, and opening a file that had been
    // deleted was its own alarm. Fetching one is not: the enumeration has to
    // say out loud that this locale still publishes a home, or a locale that
    // silently stopped being built would leave this test asserting about
    // whatever the server happened to answer with. `publishedRoutes` reads the
    // served sitemap and carries its own floor, so this is a membership check
    // on a list that is already known to be plausible.
    const routes = await publishedRoutes();
    expect(
      routes,
      `the served sitemap does not list ${home} — the ${label} home is not published, ` +
        `so there is nothing here to hold to the menu's standard`,
    ).toContain(home);

    // Throws on any non-200, so a home that 404s or redirects fails here rather
    // than quietly handing an error page to the parsers below.
    const html = await servedHtml(home);
    const destinations = menuDestinations(html, label);

    // Floor, not an inventory. A prefix typo or a renamed nav class would yield
    // an empty list, and "0 missing" over 0 destinations reads exactly like a
    // healthy page. It was 7 while the menu offered seven solutions; the
    // whitelabel dashboard then left the menu — it is resold by agencies, not
    // bought by merchants — so a healthy build now finds 6 and the old floor
    // failed for the wrong reason, blaming the selector for an editorial
    // decision. Kept clear of the real number so a stale selector still reports
    // ~0 and still goes red.
    expect(
      destinations.length,
      `no solution destinations found in the ${label} header — the selector or the prefix went stale`,
    ).toBeGreaterThanOrEqual(4);

    const linked = bodyLinks(html);
    const missing = destinations.filter((d) => !linked.has(d));

    expect(
      missing,
      `the ${label} home page offers these in its menu but never names them in its body:\n${missing.join('\n')}`,
    ).toEqual([]);
  });
}
