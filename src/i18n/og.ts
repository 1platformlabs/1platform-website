import type { Locale } from '@i18n/ui';

/**
 * The share cards that exist in more than one language.
 *
 * A Spanish page pointing at an English card is issue #59: the first contact a
 * reader has with the product — the headline of the card that appears in a chat
 * or a timeline — arrives in a language they did not choose, and the link reads
 * as if it led to an English page.
 *
 * The list is explicit rather than derived. Deriving it ("append `-es` and hope")
 * would silently emit a 404 image for any card nobody translated, and a broken
 * `og:image` degrades worse than an English one: platforms fall back to no card
 * at all. `tests/og-locale.spec.ts` asserts in BOTH directions — every name here
 * has a file, and every `/es/` page's card is either localized or on the short
 * list of cards that are locale-neutral by design.
 *
 * `default.png` is deliberately absent. Its only words are the wordmark, the
 * URL, and the slogan — and the slogan stays in English on purpose, in both
 * trees, because it is brand and not copy (see `src/i18n/messages/common.ts`).
 * Translating that card would contradict the Spanish home, which renders the
 * very same slogan in English.
 */
export const LOCALIZED_OG_IMAGES = [
  '/og/solution-online-store.png',
  '/og/solution-website.png',
  '/og/solution-content.png',
  '/og/solution-whitelabel.png',
  '/og/solution-payments-invoicing.png',
  '/og/solution-deliveries.png',
  '/og/solution-ads.png',
  '/og/blog-launch-online-store-30-minutes.png',
  '/og/blog-electronic-invoicing-online-business.png',
  '/og/blog-integrating-payments-into-your-saas.png',
] as const;

/** Cards with no words to translate. Kept named so the test can tell them
 *  apart from a card someone simply forgot. */
export const LOCALE_NEUTRAL_OG_IMAGES = ['/og/default.png'] as const;

const localized = new Set<string>(LOCALIZED_OG_IMAGES);

/**
 * The card to serve for `ogImage` on a page in `locale`.
 *
 * English is the base name; every other locale gets the `-{locale}` suffix, and
 * only for cards that were actually drawn in that language.
 */
export function localizedOgImage(ogImage: string, locale: Locale): string {
  if (locale === 'en' || !localized.has(ogImage)) return ogImage;
  return ogImage.replace(/\.png$/, `-${locale}.png`);
}
