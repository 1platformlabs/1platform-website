import type { ImageMetadata } from 'astro';
import { mediaSlot, type MediaSlot } from './media-slots';

/**
 * Resolve a media slot to the real product capture, if one has been produced.
 *
 * Files live in `src/assets/product/<slot>.webp` (the capture script writes
 * them, see scripts/capture-product-media.mjs) and go through `astro:assets`
 * like every other image on the site — never `public/`. A slot with no file
 * resolves to `null` and the component draws `SlotPlaceholder` instead, so the
 * build never fails on a missing screenshot and the gap is visible rather than
 * broken.
 */
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/product/*.{webp,png,jpg,jpeg,avif}', {
  eager: true,
});

const byStem = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  const stem = path.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '');
  byStem.set(stem, mod.default);
}

export type ResolvedMedia = { slot: MediaSlot; image: ImageMetadata | null };

export function productMedia(id: string): ResolvedMedia {
  const slot = mediaSlot(id);
  return { slot, image: byStem.get(id) ?? null };
}

