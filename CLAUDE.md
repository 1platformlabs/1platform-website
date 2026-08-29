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
  text), `--muted #5B5F6B`, `--subtle #656974`, `--hairline`.
  Semantic aliases (`--color-text`, `--color-bg-alt`, `--color-accent`, …) map onto these;
  prefer the semantic name in components. Status colours are for **functional state only**,
  never decoration.
  **Contrast is verified against the WORST surface a token can land on** — `--paper`,
  `--surface` and `--recessed` — not just `--paper`. Worst-case ratios: ink 15.59:1,
  muted 5.49:1, subtle 4.73:1, cobalt 5.56:1, all on `--recessed`.
  `--subtle` is `#656974` for exactly this reason: the earlier `#696D79` cleared paper
  (4.74) and surface (5.17) but fell to **4.45 on `--recessed`**, which is where
  code-block headers sit. Measuring only on paper is what hid it.
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

### The home system (epic home-landing-redesign)

The home (`/`, `/es/`) and the site chrome (announcement bar, header, footer)
draw with a SECOND palette that coexists with ink & signal (D-2): the `--ref-*`
tokens in `global.css`, measured on a reference landing whose geometry the home
replicates with 1Platform's content. Dark surfaces (`--ref-dark`,
`--ref-dark-2`, `--ref-pill`, `--ref-card-dark`), a light canvas
(`--ref-canvas`), radii 6 px (buttons/chips) and 8 px (cards/panels), a dot
texture (`.ref-dot-grid`, 15 px pitch — exempt from the guard's dot-grid rule
BY THAT NAME ONLY), and two tints that deliberately diverge from the measured
reference because AA wins over parity (D-6): `--ref-orange-cta #C63A12` under
light text (the exact `--ref-orange #F04E23` is for surfaces that carry none)
and `--ref-fg-dim #9A9A9A` for links on the footer card.
`tests/contrast.spec.ts` pins the arithmetic; `tests/ref-fidelity.spec.ts`
measures the geometry against `tests/ref-fidelity.table.json` on every run.
**The home centres its openers** — the deliberate exception to the left-aligned
rule below; every other page keeps it. The reference site itself is never
named anywhere in this repo (guard rule 15 scans for it as a hashed token);
its measurements live with the epic, outside this tree.

**Anti-patterns — do not reintroduce** (`scripts/check-tells.sh` enforces these):
aurora blobs, dot-grid textures (the home's `ref-dot-grid` is the ONE named
exemption), clipped gradient text, 135deg gradient icon tiles,
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
- **The home's two WebGL scenes** (hero fan, module carousel) are UPGRADES over
  CSS 3D layers that are the page: they mount after `astro:page-load` +
  `requestIdleCallback`, only ≥ 769 px with WebGL2 and no reduced-motion, read
  their geometry from the CSS layer's data attributes, take scroll from Lenis
  (`globalThis.__lenis`, the single scroll source) and dispose fully in
  `astro:before-swap`. A failed upgrade never costs the page.

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
Both chromes draw with the `--ref-*` tokens (this repo is upstream:
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

**Navbar contract (since the home redesign):** a 74 px transparent fixed bar
carrying exactly two things — a 230 × 42 dark pill (logo + menu button) on the
left, and two 44 px CTAs on the right ("Sign In" on `--ref-yellow`,
"Get Started Free" on `--ref-orange-cta`). **No navigation link is visible in
the bar at any width.** The navigation — Solutions with its seven destinations,
Features, Pricing, Docs, Blog, the CTA and `EN | ES` — lives in the panel the
menu button opens (`#mobile-menu` here; the theme's mobile sidebar, rendered at
every width by a wrap swizzle, on the docs side). Without JavaScript the panel
renders open under the pill (`@media (scripting: none)`) — navigation that only
exists behind a script is not navigation. The docs side keeps its search box in
the bar: a documentation portal without search is not a portal.

**Solutions destinations (order matters, mirror in `docusaurus.config.ts`):**
Online Store → `/solutions/online-store/` · Website Builder →
`/solutions/website/` · AI Content → `/solutions/content/` · Deliveries →
`/solutions/deliveries/` · Advertising → `/solutions/ads/` · Whitelabel
Dashboard → `/solutions/whitelabel/` · Payments & Invoicing →
`/payments-invoicing/` · then a divider and "View all solutions" →
`/solutions/`.

**Footer contract (since the home redesign):** a `--ref-dark` band with the
brand watermark (an SVG drawing, deliberately not HTML text — axe's
color-contrast applies to glyphs sighted readers see) behind one
`--ref-card-dark` card: an e-mail sign-up on the left (composes a `mailto:` in
the browser — there is NO list backend; without JS it goes to the contact
page), three columns — PRODUCT (the seven solutions + All Solutions), COMPANY
(About · Pricing · For Agencies · For Developers · Blog), RESOURCES
(Documentation · API Reference · Code Examples · Changelog) — and a legal row
(copyright · Terms · Privacy · Cookie preferences). **There is no closing CTA
and no "Status" claim** — the reference has none and there is no status page to
back one. `tests/footer-ref.spec.ts` pins the exact link set.

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
  presentational components (the guard rejects it). The HOME carries a measured
  budget instead: **210 KB gzip** for everything it loads (guard rule 14
  statically, `tests/js-budget.spec.ts` over the network). The number is
  arithmetic, not taste: three 0.185 is ~188 KB gzip WHOLE — `module.min`
  86.8 + the `core.min` it imports, 101.5; measuring only the first file is
  how budgets get invented — plus ~17 KB of our own and ~2% headroom. There is
  no room for a second dependency, which is the point
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
  210 KB gzip (rule 14) and every other page stays effectively zero
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
npm test                 # 100+ Playwright tests against the real dist/
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
