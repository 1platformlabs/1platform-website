import summaries from '../data/blog-archive-summaries.json';
import type { Locale } from '@i18n';
import { localeOf } from '@i18n/collections';
import type { CollectionEntry } from 'astro:content';

/** Short presentation summaries preserve editorial descriptions, RSS and metadata. */
export function archiveSummary(post: CollectionEntry<'blog'>, locale: Locale): string {
  const localized: Record<string, string> = summaries[locale];
  return localized[post.data.translationKey] ?? post.data.description;
}

/** The approved archive resolves same-day posts differently in each language.
 * Dates stay authoritative so future publications are never frozen below this set. */
const sameDayOrder: Record<Locale, readonly string[]> = {
  en: ['electronic-invoicing-online-business', 'integrating-payments-into-your-saas', 'launch-online-store-30-minutes'],
  es: ['electronic-invoicing-online-business', 'launch-online-store-30-minutes', 'integrating-payments-into-your-saas'],
};
function sameDayRank(post: CollectionEntry<'blog'>): number {
  const rank = sameDayOrder[localeOf(post.id)].indexOf(post.data.translationKey);
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
}
export function editorialOrder(posts: CollectionEntry<'blog'>[]): CollectionEntry<'blog'>[] {
  return [...posts].sort((a, b) =>
    b.data.pubDate.valueOf() - a.data.pubDate.valueOf() || sameDayRank(a) - sameDayRank(b),
  );
}

export function displayHeading(value: string): string {
  let end = value.length;
  while (end > 0) {
    const character = value[end - 1];
    // trim() on one code unit retains ECMAScript whitespace semantics while
    // the suffix scan visits each trailing character at most once.
    if (character !== '.' && character.trim() !== '') break;
    end -= 1;
  }
  return value.slice(0, end);
}
