/** Deterministic upload packaging. Artwork is unchanged; transparent canvas is framed. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BRAND_KIT_ROOT, kitAssetFile } from './brand-kit.mjs';

// This command operates on the repository kit only, never a CLI-supplied manifest.
if (process.argv.length > 2) throw new Error('prepare-brand-assets accepts no arguments');
const manifestPath = fileURLToPath(new URL('../docs/brand-assets/tenants.json', import.meta.url));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const slugs = manifest.tenants.map(tenant => tenant.site_slug);
if (new Set(slugs).size !== slugs.length) throw new Error('Duplicate tenant in brand kit');

function opticalFrame(data, info) {
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * info.channels + info.channels - 1] <= 8) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error('Empty logo in brand kit');
  left = Math.max(0, left - 2); top = Math.max(0, top - 2);
  right = Math.min(info.width - 1, right + 2); bottom = Math.min(info.height - 1, bottom + 2);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

// Validate every source and destination before starting any image/file writes.
const jobs = await Promise.all(manifest.tenants.map(async tenant => {
  const asset = tenant.assets.logo;
  const sourcePath = asset.source_path ?? `${tenant.site_slug}/logo-source.png`;
  const [sourceFile, outputFile] = await Promise.all([
    kitAssetFile(BRAND_KIT_ROOT, tenant.site_slug, sourcePath, 'logo-source.png'),
    kitAssetFile(BRAND_KIT_ROOT, tenant.site_slug, asset.path, 'logo.png'),
  ]);
  return { asset, sourcePath, sourceFile, outputFile };
}));
await Promise.all(jobs.map(async ({ asset, sourcePath, sourceFile, outputFile }) => {
  const source = await readFile(sourceFile);
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const frame = opticalFrame(data, info);
  const png = await sharp(source).extract(frame).png().toBuffer();
  await writeFile(outputFile, png);
  Object.assign(asset, { sha256: createHash('sha256').update(png).digest('hex'), source_path: sourcePath, source_sha256: createHash('sha256').update(source).digest('hex'), frame });
}));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${manifest.tenants.length} tenant upload kits. No network requests.`);
