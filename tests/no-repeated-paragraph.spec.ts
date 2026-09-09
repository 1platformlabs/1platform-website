import { expect, test } from '@playwright/test';

import { publishedPages } from './helpers/served';

/**
 * No page may render the same paragraph twice.
 *
 * The failure this catches is a wiring slip, not a writing one: a block that
 * calls `t()` on a NEIGHBOUR block's key. Everything downstream stays green —
 * the key exists, so `t()` does not throw; the catalogue tests still see every
 * key used and every use resolved; `astro check` sees valid TSX; the build
 * emits a page. The only symptom is a reader being told the same thing twice
 * on one screen, and nothing in this repo was looking at that.
 *
 * It happened on `/solutions/ads/`: the note beside "Switched on per workspace"
 * rendered `solutions-ads.next.desc`, so the call-to-action's sentence appeared
 * both in the availability section and, verbatim, in the closing call to action.
 *
 * The 60-character floor keeps this away from legitimate repetition — a
 * comparison table's "1Platform:" labels, a repeated eyebrow, a two-word cue.
 * Sentences that long are prose, and prose has no reason to appear twice on one
 * page. Measured over the whole served site at the time of writing: 0 hits.
 *
 * Header and footer are stripped first: they legitimately repeat their own
 * links on every page, and a nav item is not what this is about.
 *
 * WHY IT NOW READS THE SERVED SITE — AND WHY THIS SPEC IN PARTICULAR
 * ------------------------------------------------------------------
 * This file used to walk `dist/` for `index.html`. That was honest while every
 * page was a file. Under the Node adapter the build emits `dist/client` (assets
 * plus the seventeen still-prerendered blog pages) and `dist/server` (the code
 * that renders everything else on demand), so most pages are not files at all.
 *
 * This spec is the suite's clearest specimen of the failure the whole migration
 * exists to prevent, and it is worth stating plainly because it was MEASURED,
 * not feared: the disk walk found 98 pages on `origin/main` and 16 under the
 * adapter, and the test STAYED GREEN. It did not lose its subject loudly; it
 * lost nine tenths of it silently, kept asserting over the blog, and kept
 * reporting health. A guard that can only inspect what happens to be left on
 * disk is a guard that stops guarding without ever saying so.
 *
 * The old floor did not catch it either, and the reason is the general lesson:
 * it counted the wrong UNIT. `expect(inspected).toBeGreaterThan(200)` counted
 * PARAGRAPHS, while the thing that shrank was PAGES — the blog posts carry
 * plenty of long prose, so the floor sailed through a 3x loss of coverage.
 * Measured on the served site while rewriting this: the blog pages alone yield
 * 327 qualifying paragraphs against the whole site's 825, so the old floor of
 * 200 cleared comfortably on the remains. Both units are floored below now, and
 * the page floor is the load-bearing one.
 *
 * Pages therefore come from `publishedPages()`, which enumerates the served
 * sitemap and fetches each page over HTTP from the same process production
 * runs. What we assert about is what a reader actually receives.
 */

/** Prose, not labels: a repeated string this long is a wiring slip, never copy. */
const MIN_LENGTH = 60;

/**
 * Two floors, because two different things can silently empty this test.
 *
 * PAGES is the one that was missing. `publishedRoutes()` already refuses an
 * enumeration under 40, but this spec asserts its own so the failure names the
 * unit that broke here: if the page set ever collapses to the handful that
 * happen to be prerendered — the exact 98 -> 16 regression above — this test
 * fails instead of passing over the remains.
 *
 * PARAGRAPHS is the original floor, kept at its original value. It guards the
 * other end: pages that load but whose `<p>` extraction stopped matching.
 * Measured against the frozen baseline: 52 pages, 825 qualifying paragraphs.
 */
const MIN_PAGES = 40;
const MIN_PARAGRAPHS = 200;

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Drop the parts of a page that are not prose, for TEXT EXTRACTION.
 *
 * ⚠️ THIS IS NOT SANITISATION and must never be reused as such. It runs over
 * HTML this very suite just rendered, and its only job is to stop the shared
 * chrome from counting as a repeated paragraph. Nothing here is written back to
 * a page or shown to anybody.
 *
 * It repeats each pass until the string stops changing, and that is not
 * defensive dressing: a single non-greedy pass leaves the outer element of a
 * NESTED pair behind (`<header>…<header>…</header>…</header>` loses the inner
 * one and keeps the outer). CodeQL flagged exactly that shape, and while the
 * input here is our own markup rather than an attacker's, the incompleteness
 * was real — it would have let chrome through and inflated a count.
 */
function withoutChrome(raw: string): string {
  const passes = [
    /<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,
    /<(header|footer)\b[\s\S]*?<\/\1>/gi,
  ];
  let html = raw;
  for (const pass of passes) {
    let previous: string;
    do {
      previous = html;
      html = html.replace(pass, '');
    } while (html !== previous);
  }
  return html;
}

test('no page renders the same paragraph twice', async () => {
  const offences: string[] = [];
  let inspected = 0;

  // Fetched inside the test, not at module scope: module scope is evaluated
  // before Playwright has started the server, so there would be nothing to ask.
  const pages = await publishedPages();

  for (const { route, html: raw } of pages) {
    const html = withoutChrome(raw);

    const counts = new Map<string, number>();
    for (const m of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
      const text = decode(m[1]);
      if (text.length < MIN_LENGTH) continue;
      inspected++;
      counts.set(text, (counts.get(text) ?? 0) + 1);
    }

    for (const [text, n] of counts) {
      if (n > 1) {
        offences.push(`${route} — x${n}: ${text.slice(0, 120)}`);
      }
    }
  }

  // Floors first. An enumeration that shrank, or a selector that stopped
  // matching, would both report "0 repeated" forever — which reads exactly like
  // a healthy site. A broken probe is not a pass.
  expect(
    pages.length,
    `only ${pages.length} pages were enumerated, below the floor of ${MIN_PAGES}. ` +
      `That is a broken enumeration, not a smaller site: this test would then be ` +
      `checking a corner of the site and reporting on all of it.`,
  ).toBeGreaterThanOrEqual(MIN_PAGES);

  expect(
    inspected,
    `only ${inspected} paragraphs of ${MIN_LENGTH}+ characters were found across ` +
      `${pages.length} pages, below the floor of ${MIN_PARAGRAPHS} — the <p> ` +
      `extraction stopped matching, so nothing was really compared.`,
  ).toBeGreaterThan(MIN_PARAGRAPHS);

  expect(offences, `paragraphs rendered twice on the same page:\n${offences.join('\n')}`)
    .toEqual([]);
});
