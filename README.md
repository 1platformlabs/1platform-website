<h1 align="center">1Platform — Marketing Website</h1>

<p align="center"><strong>One platform. Every solution.</strong></p>

<p align="center">
  Source code for <a href="https://1platform.pro">1platform.pro</a> — the marketing site, blog, docs and changelog for 1Platform, a unified SaaS integrating AI content, SEO, keywords, images, CMS publishing, payments, invoicing and AI agents.
</p>

<p align="center">
  <a href="https://1platform.pro"><img src="https://img.shields.io/badge/Visit-1platform.pro-3b82f6?style=flat-square" alt="Website" /></a>
  <img src="https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white&style=flat-square" alt="Astro 7" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="MIT License" />
</p>

---

## Stack

- **[Astro 7](https://astro.build/)** — server rendering with the Node adapter and tenant configuration per request
- **Islands architecture** — JS ships only for interactive components
- **Content Collections** — type-safe Markdown/MDX with Zod schemas (blog, docs, changelog)
- **Lenis** smooth scroll · **View Transitions** · `@astrojs/sitemap` · `@astrojs/rss`
- **Tenant-configured identity** — 1Platform uses Manrope, navy `#0d1c3a` and blue `#2854a7`; Medipago and other tenants retain their own branding
- Output: `dist/server` and `dist/client` — one Node process, tenant-aware routes

## Development

```bash
npm install
npm run dev          # → http://localhost:4321 (hot reload)
npm run build        # → dist/server and dist/client (Node SSR)
npm run preview      # Preview built output locally
```

Node 24 required (see `.nvmrc`).

## Structure

```
src/
├── layouts/       Base, Blog, Docs, Legal
├── components/    Header, Hero, SolutionCard, PipelineAnimation, ...
├── pages/         Routes (index, solutions, pricing, compare/, docs/, blog/, changelog/)
├── content/       Markdown collections (blog, docs, changelog)
├── styles/        global.css, components.css
└── scripts/       animations.ts, lenis-init.ts, pipeline.ts
public/            favicon, fonts, robots.txt, og/
```

## Related

- **API:** [developer.1platform.pro](https://developer.1platform.pro) · [repo](https://github.com/1platformlabs/1platform-api-developer)
- **WordPress plugin:** [wordpress.org](https://wordpress.org/plugins/1platform-content-ai/) · [repo](https://github.com/1platformlabs/1platform-content-ai)
- **Changelog:** [1platform.pro/changelog](https://1platform.pro/changelog)

## License

[MIT](./LICENSE) © 1Platform Labs
