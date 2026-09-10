import { expect, test } from '@playwright/test';
import { servedHead, servedHtml } from './helpers/served';

/**
 * Every internal link the header offers must resolve to a page a visitor can
 * actually reach.
 *
 * `home-names-every-solution.spec.ts` already ties the menu to the home page's
 * body copy, and `i18n-build.spec.ts` ties the English tree to its Spanish
 * counterpart — but nothing walked the header itself and confirmed each
 * `href` it emits is a real address. That gap is exactly the shape of issue
 * #199 (1platform-content-ai): a QA crawl reported the Spanish nav 404ing on
 * its own links. It did not reproduce against a live build — every reported
 * path existed — but nothing would have caught it here if it had, which is the
 * point of this guard.
 *
 * WHY THIS READS THE SERVER AND NOT `dist/`
 * -----------------------------------------
 * This spec used to read `dist/index.html` and answer "does this link resolve?"
 * with `existsSync(join('dist', href, 'index.html'))`. That was honest while
 * every page was a file. With the Node adapter it is not: the build emits
 * `dist/client` (assets plus the handful of still-prerendered pages) and
 * `dist/server` (the code that renders everything else), so most routes have no
 * file to stat. Left pointed at disk this guard would not merely break — the
 * `missing` filter would report every nav link as missing, and repointing it at
 * `dist/client` would be worse, because it would quietly go green while proving
 * nothing about the ~17 links it is here to protect.
 *
 * So both halves moved to the server: the header markup comes from the home
 * page as it is SERVED, and "resolves" is now the HTTP question it always
 * really was.
 *
 * WHY A 301 STILL COUNTS AS RESOLVING
 * -----------------------------------
 * This is not a relaxation, it is the same rule restated for a server. The
 * static build emitted every configured redirect as a `dist/<route>/index.html`
 * meta-refresh stub — 46 of them, measured against the frozen baseline — so the
 * old `existsSync` returned true for a redirected route just as it did for a
 * real one. Refusing redirects here would make the guard stricter than the one
 * it replaces and would fail the moment a nav item is pointed at an aliased
 * path, which is a legitimate state this site has been in.
 *
 * What we do NOT inherit is the old check's blind spot: a meta-refresh stub
 * existing on disk said nothing about whether its target existed, so the old
 * spec would have passed a nav link redirecting into a 404. Here the redirect
 * is followed and the chain must END in a 200. Strictly more than before, and
 * that direction is the only one the rewrite is allowed to move in.
 *
 * Desktop rail and mobile menu are checked separately even though they render
 * the same `navItems` array, because a future edit could touch one markup
 * block without the other going stale in the same way.
 */

const LOCALES = [
  { label: 'en', home: '/' },
  { label: 'es', home: '/es/' },
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

/**
 * Follow one link the way a browser would and report where it ended up.
 *
 * `served.ts` deliberately does not chase redirects — `servedHtml` throws on a
 * non-200 precisely so a spec asserting about a page cannot be handed a
 * redirect body by accident. That is the right default for every other spec and
 * the wrong one for this one, whose entire subject is "where does this href
 * end up", so the hop-following lives here rather than in the shared helper.
 *
 * The hop cap is what turns a redirect LOOP into a failure instead of a hang;
 * a loop is a link that resolves nowhere, which is exactly what this guard is
 * for.
 */
const MAX_HOPS = 5;

async function resolveLink(href: string): Promise<{ ok: boolean; trail: string }> {
  let path = href;
  const hops: string[] = [href];

  for (let i = 0; i <= MAX_HOPS; i++) {
    const { status, location } = await servedHead(path);

    if (status === 200) return { ok: true, trail: hops.join(' -> ') };

    if (status === 301 || status === 302 || status === 307 || status === 308) {
      if (!location) {
        return { ok: false, trail: `${hops.join(' -> ')} -> ${status} with no Location header` };
      }
      // A Location may be absolute or root-relative; both reduce to a path we
      // can ask the same server for again.
      const next = new URL(location, 'http://localhost').pathname;
      hops.push(`${status} ${next}`);
      path = next;
      continue;
    }

    return { ok: false, trail: `${hops.join(' -> ')} -> ${status}` };
  }

  return { ok: false, trail: `${hops.join(' -> ')} (redirect chain longer than ${MAX_HOPS} hops)` };
}

for (const { label, home } of LOCALES) {
  for (const [region, pattern] of Object.entries(REGIONS)) {
    test(`every ${region} link on the ${label} header resolves to a served page`, async () => {
      // Fetched inside the test, not at module scope: module scope runs before
      // Playwright has started the server, so there would be nothing to ask.
      const html = await servedHtml(home);
      const hrefs = internalHrefs(html, pattern, region);

      // Floor, not an inventory, and it counts the unit the loop below iterates:
      // LINKS. A class rename would make the match above throw, but a narrower
      // regex drift could still return an empty array and let the assertion
      // below pass on nothing. A probe that finds no links is broken, not proof
      // that the header is sound.
      expect(
        hrefs.length,
        `no internal links found in the ${label} ${region} — a probe that enumerates ` +
          `nothing is a broken probe, not a pass`,
      ).toBeGreaterThan(5);

      // Sequential on purpose. `served.ts` sends `Connection: close`, so every
      // request is its own socket; firing all four tests' links at once made the
      // adapter reset connections (ECONNRESET) and a transport error would read
      // as "this link does not resolve", which is a false accusation, not a
      // finding. There are under ten links per region — nothing to parallelise
      // for.
      const unresolved: string[] = [];
      for (const href of hrefs) {
        const { ok, trail } = await resolveLink(href);
        if (!ok) unresolved.push(trail);
      }

      expect(
        unresolved,
        `${label} ${region} links to routes the server does not answer with a page:\n${unresolved.join('\n')}`,
      ).toEqual([]);
    });
  }
}
