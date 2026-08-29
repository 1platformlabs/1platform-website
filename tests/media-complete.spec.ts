import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { MEDIA_SLOTS, SHOWCASE_BACKGROUND_IDS } from '../src/components/home/media-slots';

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

test('editorial showcase backgrounds have generated provenance and matching WebP bytes', async () => {
  const provenance = JSON.parse(
    readFileSync('src/assets/product/showcase-editorial-provenance.json', 'utf8'),
  ) as {
    revision: string;
    assets: Record<string, { generation_ids: string[]; canonical_prompt: string }>;
  };
  const manifest = JSON.parse(readFileSync('src/assets/product/media-manifest.json', 'utf8')) as Array<{
    slot: string;
    file: string;
    source_url: string;
    prompt_revision: string;
    provenance_ref: string;
    sha256: string;
    width: number;
    height: number;
  }>;

  for (const id of SHOWCASE_BACKGROUND_IDS) {
    const entry = manifest.find((candidate) => candidate.slot === id);
    expect(entry, `${id}: missing manifest entry`).toBeDefined();
    expect(entry!.source_url).toMatch(/^generated:\/\/1platform\/editorial\/[a-z-]+$/);
    expect(entry!.prompt_revision).toBe(provenance.revision);
    expect(entry!.provenance_ref).toBe(`showcase-editorial-provenance.json#${id.slice(9, -3)}`);
    const prompt = provenance.assets[id.slice(9, -3)];
    expect(prompt.generation_ids.length).toBeGreaterThan(0);
    expect(prompt.canonical_prompt.length).toBeGreaterThan(40);
    expect([entry!.width, entry!.height]).toEqual([2880, 1800]);

    const bytes = readFileSync(`src/assets/product/${entry!.file}`);
    expect(createHash('sha256').update(bytes).digest('hex'), `${id}: stale manifest hash`).toBe(
      entry!.sha256,
    );
    const metadata = await sharp(bytes).metadata();
    expect(metadata.format, `${id}: wrong image format`).toBe('webp');
    expect([metadata.width, metadata.height], `${id}: wrong intrinsic dimensions`).toEqual([
      entry!.width,
      entry!.height,
    ]);
    expect(metadata.hasAlpha, `${id}: unexpected alpha channel`).toBe(false);
  }
});

test('the OCR gate keeps its cache ignored and never prints a matched private value', () => {
  const script = readFileSync('scripts/capture-product-media.mjs', 'utf8');
  expect(script).toContain("const OCR_CACHE = join(ROOT, 'node_modules/.cache/tesseract')");
  expect(script).toContain('cachePath: OCR_CACHE');
  expect(script).not.toContain('${p[0]}');
  expect(script).not.toContain('${m[0]}');
});
