/** Deterministic upload packaging. Artwork is unchanged; transparent canvas is framed. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const manifestPath = resolve(process.argv[2] || 'docs/brand-assets/tenants.json');
const base = dirname(manifestPath);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const tenant of manifest.tenants) {
  const asset = tenant.assets.logo;
  const sourcePath = asset.source_path || asset.path.replace('logo.png', 'logo-source.png');
  const source = await readFile(resolve(base, sourcePath));
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * info.channels + info.channels - 1] <= 8) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error(`Empty logo: ${tenant.site_slug}`);
  left = Math.max(0, left - 2); top = Math.max(0, top - 2);
  right = Math.min(info.width - 1, right + 2); bottom = Math.min(info.height - 1, bottom + 2);
  const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
  const png = await sharp(source).extract(crop).png().toBuffer();
  await writeFile(resolve(base, asset.path), png);
  Object.assign(asset, { sha256: createHash('sha256').update(png).digest('hex'), source_path: sourcePath, source_sha256: createHash('sha256').update(source).digest('hex'), frame: crop });
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${manifest.tenants.length} tenant upload kits. No network requests.`);
