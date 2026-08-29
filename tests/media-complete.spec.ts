import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { MEDIA_SLOTS } from '../src/components/home/media-slots';

/**
 * The media contract (LMW-11 CA-3): every declared hole either has a product
 * capture or renders its labelled placeholder — visibly unfinished, never
 * silently absent. `MEDIA_REQUIRED=1 npm test` is how the pre-merge run
 * demands zero placeholders; without it this reports and passes.
 */

test('every produced file names a declared slot, and placeholders are counted honestly', () => {
  const produced = readdirSync('src/assets/product')
    .filter((f) => /\.(webp|png|jpe?g|avif)$/i.test(f))
    .map((f) => f.replace(/\.[a-z0-9]+$/i, ''));
  const declared = new Set(MEDIA_SLOTS.map((s) => s.id));

  const strays = produced.filter((p) => !declared.has(p));
  expect(strays, `files that name no declared slot: ${strays.join(', ')}`).toEqual([]);

  const missing = MEDIA_SLOTS.filter((s) => !produced.includes(s.id)).map((s) => s.id);

  // The built page must SHOW the gap: one labelled placeholder per missing
  // slot, in each language tree.
  for (const file of ['dist/index.html', 'dist/es/index.html']) {
    const html = readFileSync(file, 'utf8');
    const rendered = new Set([...html.matchAll(/data-placeholder="([^"]+)"/g)].map((m) => m[1]));
    for (const slot of missing) {
      expect(rendered.has(slot), `${file}: missing slot ${slot} renders no placeholder`).toBe(true);
    }
  }

  if (process.env.MEDIA_REQUIRED === '1') {
    expect(missing, `slots still on placeholders:\n${missing.join('\n')}`).toEqual([]);
  } else if (missing.length > 0) {
    console.log(`media: ${missing.length}/${MEDIA_SLOTS.length} slots still render placeholders`);
  }
});
