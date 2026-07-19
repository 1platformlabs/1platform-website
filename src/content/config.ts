import { defineCollection, z } from 'astro:content';

/**
 * The locale is NOT a field here: it is the directory the file lives in
 * (`blog/en/…`, `blog/es/…`). See src/i18n/collections.ts for why.
 *
 * `translationKey` is what pairs an entry with its twin in the other language.
 * It is required rather than optional so a new post cannot be added without
 * saying what it is a translation of — including when the answer is "nothing
 * yet", which is expressed by simply having no twin carrying that key.
 */

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string(),
    category: z.enum([
      'seo-automation',
      'ai-content',
      'api-tutorials',
      'product-updates',
      'ecommerce',
      'payments-invoicing',
    ]),
    image: z.string().optional(),
    ogImage: z.string().optional(),
    // A number, not "8 min read". The unit is composed once per language from
    // the catalogue; storing the rendered phrase would mean translating eight
    // strings that are mostly digits, and letting them drift.
    readingTime: z.number().int().positive().optional(),
    tags: z.array(z.string()).optional(),
    translationKey: z.string(),
  }),
});

const changelog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    version: z.string().optional(),
    category: z.enum(['new-feature', 'improvement', 'bug-fix', 'api-change']),
    translationKey: z.string(),
  }),
});

export const collections = { blog, changelog };
