# CLAUDE.md — 1Platform Marketing Website

This file provides project-specific guidance for the **marketing website** (`1platform.pro`).
See the root `../CLAUDE.md` for shared brand/API context.

## Project Overview

Marketing website + documentation site for **1Platform** — a unified platform that integrates 13+ business solutions through a single interconnected ecosystem. Core message: "One platform. Every solution." The full specification is in `../WEBSITE_PROMPT.md`.

## Tech Stack

- **[Astro](https://astro.build/) 5** — static site generator, outputs 100% static HTML, zero JS by default
- **Islands architecture** — JS only ships for interactive components (`client:visible`, `client:load`)
- **Content Collections** — type-safe Markdown/MDX for blog, docs, changelog (Zod-validated schemas)
- CSS uses modern features: variables, grid, flexbox, `@layer`, `@container`, nesting. Scoped `<style>` per component + global CSS
- **Integrations:** `@astrojs/sitemap`, `@astrojs/rss`, Astro View Transitions
- **Output:** `dist/` folder with pure static HTML/CSS/JS — deployable to any static host

## Development

```bash
npm run dev          # Dev server → http://localhost:4321 (hot reload)
npm run build        # Build → dist/ (static output)
npm run preview      # Preview built output locally
```

## Folder Structure

```
src/
  layouts/
    BaseLayout.astro                # HTML shell: <head>, nav, footer, Lenis, ViewTransitions
    BlogLayout.astro                # Blog post (extends Base, article schema, TOC)
    DocsLayout.astro                # Docs (extends Base, sidebar nav)
    LegalLayout.astro               # Legal pages (extends Base, minimal)
  components/
    Header.astro, Footer.astro      # Site chrome
    Hero.astro, SolutionCard.astro   # Reusable UI components
    PricingCalculator.astro          # Island (client:visible)
    PipelineAnimation.astro          # Island (client:visible)
    MetricCounter.astro              # Island (client:visible)
    MobileMenu.astro                 # Island (client:load)
    SEOHead.astro, Breadcrumb.astro  # Meta/SEO components
  pages/
    index.astro                     # Homepage → /
    solutions.astro                 # Solutions → /solutions/
    features.astro                  # Features → /features/
    pricing.astro                   # Pricing → /pricing/
    why-1platform.astro             # Differentiators → /why-1platform/
    about.astro, terms.astro, privacy.astro, cookies.astro, 404.astro
    compare/*.astro                 # Comparison pages → /compare/[slug]/
    docs/[...slug].astro            # Docs from content collection → /docs/[slug]/
    blog/[...slug].astro            # Blog from content collection → /blog/[slug]/
    blog/category/[category].astro  # Category pages
    changelog/index.astro           # Changelog → /changelog/
    rss.xml.ts                      # RSS feed endpoint
  content/
    config.ts                       # Zod schemas for collections
    blog/*.md                       # Blog posts (Markdown)
    docs/*.md                       # Docs pages (Markdown)
    changelog/*.md                  # Changelog entries (Markdown)
  styles/
    global.css                      # Reset, variables, typography, layout
    components.css                  # Shared component styles
  scripts/
    animations.ts, lenis-init.ts, pipeline.ts, calculator.ts
public/
  robots.txt, favicon.svg, fonts/, og/
```

## Design System

- **Dark mode only:** `color-scheme: dark`, `theme-color: #0a0a0a` — all pages
- Background: #0a0a0a, lighter sections: #111, accent-tinted sections
- Accent colors: electric blue `#3b82f6`, purple gradients, cyan `#06b6d4` — must meet 4.5:1 contrast on dark bg
- Typography: monospace + sans-serif pairing, max 2 families, 4 weights
- `font-display: swap` on all fonts, preload critical fonts
- `text-wrap: balance` on headings, `tabular-nums` on stat counters
- Logo: "1Platform" with visually distinct "1"

## Animation System (cosmos.so-inspired)

- **Lenis smooth scroll** on all pages — installed via npm, initialized in `src/scripts/lenis-init.ts`, imported in `BaseLayout.astro`
- **Hero:** Aurora mesh gradient bg (CSS blurred blobs) + staggered word-by-word text reveal + CTA fade-in
- **Scroll reveals:** IntersectionObserver triggers `.reveal` → `.is-visible` (translateY + opacity)
- **Card grids:** Staggered cascade reveal (100ms between cards)
- **Pipeline animation:** Scroll-linked — steps light up sequentially as user scrolls
- **Logo carousel:** Pure CSS infinite scroll (`translateX` keyframe), grayscale→color on hover, edge fade masks
- **Card hover:** `translateY(-4px)` + blue-tinted `box-shadow`
- **Button hover:** Primary = brightness shift + scale(1.02), ghost = border glow
- **Background textures:** Dot grid pattern (CSS radial-gradient), subtle noise at 0.02-0.04 opacity
- **Primary easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)
- **ALL animations:** Wrapped in `@media (prefers-reduced-motion: no-preference)`, only `transform`+`opacity`

