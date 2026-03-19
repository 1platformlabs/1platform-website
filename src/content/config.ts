import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string(),
    category: z.enum(['seo-automation', 'ai-content', 'api-tutorials', 'product-updates']),
    image: z.string().optional(),
    ogImage: z.string().optional(),
    readingTime: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    section: z.enum([
      'getting-started',
      'authentication',
      'api-reference',
      'code-examples',
      'webhooks',
      'errors',
    ]),
  }),
});

const changelog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    version: z.string().optional(),
    category: z.enum(['new-feature', 'improvement', 'bug-fix', 'api-change']),
  }),
});

export const collections = { blog, docs, changelog };
