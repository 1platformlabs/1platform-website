import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BRAND_KIT_ROOT = fileURLToPath(new URL('../docs/brand-assets/', import.meta.url));
const assetNames = new Set(['logo.png', 'logo-source.png', 'favicon.png']);

/** Kit paths are data, never arbitrary filesystem destinations. Reject symlinks too. */
export async function kitAssetFile(base, slug, assetPath, filename) {
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !assetNames.has(filename)) {
    throw new Error('Invalid brand kit asset identity');
  }
  if (assetPath !== `${slug}/${filename}`) throw new Error('Invalid brand kit asset path');
  const root = await realpath(base);
  const requested = resolve(root, assetPath);
  const actual = await realpath(requested);
  if (actual !== requested) throw new Error('Brand kit asset must not use symbolic links');
  return actual;
}