## SEO Essentials

- **Canonical URLs:** `https://1platform.pro/[page]/` (HTTPS, no www, trailing slash)
- **Structured data:** JSON-LD per page type — see keyword map & schema map in WEBSITE_PROMPT.md
- **Meta tags:** Unique `<title>` (50-60 chars), meta description (150-160 chars), OG + Twitter cards per page
- **Headings:** One H1 per page, hierarchical H2→H3, never skip levels
- **Breadcrumbs:** Visible + `BreadcrumbList` JSON-LD on all pages except homepage
- **Sitemap:** Auto-generated by `@astrojs/sitemap` — configured in `astro.config.mjs`
- **RSS:** Blog + changelog feeds via `@astrojs/rss` — endpoints in `src/pages/rss.xml.ts`
- **View Transitions:** `<ViewTransitions />` in `BaseLayout.astro` for smooth page transitions
- LCP < 2s, INP < 200ms, CLS < 0.1

## Accessibility Requirements

- Semantic HTML: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- Skip-to-content link as first DOM element
- `:focus-visible` ring on ALL interactive elements — never `outline: none` alone
- `prefers-reduced-motion`: wrap all animations in media query, provide static fallbacks
- Images: descriptive `alt`, explicit `width`/`height`, decorative icons get `aria-hidden="true"`
- Forms: every input needs `<label>`, correct `type`/`inputmode`, `aria-live="polite"` for dynamic output
- Mobile: `viewport` meta (NEVER `user-scalable=no`), 48px min tap targets, `touch-action: manipulation`
- `<button>` for actions, `<a>` for navigation — never `<div onclick>`

## Performance Rules

- Images: Use Astro's `<Image />` component from `astro:assets` (auto WebP, srcset, lazy loading)
- Fonts: self-host WOFF2 in `public/fonts/`, preload in `BaseLayout.astro`, `font-display: swap`, max 2 families
- JS: zero by default — only `client:visible`/`client:load` islands ship JS. Never add `client:*` to presentational components
- CSS: scoped `<style>` per component + global CSS. Astro bundles and minifies automatically
- Animations: only `transform`/`opacity`, never `transition: all`

## Copy Conventions

- Active voice, second person, use numerals
- Title Case for H1/H2, buttons, nav. Sentence case for H3
- Curly quotes, ellipsis `…`, non-breaking spaces before units
- Specific CTA labels: "Get Started Free", "View API Docs" — never "Click Here"

## Messaging Strategy

- **Core message:** "One platform. Every solution."
- **Pillars:** Unified Platform, AI-Powered Pipeline, End-to-End Ecosystem, Scalable by Design, Interconnected Services
- **Pattern:** Every section ends with a CTA. Comparison visuals ("Without vs. With 1Platform")
- **"Replaces" positioning:** Each solution names generic tool categories it replaces (never competitor brand names)
- **Interconnection narrative:** Emphasize that all services work together (keywords → content → images → publish → index → backlinks → payments → invoicing)

## Restrictions (NEVER)

- Never use `client:*` on presentational components — goal: < 10KB total JS
- Never expose provider names on client-facing pages (only in Privacy Policy)
- Never `outline: none` without replacement focus indicator
- Never `user-scalable=no` or `maximum-scale=1`
- Never `transition: all` — list specific properties
- Never skip heading levels (H1 → H3 without H2)
- Never `<div onclick>` — use `<button>` or `<a>`
- Never put content images in `public/` — use `src/assets/` + `<Image />`
- Never animate without `@media (prefers-reduced-motion: no-preference)` wrapper

## Verification (after implementation)

```bash
npm run build            # Must succeed, zero errors
npm run preview          # Visual review all pages
# Lighthouse: Performance 95+, Accessibility 100, SEO 100
# Validate JSON-LD with Google Rich Results Test
# Test keyboard nav: Tab, Enter, Escape on all pages
# Test prefers-reduced-motion: all animations have static fallbacks
```

## Path Aliases (tsconfig.json)

- `@layouts/*` → `src/layouts/*`
- `@components/*` → `src/components/*`
- `@styles/*` → `src/styles/*`
- `@scripts/*` → `src/scripts/*`
- `@content/*` → `src/content/*`
- `@assets/*` → `src/assets/*`
