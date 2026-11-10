import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@i18n/ui';

/**
 * Locale-aware access to the content collections (today only the changelog: the
 * blog lives in the Core and is read through `src/lib/blog-entry.ts`).
 *
 * The locale is carried by the directory (`changelog/en/…`, `changelog/es/…`) rather than
 * by a frontmatter field. A field is easy to forget and only fails at runtime
 * on the one page that reads it; a directory cannot be forgotten, because the
 * file has to live somewhere. It also makes filtering by language a property of
 * the id, which is what lets `getLocalized` be the only way anyone reads a
 * collection.
 *
 * That matters here: before this, five separate `getCollection` calls read
 * every entry unfiltered, so a Spanish index would have listed English posts
 * and both RSS feeds would have carried both languages.
 */

type LocalizableCollection = 'changelog';

/** `en/foo` → `en`. Anything unrecognised falls back to English. */
export function localeOf(id: string): Locale {
  const prefix = id.split('/')[0];
  return (LOCALES as readonly string[]).includes(prefix) ? (prefix as Locale) : DEFAULT_LOCALE;
}

/**
 * `en/foo` → `foo`.
 *
 * Astro derives an entry's slug from its path, so moving the files under a
 * locale directory put that directory into every slug. Stripping it here keeps
 * the public URLs exactly as they were: /blog/foo/ and /es/blog/foo/, never
 * /blog/en/foo/.
 */
export function bareSlug(slug: string): string {
  const [head, ...rest] = slug.split('/');
  return (LOCALES as readonly string[]).includes(head) ? rest.join('/') : slug;
}

/** Every entry of a collection in one language, newest first. */
export async function getLocalized<C extends LocalizableCollection>(
  collection: C,
  locale: Locale,
): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(collection, ({ id }) => localeOf(id) === locale);
  return entries.sort((a, b) => dateOf(b).valueOf() - dateOf(a).valueOf());
}

export function dateOf(entry: CollectionEntry<LocalizableCollection>): Date {
  return entry.data.date;
}
