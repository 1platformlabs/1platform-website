# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Project-specific guidance for the **1Platform marketing website** (`1platform.pro`).
See the root `../CLAUDE.md` for shared brand/API context.

## Project Overview

Marketing website + documentation site for **1Platform** — a unified platform that integrates 13+ business solutions through a single interconnected ecosystem. Core message: "One platform. Every solution." The full specification is in `../WEBSITE_PROMPT.md`.

## Tech Stack

- **[Astro](https://astro.build/) 5** — static site generator, outputs 100% static HTML, zero JS by default
- **Islands architecture** — JS only ships for interactive components (`client:visible`, `client:load`)
- **Content Collections** — type-safe Markdown/MDX for blog and changelog (Zod-validated schemas)
- **Lenis** smooth scroll (npm package, initialized in `src/scripts/lenis-init.ts`)
- CSS uses modern features: variables, grid, flexbox, nesting. Scoped `<style>` per component + global CSS
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
    LegalLayout.astro               # Legal pages (extends Base, minimal)
  components/
    Header.astro, Footer.astro      # Site chrome (Header includes mobile menu with focus trap)
    Hero.astro                      # Left-aligned copy; `motif` prop mounts the schematic (home only)
    InterconnectDiagram.astro       # THE signature motif — inline SVG schematic, no JS
    Card.astro                      # The ONE card primitive (variants: default | lead | bare)
    Icon.astro + icons.ts           # The ONE icon set — add new icons to icons.ts
    Check.astro                     # The ONE yes/no mark, used by every table
    ProcessSpine.astro              # Numbered steps on a spine (replaced PipelineAnimation)
    ComparisonTable.astro           # Unified vs fragmented, by capability — no prices
    CodeBlock.astro                 # Code samples with copy button
    Breadcrumb.astro                # Breadcrumb nav + JSON-LD
    TOC.astro                       # Table of contents (blog)
    RelatedPosts.astro              # Related blog posts sidebar
    ShareButtons.astro              # Social share buttons
    BlogPostCard.astro              # Blog post preview card (used in blog index/category pages)
    Logo.astro                      # 1Platform brand logo
  pages/
    index.astro                     # Homepage → /
    solutions.astro                 # Solutions → /solutions/
    features.astro                  # Features → /features/
    pricing.astro                   # Pricing → /pricing/
    why-1platform.astro             # Differentiators → /why-1platform/
    about.astro, terms.astro, privacy.astro, cookies.astro, 404.astro
    compare/*.astro                 # Comparison pages → /compare/[slug]/
    blog/index.astro                # Blog index → /blog/
    blog/[...slug].astro            # Blog from content collection → /blog/[slug]/
    blog/category/[category].astro  # Category pages
    changelog/index.astro           # Changelog → /changelog/
    rss.xml.ts                      # RSS feed endpoint
  content/
    config.ts                       # Zod schemas for 2 collections
    blog/*.md                       # 5 blog posts (categories: seo-automation, ai-content, api-tutorials, product-updates)
    changelog/*.md                  # 2 changelog entries (categories: new-feature, improvement, bug-fix, api-change)
  styles/
    global.css                      # Reset, variables, typography, layout
    components.css                  # Shared component styles
  scripts/
    animations.ts                   # One reveal-on-scroll. No stagger, no counters — by design
    lenis-init.ts                   # Smooth scroll + anchor linking
public/
  robots.txt, favicon.svg, og/
  fonts/                            # Self-hosted WOFF2 (Space Grotesk / Inter / JetBrains Mono) + OFL licences
scripts/
  check-tells.sh                    # Design-system guard — run before every PR
  generate-og-images.py, generate-og-default.py
```

## Design System — "ink & signal"

The site is **light**: `color-scheme: light`, `theme-color: #F6F5F2`. Near-monochrome ink
on warm paper, **one** accent, and **one** signal colour reserved for a single motif.

- **Palette (tokens in `src/styles/global.css`)** — `--ink #14161B` (text, not pure black),
  `--paper #F6F5F2` (page), `--surface #FFFFFF`, `--recessed #EFEEEA`,
  `--cobalt #1F4FE0` (the only accent: links, primary CTA, motif structure),
  `--signal #F5A524` (**motif strokes only** — it is 1.87:1 on paper and must never carry
  text), `--muted #5B5F6B`, `--subtle #696D79`, `--hairline`.
  Semantic aliases (`--color-text`, `--color-bg-alt`, `--color-accent`, …) map onto these;
  prefer the semantic name in components. Status colours are for **functional state only**,
  never decoration.
  Verified contrast on `--paper`: ink 16.6:1, muted 5.85:1, subtle 4.74:1, cobalt 5.92:1.
- **Typography — self-hosted, latin subsets, in `public/fonts/` (SIL OFL):**
  **Space Grotesk** display (500/700) for headings and the logo · **Inter** text
  (400/500/600) · **JetBrains Mono** (400) for labels, data and code.
  `@font-face` with `font-display: swap` in `global.css`; display 700 + text 400 are
  preloaded in `BaseLayout.astro`. Three families, weights deliberately limited.
- **Structural devices:** `.eyebrow` (mono, uppercase, tracked) names a section;
  `.section__rule` puts that label against a hairline. Section openers are **left-aligned**
  — the centred header + subhead + grid cadence was removed. Headings use sentence case,
  except the brand line "One Platform. Every Solution."
- **Signature motif:** `InterconnectDiagram.astro` — the platform drawn as a schematic.
  Real capabilities enter from the top, resolve through one API spine, and leave as
  storefront / payments / invoicing, with an amber signal travelling the traces. It appears
  on the **home hero only** (`<Hero motif />`); `ProcessSpine.astro` reuses its node
  language for "how it works". Keeping it singular is what makes it a signature.
- **Logo:** the "1" is set as a node — the same cobalt rounded square the schematic uses.
- `text-wrap: balance` on headings, `text-wrap: pretty` on body copy.

**Anti-patterns — do not reintroduce** (`scripts/check-tells.sh` enforces these):
aurora blobs, dot-grid textures, clipped gradient text, 135deg gradient icon tiles,
marquees of capability pills, animated vanity counters, per-index reveal cascades,
`transition: all`, emoji or entity glyphs as icons, hardcoded brand hexes,
`var(--token, #fallback)`, competitor brand names, fabricated prices or metrics.

## Motion

Restrained by design — over-animation was one of the tells this site was rebuilt to remove.

- **Lenis smooth scroll** on all pages (`src/scripts/lenis-init.ts`, imported in `BaseLayout`).
- **One reveal:** IntersectionObserver adds `.is-visible` to `.reveal` (a short fade-up).
  `animations.ts` deliberately supports **no** per-element or per-index delay.
- **The motif's signal** is the only ambient animation: amber pulses along the schematic's
  traces, `stroke-dashoffset` only.
- **Hover:** cards firm their border and take a faint shadow — no lift. Link cues nudge
  their arrow 3px.
- **Primary easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo).
- **ALL animation** sits inside `@media (prefers-reduced-motion: no-preference)`, with a
  static fallback — including the motif, which collapses to a plain schematic.

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

## Navbar & Footer Harmony Rule (MUST)

The website **navbar AND footer** must stay in sync with the developer docs counterparts — users should perceive `1platform.pro` and `developer.1platform.pro` as one product.

**Source of truth on each side:**
- Website — `src/components/Header.astro` (navbar), `src/components/Footer.astro` (footer)
- Developer docs — `../1platform-api-developer/docusaurus.config.ts` (navbar), `../1platform-api-developer/src/theme/Footer/index.tsx` + `styles.module.css` (footer swizzle)

**Navbar contract:** Solutions, Features, Pricing, Docs, Blog + Get Started Free CTA. On the developer site, Solutions/Features/Pricing/Blog are absolute URLs back to this site; "Docs" points to `https://developer.1platform.pro/`.

**Solutions dropdown (source of truth — keep in sync with `docusaurus.config.ts` on the developer docs):** the "Solutions" item is a hybrid label-link + chevron-button. The label navigates to `/solutions/`; the chevron toggles a panel with these items in this exact order:

1. **Online Store** → `/solutions/online-store/`
2. **Website Builder** → `/solutions/website/`
3. **AI Content** → `/solutions/content/`
4. **Whitelabel Dashboard** → `/solutions/whitelabel/`
5. **Payments & Invoicing** → `/payments-invoicing/`
6. _(divider)_
7. **View all solutions** → `/solutions/`

Adding/removing/reordering any item in this list requires the same change in `../1platform-api-developer/docusaurus.config.ts` (the `type: 'dropdown'` items array under "Solutions") in the same commit. Keyboard a11y on the website side: `Enter`/`Space` toggle the panel from the chevron; `Escape` closes; `ArrowDown`/`ArrowUp` cycle items; `Tab` exits. Mobile: the panel renders as an indented inline sub-list inside the existing mobile menu — no overlay.

**Footer contract:** closing CTA ("Stop juggling separate tools" — deliberately carries **no number**; the site used to claim 4 / 5 / 6 / 19+ / 13+ in different places) + brand column + Solutions / Resources / Company / Legal columns + copyright bottom row. Same labels, same link targets, same ordering. The developer-docs footer is the Spanish counterpart of this same CTA ("Deja de hacer malabares con herramientas separadas") — if the wording changes here, change it there in the same commit.

**If you add/remove/rename a navbar item or footer column/link on this site, update the developer docs in the same change.**

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
- Fonts: self-host WOFF2 in `public/fonts/`, preload the critical two in `BaseLayout.astro`, `font-display: swap`, **3 families max** (display / text / mono), latin subsets, weights kept to what is actually used
- JS: zero by default — only `client:visible`/`client:load` islands ship JS. Never add `client:*` to presentational components
- CSS: scoped `<style>` per component + global CSS. Astro bundles and minifies automatically
- Animations: only `transform`/`opacity`, never `transition: all`

## Copy Conventions

- Active voice, second person, use numerals
- **Sentence case for headings.** Exceptions: the brand line "One Platform. Every Solution.",
  proper product names ("Online Store", "Electronic Invoicing"), and CTA button labels
- Curly quotes, ellipsis `…`, non-breaking spaces before units
- Specific CTA labels: "Get Started Free", "View API Docs" — never "Click Here"
- **Never state a number you cannot source.** No competitor prices, no traction metrics, no
  "replaces N tools" count. Claims are qualitative and checkable, or they are cut

## Messaging Strategy

- **Core message:** "One platform. Every solution."
- **Pillars:** Unified Platform, AI-Powered Pipeline, End-to-End Ecosystem, Scalable by Design, Interconnected Services
- **Pattern:** Comparison framed as unified vs fragmented — by capability and experience, never by invented competitor pricing. The closing CTA lives once, in the footer, on every page
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

⚠️ **There is no pull-request CI.** `.github/workflows/prod.yml` triggers only on
`push: [main]` + `workflow_dispatch`, and its Lighthouse step is informative
(`budgetPath: ""` — it warns to Slack, it does not block). The safety net is **local and
must be run before opening a PR**:

```bash
npm run build            # Must succeed, zero errors
./scripts/check-tells.sh # Design-system guard — see "Anti-patterns" above
npm run preview          # Visual review, including at 390px wide
# Lighthouse (local): Performance 95+, Accessibility 100, SEO 100
# Validate JSON-LD with Google Rich Results Test
# Test keyboard nav: Tab, Enter, Escape on all pages
# Test prefers-reduced-motion: all animation has a static fallback
```

## Version

Versioned in `package.json`; `prod.yml` auto-bumps it on merge to `main`, so **never bump
it by hand** — update `CHANGELOG.md` only.

## Path Aliases (tsconfig.json)

- `@layouts/*` → `src/layouts/*`
- `@components/*` → `src/components/*`
- `@styles/*` → `src/styles/*`
- `@scripts/*` → `src/scripts/*`
- `@content/*` → `src/content/*`
- `@assets/*` → `src/assets/*`
