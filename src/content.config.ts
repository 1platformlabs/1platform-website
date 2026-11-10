import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Only the changelog is a content collection. The blog moved to the Core
 * (blog-sitio-de-marca-generado): its posts are read over HTTP through
 * `src/lib/site-blog.ts`, and `src/data/blog-fixture.json` stands in for them in
 * repo mode.
 *
 * The locale is NOT a field here: it is the directory the file lives in
 * (`changelog/en/…`, `changelog/es/…`). See src/i18n/collections.ts for why.
 * The entry `id` the `glob` loader produces is the path under `base` without
 * its extension — `en/foo`.
 */

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/changelog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    version: z.string().optional(),
    category: z.enum(['new-feature', 'improvement', 'bug-fix', 'api-change']),
    translationKey: z.string(),
  }),
});

export const collections = { changelog };
