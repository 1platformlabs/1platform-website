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

## Design System — editorial paper and cobalt

The site is **light**: `color-scheme: light`, `theme-color: #F5F1E8`. Ink on
warm paper, cobalt navigation and dark editorial footer surfaces establish the
system across every public route.

- **Palette (tokens in `src/styles/global.css`)** — `--ink #13151A`,
  `--paper #F5F1E8`, `--surface #FFFDF8`, `--recessed #ECE5D8`,
  `--cobalt #1748A7`, `--cobalt-deep #10377F`, `--cobalt-bright #78A6FF`,
  `--cobalt-wash #E5EDFC`, `--muted #555A64`, `--subtle #626873`, and the
  dark-footer aliases `--color-footer-*`. Prefer semantic aliases inside
  components. Status colours are functional only, never decoration.
  `tests/contrast.spec.ts` pins every foreground/surface pair used by the
  public chrome at AA or better.
- **Typography — self-hosted, latin subsets, in `public/fonts/` (SIL OFL):**
  **Space Grotesk** display (500/700) for headings and the logo · **Inter** text
  (400/500/600) · **JetBrains Mono** (400) for labels, data and code ·
  **Instrument Serif** (400) — the home system's display serif (56 px openers,
  the footer card's heading), added by the home redesign. `@font-face` with
  `font-display: swap` in `global.css`; display 700, text 400 and the serif are
  preloaded in `BaseLayout.astro`. Four families, weights deliberately limited
  — the serif ships exactly one.
- **Structural devices:** `.eyebrow` (mono, uppercase, tracked) names a section;
  `.section__rule` puts that label against a hairline. Section openers are **left-aligned**
  (the home is the one exception — see "The home system"). Headings use sentence case,
  except the brand line "One Platform. Every Solution."
- **Signature motif:** `InterconnectDiagram.astro` — the platform drawn as a schematic.
  Real capabilities enter from the top, resolve through one API spine, and leave as
  storefront / payments / invoicing, with an amber signal travelling the traces. It appears
  on the **home hero only** (`<Hero motif />`); `ProcessSpine.astro` reuses its node
  language for "how it works". Keeping it singular is what makes it a signature.
- **Logo:** the "1" is set as a node — the same cobalt rounded square the schematic uses.
- `text-wrap: balance` on headings, `text-wrap: pretty` on body copy.

### The home system

The home (`/`, `/es/`) opens on a white orbital commerce scene built from
semantic HTML and CSS: Online Store, online payment, electronic invoicing and
delivery remain visible together while emphasis follows one order through the
four states. It contains no radio inputs, fake selectors or carousel controls.
The four-step index below the fold repeats the same narrative as real links,
then hands off to the editorial Astro Image assets under `src/assets/editorial/`
and the dark closing footer. Keep interactions to native controls and small
progressive enhancements; every motion path must have a reduced-motion state.
`tests/chrome-navigation.spec.ts`, `tests/contrast.spec.ts` and the visual
baselines are the contracts for this system.

**Anti-patterns — do not reintroduce** (`scripts/check-tells.sh` enforces these):
aurora blobs, decorative gradient text, gradient icon tiles,
marquees of capability pills, animated vanity counters, per-index reveal cascades,
`transition: all`, emoji or entity glyphs as icons, hardcoded brand hexes,
`var(--token, #fallback)`, competitor brand names, fabricated prices or metrics.

## Motion

Restrained by design — over-animation was one of the tells this site was rebuilt to remove.

- **Lenis smooth scroll** on all pages (`src/scripts/lenis-init.ts`, imported in `BaseLayout`).
- **One reveal:** IntersectionObserver adds `.is-visible` to `.reveal` (a short fade-up).
  `animations.ts` deliberately supports **no** per-element or per-index delay.
- **Decorative motion** is limited to opacity, colour and transform changes in
  the editorial system. The home orbit is the only ambient sequence and its
  four cards never disappear, so the story remains legible at every phase;
  public pages never mount a canvas or WebGL runtime.
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

