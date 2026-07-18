import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { localizePath, useI18n, type Locale } from '@i18n';
import { bareSlug, getLocalized } from '@i18n/collections';

/**
 * The two RSS feeds, one builder each, parameterised by locale.
 *
 * Both used to read their collection unfiltered, so once Spanish entries
 * existed each feed would have carried both languages in one document — a
 * subscriber to the Spanish blog would have received English posts. Reading
 * through `getLocalized` makes that impossible rather than merely unlikely.
 */

export async function blogFeed(context: APIContext, locale: Locale) {
  const { t } = useI18n(locale);
  const posts = await getLocalized('blog', locale);

  return rss({
    title: t('blog.feed.title'),
    description: t('blog.feed.description'),
    site: context.site!.toString(),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: localizePath(`/blog/${bareSlug(post.slug)}/`, locale),
      categories: [post.data.category],
    })),
  });
}

export async function changelogFeed(context: APIContext, locale: Locale) {
  const { t } = useI18n(locale);
  const entries = await getLocalized('changelog', locale);

  return rss({
    title: t('changelog.feed.title'),
    description: t('changelog.feed.description'),
    site: context.site!.toString(),
    items: entries.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.date,
      link: localizePath('/changelog/', locale),
      categories: [entry.data.category],
    })),
  });
}
