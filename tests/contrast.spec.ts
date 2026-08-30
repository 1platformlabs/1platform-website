import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

function tokenValue(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!match) throw new Error(`token ${name} not found in global.css`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((left, right) => right - left);
  return (high + 0.05) / (low + 0.05);
}

const css = readFileSync('src/styles/global.css', 'utf8');
const pairs: [string, string, string][] = [
  ['--ink', '--paper', 'reading text on the primary paper surface'],
  ['--muted', '--paper', 'supporting copy on paper'],
  ['--surface', '--cobalt', 'primary CTA text'],
  ['--color-footer-text', '--color-footer', 'footer headline and controls'],
  ['--color-footer-muted', '--color-footer', 'footer links and support copy'],
  ['--ink', '--cobalt-bright', 'footer CTA text'],
];

test('the editorial token pairs meet the AA contrast floor', () => {
  const failures = pairs
    .map(([foreground, background, label]) => ({ foreground, background, label, value: contrast(tokenValue(css, foreground), tokenValue(css, background)) }))
    .filter(({ value }) => value < 4.5)
    .map(({ foreground, background, label, value }) => `${label}: ${foreground} on ${background} = ${value.toFixed(2)}`);
  expect(failures, failures.join('\n')).toEqual([]);
});
