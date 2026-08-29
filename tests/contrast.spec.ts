import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * The AA arithmetic behind D-6, pinned to the exact hexes (LMW-01 CA-6): the
 * two tints that deliberately diverge from the reference exist ONLY because
 * these ratios clear 4.5 where the measured originals did not (3.46 and
 * 2.54). If someone "restores" the reference values, this is the test that
 * says why they were changed.
 */

function tokenValue(css: string, name: string): string {
  const m = css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`token ${name} not found in global.css`);
  return m[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const css = readFileSync('src/styles/global.css', 'utf8');

const PAIRS: [string, string, number, string][] = [
  ['--ref-white', '--ref-orange-cta', 4.5, 'light CTA text on the AA orange (the reference’s exact orange measures 3.46)'],
  ['--ref-fg-dim', '--ref-card-dark', 4.5, 'footer links on the card (the reference’s gray measures 2.54)'],
  ['--ref-fg-dim', '--ref-pill', 4.5, 'dim text on the pill surface'],
  ['--ref-ink', '--ref-yellow', 4.5, 'ink on the yellow CTA'],
  ['--ref-ink', '--ref-canvas', 4.5, 'ink on the light canvas'],
  ['--ref-white', '--ref-dark', 4.5, 'light text on the dark band'],
  ['--ref-white', '--ref-dark-2', 4.5, 'light text on the darkest band'],
  ['--ref-ink', '--ref-white', 4.5, 'ink on card surfaces'],
  ['--ref-ink', '--ref-gray', 4.5, 'ink on the enterprise card'],
];

test('every text/surface pair of the home system clears AA, pinned to the hexes', () => {
  // The two deliberate divergences stay divergent: this is what stops a
  // well-meaning "restore the reference value" commit.
  expect(tokenValue(css, '--ref-orange-cta')).toBe('#C63A12');
  expect(tokenValue(css, '--ref-fg-dim')).toBe('#9A9A9A');
  expect(tokenValue(css, '--ref-orange')).toBe('#F04E23');

  const failures: string[] = [];
  for (const [fg, bg, min, why] of PAIRS) {
    const r = ratio(tokenValue(css, fg), tokenValue(css, bg));
    if (r < min) failures.push(`${fg} on ${bg} = ${r.toFixed(2)} < ${min} (${why})`);
  }
  expect(failures, failures.join('\n')).toEqual([]);

  // Control: the pair D-6 exists to prevent MUST fail if measured raw.
  expect(ratio(tokenValue(css, '--ref-white'), tokenValue(css, '--ref-orange'))).toBeLessThan(4.5);
});
