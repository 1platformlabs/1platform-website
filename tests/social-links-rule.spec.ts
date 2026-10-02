import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { normalizeSocialLink, socialLinkProblem, socialLinksOf, SOCIAL_NETWORKS } from '../src/lib/social-links';

/**
 * T-19 — the site's copy of the social-link rule answers what the API answers.
 *
 * `tests/fixtures/social_link_vectors.json` is copied verbatim from
 * 1platform-api, where `scripts/dump_social_link_vectors.py` writes it by
 * RUNNING the server's function. Same reason, same normalised URL, or red.
 * (A Playwright spec because this repository runs Playwright and nothing else.)
 */

type Vector = { network: unknown; href: unknown; problem: string | null; normalized: string | null };
const vectors = JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/social_link_vectors.json'), 'utf8')) as Vector[];

test('the vectors are a real sample of both outcomes', () => {
  expect(vectors.filter((v) => v.problem === null).length).toBeGreaterThanOrEqual(10);
  expect(vectors.filter((v) => v.problem !== null).length).toBeGreaterThanOrEqual(30);
});

for (const [index, vector] of vectors.entries()) {
  test(`vector ${index}: ${String(vector.network)} ${String(vector.href).slice(0, 60)}`, () => {
    expect(socialLinkProblem(vector.network, vector.href)).toBe(vector.problem);
    if (vector.problem === null) {
      expect(normalizeSocialLink(vector.href as string)).toBe(vector.normalized);
    }
  });
}

test('socialLinksOf is total and keeps render order', () => {
  for (const raw of [undefined, null, 'x', 123, [], ['a'], true]) {
    expect(socialLinksOf({ social_links: raw })).toEqual([]);
  }
  expect(socialLinksOf(null)).toEqual([]);
  const links = socialLinksOf({
    social_links: { x: 'https://x.com/a', instagram: 'HTTPS://WWW.Instagram.com/a', facebook: 'https://l.facebook.com/l.php', other: 'https://x.com/b' },
  });
  expect(links.map((l) => [l.code, l.href])).toEqual([
    [SOCIAL_NETWORKS.indexOf('instagram'), 'https://www.instagram.com/a'],
    [SOCIAL_NETWORKS.indexOf('x'), 'https://x.com/a'],
  ]);
});