**The two sides share the design system itself, not just the link lists.**
Both chromes draw with the shared editorial tokens (this repo is upstream:
`src/styles/global.css` first, `../1platform-api-developer/src/css/custom.css`
follows), the four self-hosted typefaces and the cobalt-node logo. The icon
registry (`src/components/icons.ts`) is likewise upstream of
`../1platform-api-developer/src/components/Icon/icons.ts`.

**Language is the one deliberate difference:** this site is English, the developer
portal is Spanish. The harmony contract is about **order, destinations and
structure**, never about the literal strings.

**Source of truth on each side:**
- Website — `src/components/Header.astro` (navbar), `src/components/Footer.astro` (footer),
  `src/components/AnnouncementBar.astro` (bar), `src/components/Logo.astro` (mark),
  `src/styles/global.css` (tokens), `src/components/icons.ts` (icons)
- Developer docs — `../1platform-api-developer/docusaurus.config.ts` (navbar),
  `.../src/theme/Footer/` (footer), `.../src/theme/Navbar/MobileSidebar/` (panel),
  `.../src/theme/Logo/` (mark), `.../src/css/custom.css` (tokens)

**Navbar contract:** a floating, paper-coloured rail holds the logo, Solutions
with its seven destinations, Features, Pricing, Docs, Blog and the CTA. A
circular menu opens the compact navigation and the `EN | ES` control at small
viewports; without JavaScript the compact menu remains available. The docs side
keeps the same destinations and CTA in its desktop rail, plus search.

**Solutions destinations (order matters, mirror in `docusaurus.config.ts`):**
Online Store → `/solutions/online-store/` · Website Builder →
`/solutions/website/` · AI Content → `/solutions/content/` · Deliveries →
`/solutions/deliveries/` · Advertising → `/solutions/ads/` · Whitelabel
Dashboard → `/solutions/whitelabel/` · Payments & Invoicing →
`/payments-invoicing/` · then a divider and "View all solutions" →
`/solutions/`.

**Footer contract:** a dark editorial band opens with the logo, brand line and
CTA, followed by a `mailto:` sign-up, three columns — PRODUCT (the seven
solutions + All Solutions), COMPANY (About · Pricing · For Agencies · For
Developers · Blog), RESOURCES (Documentation · API Reference · Code Examples ·
Changelog) — and a legal row (copyright · Terms · Privacy · Cookie preferences).
`tests/footer-system.spec.ts` pins the exact link set and keyboard behaviour.

**If you add/remove/rename a navbar item or footer column/link on this site, update the developer docs in the same change.**

**Exemption — language controls.** The `EN | ES` control in the menu panel is exempt
from the rule above. It is a control over how the current page is presented, not an
entry in the information architecture, and the developer docs cannot mirror it —
that site is Spanish-only (`docusaurus.config.ts`), so it has no second language
to offer.

## Internationalisation

The site is bilingual. **English lives at the root and Spanish under `/es/`** — no English URL
carries a language prefix, because the ~26 English URLs are already indexed and re-prefixing them
would spend that history for nothing.

**Correction (2026-07-29) to the reason, not the layout.** The reason recorded here used to be that
the site "has no mechanism to redirect them (no `_redirects`, no `_headers`, and the document root's
`.htaccess` is excluded from the deploy rsync, so it is not ours to edit)". That stopped being true
when the cPanel channel replaced the rsync deploy: **`deploy/cpanel/htaccess/landing.htaccess` is
versioned in this repo and published as the document root's `.htaccess` with every release** — it is
where `DirectorySlash`, the real 404 and the `www` → apex 301 live, and it is never edited by hand on
the host. The URL layout above still stands, but on its own merits. Anything redirect- or
header-shaped now belongs in that file, under the hard rule documented in
`deploy/cpanel/README.md`: **it may not force HTTPS on the same host** (the Cloudflare zone is
`flexible`, so that loops); changing the host is fine, and `deploy/cpanel/assemble.sh` fails the
build on the difference.

