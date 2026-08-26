import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';

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
 * page. Measured over the whole built tree at the time of writing: 0 hits.
 *
 * Header and footer are stripped first: they legitimately repeat their own
 * links on every page, and a nav item is not what this is about.
 */

const DIST = 'dist';
const MIN_LENGTH = 60;

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

test('no page renders the same paragraph twice', () => {
  const offences: string[] = [];
  let inspected = 0;

  for (const file of pagesUnder(DIST)) {
    let html = readFileSync(file, 'utf8');
    html = html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/g, '');
    html = html.replace(/<(header|footer)\b[\s\S]*?<\/\1>/g, '');

    const counts = new Map<string, number>();
    for (const m of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
      const text = decode(m[1]);
      if (text.length < MIN_LENGTH) continue;
      inspected++;
      counts.set(text, (counts.get(text) ?? 0) + 1);
    }

    for (const [text, n] of counts) {
      if (n > 1) {
        offences.push(`${relative(DIST, file)} — x${n}: ${text.slice(0, 120)}`);
      }
    }
  }

  // Floor. A selector that stopped matching would report "0 repeated" forever,
  // which reads exactly like a healthy site.
  expect(inspected, 'no paragraph long enough to inspect — the selector stopped matching')
    .toBeGreaterThan(200);

  expect(offences, `paragraphs rendered twice on the same page:\n${offences.join('\n')}`)
    .toEqual([]);
});
