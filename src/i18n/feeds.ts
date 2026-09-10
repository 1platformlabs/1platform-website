import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { useI18n, type Locale } from '@i18n';
import { bareSlug, getLocalized } from '@i18n/collections';
import { siteOrigin } from '@lib/site-origin';

/**
 * The channel `<link>` — the element that says "this feed describes THIS site".
 *
 * It points at the locale's own root, so passing the bare origin made the
 * Spanish feed point a subscriber at the English homepage. Item links are
 * unaffected: they are root-relative, and a root-relative path resolves against
 * the origin, not the base path, so `/es/blog/x/` stays `/es/blog/x/` either
 * way.
 *
 * ⚠️ The base is the TENANT's origin, not `context.site`. `context.site` is
 * `astro.config.mjs`'s build constant, so every tenant's feed used to name
 * `1platform.pro` as the site it describes — a feed served under a customer's
 * domain telling every reader it belongs to the platform.
 */
function channelSite(context: APIContext, locale: Locale): string {
  const localise = context.locals.localizePath;
  return new URL(localise('/', locale), siteOrigin(context.locals)).toString();
}

/**
 * The two RSS feeds, one builder each, parameterised by locale.
 *
 * Both used to read their collection unfiltered, so once Spanish entries
 * existed each feed would have carried both languages in one document — a
 * subscriber to the Spanish blog would have received English posts. Reading
 * through `getLocalized` makes that impossible rather than merely unlikely.
 */

export async function blogFeed(context: APIContext, locale: Locale) {
  const { t, l } = useI18n(locale, context.locals);
  const posts = await getLocalized('blog', locale);

  return rss({
    title: t('blog.feed.title'),
    description: t('blog.feed.description'),
    site: channelSite(context, locale),
    // Without this a reader has no way to tell the two feeds apart except by
    // reading the entries.
    customData: `<language>${locale}</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: l(`/blog/${bareSlug(post.id)}/`),
      categories: [post.data.category],
    })),
  });
}

export async function changelogFeed(context: APIContext, locale: Locale) {
  const { t, l } = useI18n(locale, context.locals);
  const entries = await getLocalized('changelog', locale);

  return rss({
    title: t('changelog.feed.title'),
    description: t('changelog.feed.description'),
    site: channelSite(context, locale),
    customData: `<language>${locale}</language>`,
    items: entries.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.date,
      // Changelog entries share one page, so a constant link gave all seven
      // items the same derived guid and a reader deduped them down to one. The
      // anchor makes each guid unique and still lands on the right release.
      link: `${l('/changelog/')}#${entry.data.version ?? bareSlug(entry.id)}`,
      categories: [entry.data.category],
    })),
  });
}
