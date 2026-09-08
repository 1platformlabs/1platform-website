import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { MEDIA_SLOTS, SHOWCASE_BACKGROUND_IDS } from '../src/components/home/media-slots';
import { servedHtml } from './helpers/served';

/**
 * The media contract (LMW-11 CA-3): every declared hole either has a product
 * capture or renders its labelled placeholder — visibly unfinished, never
 * silently absent. `MEDIA_REQUIRED=1 npm test` is how the pre-merge run
 * demands zero placeholders; without it this reports and passes.
 *
 * This spec straddles two worlds on purpose, and the split is not cosmetic:
 *
 *   - The PRODUCED FILES are still files. They live in `src/assets/product/`,
 *     go into the build through `astro:assets`, and are checked on disk exactly
 *     as before — the source tree is the thing that declares what was captured,
 *     and nothing about the Node adapter changed that.
 *
 *   - The RENDERED PAGE is no longer a file. This used to read
 *     `dist/index.html` and `dist/es/index.html`, which was honest while the
 *     build wrote every route to disk: the HTML on disk was byte-for-byte the
 *     HTML a visitor got. With the Node adapter the home page is rendered on
 *     demand out of `dist/server`, so those two paths simply do not exist any
 *     more. Repointing them at `dist/client` would be worse than failing: the
 *     home page is not prerendered there, so the read would either throw or —
 *     once someone "fixed" it with a fallback — inspect nothing and pass. The
 *     page half therefore asks the server, which is where the page now exists.
 */

test('every produced file names a declared slot, and placeholders are counted honestly', async () => {
  const produced = readdirSync('src/assets/product')
    .filter((f) => /\.(webp|png|jpe?g|avif)$/i.test(f))
    .map((f) => f.replace(/\.[a-z0-9]+$/i, ''));
  const declared = new Set(MEDIA_SLOTS.map((s) => s.id));

  // Both sides of the comparison are enumerations, and an enumeration that
  // comes back empty turns every check below into a no-op that reports success:
  // with no produced files there are no strays, and with no declared slots
  // nothing can be a stray either. Neither emptiness is a smaller site — it is
  // a broken probe, and it has to be loud.
  expect(
    produced.length,
    'no produced media files were found in src/assets/product — the stray check would pass vacuously',
  ).toBeGreaterThan(0);
  expect(
    declared.size,
    'no media slots are declared in media-slots.ts — every check below would pass vacuously',
  ).toBeGreaterThan(0);

  const strays = produced.filter((p) => !declared.has(p));
  expect(strays, `files that name no declared slot: ${strays.join(', ')}`).toEqual([]);

  const missing = MEDIA_SLOTS.filter((s) => !produced.includes(s.id)).map((s) => s.id);

  // The served page must SHOW the gap: one labelled placeholder per missing
  // slot, in each language tree. Fetched rather than read off disk, for the
  // reason in the header comment — and fetched through the helper so that when
  // the home page becomes per-tenant this asks a tenant's home page instead of
  // "the" home page, without changing shape.
  const homePaths = ['/', '/es/'];
  const homes = await Promise.all(
    homePaths.map(async (path) => ({ path, html: await servedHtml(path) })),
  );

  // The floor counts PAGES, which is the thing that can silently shrink here.
  // `servedHtml` already throws on a non-200, so this guards the other way a
  // page can evaporate: a 200 carrying a stub, an error shell, or an empty
  // body. Any of those renders no placeholders, and a missing slot would then
  // go unnoticed — the loop would find nothing to disagree with.
  expect(homes.length, 'both language home pages must be inspected').toBe(homePaths.length);
  for (const { path, html } of homes) {
    expect(
      html.length,
      `${path}: served ${html.length} bytes — that is not the home page, so the placeholder scan below would be vacuous`,
    ).toBeGreaterThan(5000);
    expect(html, `${path}: served body is not an HTML document`).toContain('<html');
  }

  for (const { path, html } of homes) {
    const rendered = new Set([...html.matchAll(/data-placeholder="([^"]+)"/g)].map((m) => m[1]));
    for (const slot of missing) {
      expect(rendered.has(slot), `${path}: missing slot ${slot} renders no placeholder`).toBe(true);
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

  // The loop below is "for every showcase background, assert X". If that list
  // ever came back empty the whole test would report success having checked
  // nothing, so the enumeration gets a floor like every other one here.
  expect(
    SHOWCASE_BACKGROUND_IDS.length,
    'no showcase background ids are declared — the provenance checks would pass vacuously',
  ).toBeGreaterThan(0);

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

    // Still read off disk, and deliberately so: this asserts about the SOURCE
    // asset the manifest fingerprints, not about anything the server renders.
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
  // A source file, not a build output — nothing here moved.
  const script = readFileSync('scripts/capture-product-media.mjs', 'utf8');
  expect(script).toContain("const OCR_CACHE = join(ROOT, 'node_modules/.cache/tesseract')");
  expect(script).toContain('cachePath: OCR_CACHE');
  expect(script).not.toContain('${p[0]}');
  expect(script).not.toContain('${m[0]}');
});
