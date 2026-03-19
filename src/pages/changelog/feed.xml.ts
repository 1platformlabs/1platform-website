import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const entries = (await getCollection('changelog')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: '1Platform Changelog',
    description: 'Track every update, new feature, and improvement to the 1Platform API and services.',
    site: context.site!.toString(),
    items: entries.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.date,
      link: `/changelog/`,
      categories: [entry.data.category],
    })),
  });
}