**One source of layout, two sources of text.** A page's markup lives once in
`src/page-content/<Name>.astro`; its copy lives beside it in `src/i18n/messages/pages/<slug>.ts`
with English and Spanish in the same file; and `src/pages/<slug>.astro` plus
`src/pages/es/<slug>.astro` are three-line shells that declare the two routes. Astro does not
generate the second tree from config — every `/es/` route exists because a file declares it.

- `useI18n(Astro.url.pathname)` returns `{ t, l, locale }`. `t()` translates and **throws** on an
  unknown key; there is no fallback to English, deliberately, because a silent fallback produces
  half-translated pages nobody notices. `l()` localises an internal path and passes absolute URLs,
  `mailto:` and fragments through untouched. **Every internal href goes through `l()`.**
- Message modules register themselves by existing (`import.meta.glob`), so no shared index file
  has to be edited to add a page. Two modules defining the same key fails the build.
- A key consumed through a CONTENT TABLE (the home's personas/modules/pricing/FAQ
  tables) is declared with `i18nKey('…')` from `src/i18n/key.ts` — the explicit
  marker `tests/i18n-catalogue.spec.ts` counts as a reference, since the
  extractor cannot follow a variable into `t()`.
- Parity is enforced twice: `defineMessages` types Spanish against English (a compile error), and
  `assertParity()` in `src/i18n/index.ts` throws during **every build**, because `astro build`
  does not typecheck and a guarantee that depends on remembering to run `npm run typecheck` is
  not one.
- Dates: `formatDate(date, locale)`. Never `toLocaleDateString('en-US')` — the guard rejects a
  pinned locale tag.
- Collections carry their locale in the **directory** (`src/content/blog/{en,es}/`), paired by a
  required `translationKey`. Read them only through `src/i18n/collections.ts`; a bare
  `getCollection` is unfiltered and will mix languages.
- **`hreflang` is the single source of truth for "a translation exists".** The same `alternates`
  map produces the `<head>` block, the language control's destinations, and the target the
  first-visit script redirects to. A page with no twin simply omits that locale, and all three do
  the right thing without any of them knowing why.
- Legal policies are the exception to the catalogue: their prose lives in a partial per language
  (`src/page-content/legal/*.{en,es}.astro`), because a legal text in two languages is two
  documents, not one document with substituted labels. Only title and description are catalogued.

Language selection on first visit happens in an inline blocking script in `BaseLayout.astro`,
emitted **after** the `hreflang` block it reads. Spanish and non-English browsers go to `/es/`;
English browsers stay; the `1p_lang` cookie always wins; and **`/es/` is never redirected**, which
protects shared links and keeps Googlebot — which renders JS as en-US — from being bounced out of
the Spanish tree.

Verify with `npm test` (36 Playwright tests against the real `dist/`) and `npm run check`
(design-system guard plus its 24 self-tests).

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
- JS: zero by default on every page but the home — never add `client:*` to
  presentational components (the guard rejects it). The home has a **64 KB
  gzip** public-JS ceiling, enforced statically and by
  `tests/js-budget.spec.ts` over the network. Do not add WebGL or a new runtime
  dependency to cross that boundary.
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
- **Pattern:** Comparison framed as unified vs fragmented — by capability and experience, never by invented competitor pricing. Since the home redesign the footer carries no closing CTA: the header's two CTAs and the pricing section do that work
- **"Replaces" positioning:** Each solution names generic tool categories it replaces (never competitor brand names)
- **Interconnection narrative:** Emphasize that all services work together (keywords → content → images → publish → index → backlinks → payments → invoicing)

## Restrictions (NEVER)

- Never use `client:*` on presentational components; the home's JS budget is
  64 KB gzip (rule 14) and every other page stays effectively zero
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
npm run build            # Must succeed, zero errors — BEFORE check (rule 14 measures dist/)
npm run check            # Design-system guard (15 rules) + its 43 self-tests
npm test                 # Playwright tests against the real dist/
npm run typecheck        # astro check
npm run test:visual      # visual baseline, compared in the Playwright container
# Lighthouse (local): Performance 90+ on the home (95+ elsewhere), A11y 100, SEO 100
# Media: node scripts/capture-product-media.mjs --check (OCR gate; MEDIA_REQUIRED=1 pre-merge)
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
