import sharp from 'sharp'

import type { SiteTenant } from './site-api'
import { faviconBytes, logoBytes, uploadedFavicon, uploadedFaviconPath, uploadedLogo, uploadedLogoPath } from './tenant-brand-assets'

export type BrandVariant = 'lockup' | 'symbol'
interface BrandImage { src: string; width: number; height: number; left: number; top: number; cropWidth: number; cropHeight: number; canTintWhite: boolean }
const frames = new Map<string, Promise<BrandImage | null>>()

/** Frame transparent padding without modifying the tenant's uploaded artwork. */
export async function tenantBrandImage(tenant: SiteTenant, variant: BrandVariant): Promise<BrandImage | null> {
  const descriptor = variant === 'lockup' ? uploadedLogo(tenant) : uploadedFavicon(tenant)
  if (!descriptor) return null
  const key = `${tenant.slug}\u0000${variant}\u0000${descriptor.sha256}`
  const known = frames.get(key)
  if (known) return known
  const pending = (async (): Promise<BrandImage | null> => {
    try {
      const bytes = await (variant === 'lockup' ? logoBytes(tenant) : faviconBytes(tenant))
      if (!bytes) return null
      const { data, info } = await sharp(bytes, { limitInputPixels: 1024 * 1024 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      let left = info.width, top = info.height, right = -1, bottom = -1
      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          if (data[(y * info.width + x) * info.channels + info.channels - 1]! <= 8) continue
          left = Math.min(left, x); right = Math.max(right, x)
          top = Math.min(top, y); bottom = Math.max(bottom, y)
        }
      }
      if (right < left) return null
      // Only silhouette artwork with substantial empty space inside its bounds.
      // Opaque uploads (including a card surrounded by transparent padding) must
      // retain their colours: whitening them would erase the actual logo.
      let transparentPixels = 0
      for (let y = top; y <= bottom; y += 1) {
        for (let x = left; x <= right; x += 1) {
          if (data[(y * info.width + x) * info.channels + info.channels - 1]! <= 8) transparentPixels += 1
        }
      }
      const canTintWhite = transparentPixels / ((right - left + 1) * (bottom - top + 1)) >= 0.1
      left = Math.max(0, left - 2); top = Math.max(0, top - 2)
      right = Math.min(info.width - 1, right + 2); bottom = Math.min(info.height - 1, bottom + 2)
      return { src: variant === 'lockup' ? uploadedLogoPath(descriptor) : uploadedFaviconPath(descriptor), width: info.width, height: info.height, left, top, cropWidth: right - left + 1, cropHeight: bottom - top + 1, canTintWhite }
    } catch { return null }
  })()
  frames.set(key, pending)
  if (frames.size > 64) frames.delete(frames.keys().next().value!)
  const result = await pending
  // Let the transport's bounded negative cache determine when to retry.
  if (!result) frames.delete(key)
  return result
}
