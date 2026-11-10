#!/usr/bin/env node
/**
 * BSM-02 / F2 (blog-sitio-de-marca-generado D-10): export the platform's blog
 * to the shape the Core stores, and generate the repo-mode fixture from it.
 *
 * Reads `src/content/blog/{en,es}/*.md` (16 files) and emits ONE document:
 *
 *   { format: 'site-blog-import/1', tenant, posts: [ { locale, slug, <Core PUT body> } ] }
 *
 * (the format `1platform-api/scripts/ops_import_site_blog.py` reads)
 *
 * The PUT body is `SiteBlogPostWriteRequest`
 * (`1platform-api/app/services/site_blog/site_blog_service.py`): the identity
 * `(locale, slug)` travels in the path of
 * `PUT /platform/sites/{tenant}/blog/posts/{locale}/{slug}`, everything else is
 * the body. Dates are the ORIGINAL ones (`published_at`/`updated_at` are kept by
 * the Core), so the archive order, the `<time>` of every article and the JSON-LD
 * `datePublished` do not move. `updated_at` is always written (= `updatedDate`
 * or the publication date) so the Core never stamps "now" and the article never
 * shows an "Updated" line it does not show today.
 *
 * The same document IS the fixture (`src/data/blog-fixture.json`, D-10): the
 * site's repo mode and every test without an API read it, and the import script
 * of the API repo reads it with `--file`. Deterministic: sorted, no timestamps
 * of the run.
 *
 * Usage:
 *   node scripts/export-blog-posts.mjs [--out <file>] [--check]
 *
 *   --out    also write the document to <file> (the fixture is always written
 *            unless --check)
 *   --check  write nothing; exit 1 when the fixture differs from the sources
 *
 * Once `src/content/blog` is gone the fixture is canonical and this script
 * refuses to run (it would have nothing to read).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';

const ROOT = new URL('..', import.meta.url).pathname;
// BLOG_SOURCE lets the check run against the original files after they left the tree.
const SOURCE = process.env.BLOG_SOURCE ?? join(ROOT, 'src/content/blog');
const FIXTURE = join(ROOT, 'src/data/blog-fixture.json');
const TENANT = 'oneplatform';
const CATEGORIES = new Set(['seo-automation', 'ai-content', 'api-tutorials', 'product-updates', 'ecommerce', 'payments-invoicing']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// The Core's tag grammar (`app/models/site_blog_post.py` `_TAG`). The site never
// renders a tag (they only travel in props), so the human labels of the
// Markdown ("electronic invoicing", "automatización") are folded to that
// grammar here — sent raw, the Core refused 10 of the 16 posts (verify-epic-e2e
// 2026-11-10).
const CORE_TAG = /^[a-z0-9-]{1,40}$/;

export function coreTag(label, where = 'tag') {
  const tag = String(label)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!CORE_TAG.test(tag)) throw new Error(`${where}: tag ${JSON.stringify(label)} has no Core form`);
  return tag;
}

const coreTags = (labels, where) => [...new Set((labels ?? []).map((t) => coreTag(t, where)))];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);

function splitFrontmatter(source, file) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (!match) throw new Error(`${file}: no frontmatter`);
  return { data: yaml.load(match[1]), body: source.slice(match[0].length) };
}

function iso(date, file, field) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.valueOf())) throw new Error(`${file}: ${field} is not a date`);
  return d.toISOString();
}

export function buildDocument() {
  if (!existsSync(SOURCE)) {
    throw new Error('src/content/blog no longer exists: the blog lives in the Core and src/data/blog-fixture.json is canonical.');
  }
  const posts = [];
  for (const locale of ['en', 'es']) {
    const dir = join(SOURCE, locale);
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
      const label = `${locale}/${file}`;
      const slug = file.replace(/\.md$/, '');
      const { data, body } = splitFrontmatter(readFileSync(join(dir, file), 'utf8'), label);
      if (!SLUG.test(slug)) throw new Error(`${label}: slug is not a valid Core slug`);
      if (!CATEGORIES.has(data.category)) throw new Error(`${label}: category ${data.category} is not one of the six`);
      if (!SLUG.test(data.translationKey ?? '')) throw new Error(`${label}: translationKey missing or invalid`);
      const published = iso(data.pubDate, label, 'pubDate');
      posts.push({
        locale,
        slug,
        translation_key: data.translationKey,
        title: data.title,
        description: data.description,
        body,
        category: data.category,
        author: data.author ?? null,
        tags: coreTags(data.tags, label),
        image: data.image ?? null,
        og_image: data.ogImage ?? null,
        illustration: null,
        reading_minutes: data.readingTime ?? null,
        faq: [],
        status: 'published',
        published_at: published,
        updated_at: data.updatedDate ? iso(data.updatedDate, label, 'updatedDate') : published,
      });
    }
  }
  posts.sort((a, b) => a.locale.localeCompare(b.locale) || a.slug.localeCompare(b.slug));
  // Each translation key is claimed once per language (the Core's unique index).
  const claimed = new Set();
  for (const p of posts) {
    const key = `${p.locale}:${p.translation_key}`;
    if (claimed.has(key)) throw new Error(`translation_key ${p.translation_key} is claimed twice in ${p.locale}`);
    claimed.add(key);
  }
  return { format: 'site-blog-import/1', tenant: TENANT, posts };
}

const render = (doc) => `${JSON.stringify(doc, null, 2)}\n`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const doc = buildDocument();
  const text = render(doc);
  if (flag('--check')) {
    const current = existsSync(FIXTURE) ? readFileSync(FIXTURE, 'utf8') : '';
    if (current !== text) {
      console.error('src/data/blog-fixture.json differs from src/content/blog — run node scripts/export-blog-posts.mjs');
      process.exit(1);
    }
    console.log(`fixture matches the sources (${doc.posts.length} posts)`);
  } else {
    const out = value('--out');
    for (const target of [FIXTURE, ...(out ? [out] : [])]) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, text);
    }
    console.log(`exported ${doc.posts.length} posts → ${[FIXTURE, out].filter(Boolean).join(', ')}`);
  }
}
