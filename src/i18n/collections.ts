import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@i18n/ui';

/**
 * Locale-aware access to the content collections.
 *
 * The locale is carried by the directory (`blog/en/…`, `blog/es/…`) rather than
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

type LocalizableCollection = 'blog' | 'changelog';

/** `blog/en/foo.md` → `en`. Anything unrecognised falls back to English. */
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

/** Blog posts carry `pubDate`, changelog entries carry `date`. */
export function dateOf(entry: CollectionEntry<LocalizableCollection>): Date {
  return 'pubDate' in entry.data ? entry.data.pubDate : entry.data.date;
}

/**
 * Static paths for one language's blog posts.
 *
 * Each language tree declares its own routes, which is why the locale is an
 * argument rather than something derived: `getStaticPaths` runs at build time
 * and has no URL to read it from.
 */
export async function postPaths(locale: Locale) {
  const posts = await getLocalized('blog', locale);
  return posts.map((post) => ({
    params: { slug: bareSlug(post.slug) },
    props: { post },
  }));
}

/** Static paths for one language's blog category pages. */
export async function categoryPaths(locale: Locale) {
  const posts = await getLocalized('blog', locale);
  const categories = [...new Set(posts.map((post) => post.data.category))];

  return categories.map((category) => ({
    params: { category },
    props: {
      posts: posts.filter((post) => post.data.category === category),
      category,
      /** The sibling topics, so a dead end always offers a way onward. */
      siblings: categories
        .filter((c) => c !== category)
        .map((c) => ({ slug: c, count: posts.filter((p) => p.data.category === c).length }))
        .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug)),
    },
  }));
}

/**
 * Which languages a given entry exists in, as paths.
 *
 * Feeds the hreflang block, the language switcher and the auto-detect script
 * from one answer. A post with no Spanish twin simply has no `es` entry, and
 * all three then do the right thing without any of them knowing why.
 */
export async function entryAlternates<C extends LocalizableCollection>(
  collection: C,
  translationKey: string,
  pathFor: (locale: Locale, slug: string) => string,
): Promise<Partial<Record<Locale, string>>> {
  const all = await getCollection(collection);
  const alternates: Partial<Record<Locale, string>> = {};

  for (const entry of all) {
    if (entry.data.translationKey !== translationKey) continue;
    alternates[localeOf(entry.id)] = pathFor(localeOf(entry.id), bareSlug(entry.slug));
  }

  return alternates;
}
