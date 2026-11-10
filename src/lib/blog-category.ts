import type { Translator } from '../i18n/ui'

/**
 * The label of a blog category. The platform's six have copy; a category that only the
 * Core knows (staff configured a taxonomy) shows its id in words instead of throwing —
 * `t()` throws on a missing key by design, and one post in a new category took down the
 * whole archive and every article with a 503 (red team, deploy-prod 2026-11-10).
 */
export function categoryLabel(t: Translator, id: string): string {
  try {
    return t(`interiors.category.${id}`)
  } catch {
    const words = String(id).replace(/[-_]+/g, ' ').trim()
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : String(id)
  }
}
