# Changelog

All notable changes to the 1Platform Website will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Design system rebuilt around "ink & signal"** (`src/styles/global.css`). Near-monochrome ink on warm paper with one accent (`--cobalt`) and one signal (`--signal`, amber) reserved exclusively for the interconnect motif. Text tokens are verified against WCAG AA on the worst surface they can land on, not just on `--paper`.
- **Typography is now actually embedded.** Space Grotesk (display), Inter (text) and JetBrains Mono (labels/data) are self-hosted as latin-subset WOFF2 under `public/fonts/` with `@font-face` + `swap`, display 700 and text 400 preloaded. The faces had been *declared* since the beginning but never shipped, so every page had been rendering in `system-ui`.
- **`InterconnectDiagram.astro`** — the signature motif. The platform drawn as a schematic: real capabilities enter from the top, resolve through one API spine, and leave as storefront / payments / invoicing, with an amber signal travelling the traces. Inline SVG, no JS, static under `prefers-reduced-motion`. Used on the home hero only.
- **`Card.astro`, `Icon.astro` + `icons.ts`, `Check.astro`, `ProcessSpine.astro`** — one card primitive with real variants, one icon set, one yes/no mark, one numbered-sequence device.
- **`scripts/check-tells.sh`** — a design-system guard covering eleven categories of template tell. This repo has no pull-request CI (`prod.yml` runs on push to `main` only and its Lighthouse step is informative), so this is the durable net; run it before opening a PR.

### Changed
- **Home page rebuilt** with varied editorial layouts — asymmetric hero, wide statement, curated capabilities (four featured plus a grouped index instead of a wall of sixteen identical cards), process spine, copy/code split, audience list. Section openers are left-aligned and named by a mono eyebrow, replacing the repeated "centred header + subhead + grid + `section--alt`" cadence.
- **Pricing page rewritten** (WDR-07): the nine hardcoded rainbow hexes and the inline `style={color: ...}` injection are gone, as are the `$0 / ∞ / 24h / 100%` vanity tiles. The pay-as-you-use model is now explained.
- **`compare/*` unified** (WDR-08): the three pages each carried a near-identical ~250-line `<style>` block that rebuilt a parallel design system. They now compose the shared components. `1platform-vs-wp-auto-pro` compares against the generic category ("WordPress content plugins") rather than a named competitor, resolving a long-standing conflict with the ecosystem rule; the route is unchanged.
- **`CLAUDE.md` resynced with reality** — it described dark mode `#0a0a0a`, a cosmos.so animation system, an 8-step pipeline, components that no longer exist, and version 0.9.0 against a package at 2.5.4.
- Shared `.btn` tap target raised from 40px (and `.btn--sm` from 32px) to the 44px WCAG floor.

### Removed
- **Fabricated content.** "Platform in Numbers" (250+ / 5,000+ / 10,000+ / 19+, hand-maintained and unsourced) and its animated count-up; competitor prices ("around $30/mo", "$120+/mo") across the comparison table and solution pages; invented figures on `compare/1platform-vs-custom-integration` ("19+ APIs", "6-12 weeks", "tens of thousands of dollars"). The site's contradictory "replaces 4 / 5 / 6 / 19+ / 13+ services" claims are now one phrase carrying no number.
- **The template kit**: aurora blobs and dot-grid from the hero, the marquee of capability pills, the per-index reveal cascade, gradient text, 135deg gradient icon tiles, and the frosted-glass header chrome. `PillarSection`, `FeatureCard`, `UseCaseCard`, `SolutionCard`, `MetricCounter`, `LogoCarousel`, `PipelineAnimation` and `scripts/pipeline.ts` are deleted.
- Empty `sameAs: []` stub from the Organization JSON-LD — no real profiles exist to list.

### Fixed
- **AA contrast failure** on the home page (code block header at 4.45:1), fixed at the token so it holds on every surface rather than at the instance.
- **Content no longer requires JavaScript to be visible.** `.reveal` starts at `opacity: 0` and only JS adds `.is-visible`, so with JS disabled every section below the hero rendered blank. The rule is now gated on `scripting: enabled`.
- **Horizontal overflow on mobile** caused by the code block's long lines (grid children default to `min-width: auto`).

### Added
- **Solutions navbar dropdown** in `src/components/Header.astro`. The Solutions label remains a link to `/solutions/`; an adjacent chevron `<button>` toggles a panel with Online Store, Website Builder, AI Content, Whitelabel Dashboard, Payments & Invoicing, a divider, and View all solutions. Full keyboard a11y (Enter/Space toggle from chevron, Escape closes + restores focus, ArrowUp/ArrowDown cycle items, Tab exits the panel), `aria-expanded` / `aria-controls` / `role="menu"` / `role="menuitem"`, and click-outside / hover-to-open behavior. On mobile (≤768px) the chevron and floating panel are hidden and the items render as an indented inline sub-list inside the existing mobile menu. Vanilla JS, no React island.
- **Blog categories** `ecommerce` and `payments-invoicing` added to `src/content/config.ts` so posts can be organized around the refocused outcome narrative.
- **Three new blog posts** under the refocused categories:
  - `launch-online-store-30-minutes` (ecommerce) — a 30-minute online-store launch checklist
  - `electronic-invoicing-online-business` (payments-invoicing) — compliance + workflow walkthrough
  - `integrating-payments-into-your-saas` (payments-invoicing) — developer-focused payments API guide
- **Changelog content collection entry**: `src/content/changelog/2026-05-20-refocus-positioning.md` summarizing the homepage refocus (website PR #23) and developer-docs footer sync (developer-docs PR #18).

### Changed
- **`about.astro`** refreshed to drop the "19+ separate subscriptions" framing and the SEO-centric mission language. Reframed around the six unified services (store, website, AI content, whitelabel dashboard, payments & invoicing, developer API) and the outcome narrative (sell / build / grow / build-on-API). Structure and capabilities grid preserved.
- **`compare/1platform-vs-custom-integration.astro`** hero meta description, FAQ answer, cost-grid prose, and closing CTA reframed away from "19+ services" toward category wording. Comparison table rows (the SEO content) left intact.
- **`blog/1platform-vs-custom-toolchain.md`** intro framing refreshed: the "19+ separate API accounts" claim replaced with wording that matches the post's own list of services.
- **Three new blog-post titles shortened** for SERP (`launch-online-store-30-minutes` 82→43 chars; `electronic-invoicing-online-business` 74→42; `integrating-payments-into-your-saas` 74→39). Slugs unchanged, H1 follows the new title. Subtitles/hooks live in the post body now.
- **Four meta descriptions trimmed to ≤155 chars** so they stop truncating in SERP: `compare/1platform-vs-custom-integration.astro`, `for-agencies.astro`, `for-developers.astro`, and `blog/electronic-invoicing-online-business.md`.
- **`/blog/` and `/changelog/` index meta descriptions expanded** from 110/83 chars to ~155 chars, weaving the refocus keywords (online store, payments, invoicing, AI content, whitelabel dashboard, developer API) into the SERP snippet. Closes #29.

### Fixed
- **Leading space in `<title>` of all three compare pages** (`" 1Platform vs. ..."`) removed. Pre-existing typo from before the refocus.

### Fixed
- **Default Open Graph / Twitter image** fallback in `BaseLayout.astro` and `BlogLayout.astro` switched from `/og/default.png` (which 404'd in production and blanked every social-share preview) to `/logo-oauth-120x120.png`, an asset that actually ships in `public/`. Per-page overrides still win; this only changes the default. A proper 1200×630 OG asset can replace it later without touching the layouts.
- **Production deploy health check** in `.github/workflows/prod.yml` no longer trips a SIGPIPE under `set -euo pipefail`. The check now uses a here-string (`grep -q "1Platform" <<< "$BODY"`) instead of `echo "$BODY" | grep -q`, which closed the pipe early and caused 10/10 retries to falsely report failure on already-deployed builds (run 26198698104 — Phase 2B's navbar dropdown rolled back even though the rsync had succeeded).
- **"Get Started Free" CTA** now points to `https://app.1platform.pro/app/` (the dashboard app) instead of the bare apex, which served an "Index of /" directory listing. Applied across Header, Footer, Hero, and every page-level CTA (Home, About, Solutions, Features, Pricing, Why-1Platform). Closes #11
- **compare/1platform-vs-ai-writing-tools `<title>` and meta description** trimmed (title 73 → 57 chars; description 177 → 155 chars) so both stop truncating in SERP. This was the one compare page that polish PR #27 missed. Closes #28.
- **"Contact Sales" / "Talk to Sales" buttons did nothing on click** for users with the Cloudflare email-decode script blocked (uBlock Origin, Brave shields, NoScript). The 8 affected buttons (Pricing × 3, For Agencies × 3, Whitelabel × 2) were `mailto:sales@1platform.pro` links, which Cloudflare auto-rewrote to `/cdn-cgi/l/email-protection#...` — and stayed in that rewritten state when the decoder was blocked. Replaced with links to a new `/contact/` landing page that constructs the `mailto:` href in client-side JS at click time (Cloudflare can't pattern-match an email that isn't in the HTML), shows the address visibly, offers a "Copy Email" fallback, and preserves the previous subject prefills via a `?topic=agency|whitelabel` query parameter. Closes #14.

### Added
- **`/contact/` landing page** (`src/pages/contact.astro`) — minimal sales contact page with response-time SLA, in-app chat handoff for existing accounts, and a runtime-constructed `mailto:` that survives email-obfuscation proxies. JSON-LD `ContactPage` schema + breadcrumb.
- **Real 1200×630 Open Graph default image** at `public/og/default.png` (108 KB) — brand-coherent wordmark, tagline, dot grid + subtle aurora, generated via `scripts/generate-og-default.py` (Pillow). `BaseLayout.astro` and `BlogLayout.astro` defaults flipped from `/logo-oauth-120x120.png` back to `/og/default.png`. A designer-made replacement can drop into the same path with zero code change. Closes #33.
- **Per-page Open Graph images** for 8 Tier 1 surfaces (5 solution sub-pages + 3 new refocus blog posts) at `public/og/{solution,blog}-*.png`. All 1200×630, all under 200 KB. Generated via `scripts/generate-og-images.py` (Pillow). Solutions: `online-store`, `website`, `content`, `whitelabel`, `payments-invoicing`. Blog: `launch-online-store-30-minutes`, `electronic-invoicing-online-business`, `integrating-payments-into-your-saas`. Each `.astro` page now passes `ogImage="/og/…"` to `<BaseLayout>`; each blog post sets `ogImage:` in frontmatter. Twitter / LinkedIn / Slack previews now reflect the page's specific topic instead of falling back to the brand default. Closes #32.

### Changed
- **CI Lighthouse coverage expanded** in `.github/workflows/prod.yml` from 3 URLs (`/`, `/features/`, `/pricing/`) to all 13 refocus URLs from issue #31: homepage, all 5 solutions sub-pages, `/payments-invoicing/`, `/pricing/`, `/for-developers/`, `/for-agencies/`, and the 3 new blog posts. Reports are published to the lighthouse-ci temporary public storage on every deploy — recurring coverage instead of one-shot manual audits. Score thresholds remain informational for now (`budgetPath: ""`); promote to enforced budgets via `lighthouserc.json` once per-page baselines are known. Closes #31.

## [2.1.0] — 2026-04-27

### Added
- **Five new solutions** to the Solutions page and homepage solutions grid:
  - **Whitelabel Dashboard** — Bootstrap a fully branded dashboard from one API call (branding, theme, layout, i18n, home KPIs)
  - **Webhooks** — Subscribe to real-time payment lifecycle events with HMAC-signed payloads, allowed-domain registration, and secret rotation
  - **In-App Notifications** — Push notifications to a single user or broadcast to all; list, mark as read, and read the unread count
  - **Support Center** — Embed an in-app help center with tickets, threaded replies, and a public FAQ catalog
  - **Referrals** — Resolve referral codes to referrer username and pre-filled signup URLs for personalized landing pages
- **Matching feature cards** on the Features page across the Publishing & Distribution (Referrals), Payments & Invoicing (Webhooks), and Analytics, AI Agents & Operations (Whitelabel Dashboard, In-App Notifications, Support Center) sections
- **Changelog content collection entry**: `src/content/changelog/2026-04-27-v1.4.0.md` documenting the eight new developer-docs flows, the new `GET /plans` endpoint, the five new website solutions, and the comparison-page fixes

### Changed
- **Automation pillar** renamed from "Automation & AI Agents" to "Automation & Operations" to reflect the broader scope (now includes whitelabel dashboards, notifications, support, and webhooks alongside AI agents and activity logs)
- **Analytics & AI Agents** section on Features page renamed to "Analytics, AI Agents & Operations" to align with the expanded pillar
- **Homepage CTA banner** copy from "Stop Managing 15+ Different Tools" to "Stop Managing 19+ Different Tools" — consistent with footer and metric counter

### Fixed
- **Phantom endpoint references** in the comparison pages (`/keywords/research`, `/content/generate`, `/cms/publish`, `/indexing/submit`, `/links/build`, `/payments/create`, `/invoicing/generate`, `/images/search`) replaced with real OpenAPI spec endpoints (`/posts/keywords/`, `/posts/content/`, `/posts/indexing/`, `/users/transactions`, `/businesses/{id}/invoices`, `/users/generations/images`)
- **Activity Logs feature card** rendering: `icons.logs` (undefined) → `icons.activityLogs` (correctly defined in the icons map)

## [0.9.0] — 2026-04-07

### Added
- **Domain Management solution**: Added Domain Management to homepage solutions grid, features page (Publishing & Distribution section), solutions page (Distribution & Growth pillar), and footer navigation
- **Changelog entry**: `src/content/changelog/2026-04-07-v1.3.0.md` for the Domain Management addition

### Changed
- **Solution count**: Updated from 18+ to 19+ across all pages (homepage, solutions, features, pricing, why-1platform, about, comparison pages, docs index, blog content, and comparison table) to reflect Domain Management as the 19th solution

## [0.7.0] — 2026-04-06

### Added
- **Domain Registration solution**: New solution card on homepage, solutions, and features pages covering domain availability, registration, DNS, nameservers, transfers, and registrar lock
- **Ad Revenue Tracking solution**: New solution card for AdSense-style ad account management, earnings monitoring, and custom reports
- **Activity Logs solution**: New solution card for API call tracking, filtering, client-side events, and observability
- **API reference sections**: Added Domain Registration (11 endpoints), Ad Revenue (6 endpoints), and Activity Logs (4 endpoints) to docs API reference

### Changed
- **Solution count**: Updated "15+ Solutions" to "18+ Solutions" across all pages (homepage, solutions, features)
- **CTA copy**: Updated "Stop Managing 10 Different Tools" to "Stop Managing 15+ Different Tools"

### Fixed
- **Provider name leak**: Removed "publisuites" from api-reference.md endpoint path — replaced with "link-building"

## [0.5.0] — 2026-04-06

### Added

- **Domain Management solution**: New solution across homepage, solutions, features, and footer — register domains, manage DNS records, configure nameservers, set WHOIS privacy, and handle transfers via API (15 endpoints).
- Domain Management code example on features page.

### Changed

- Updated solution counts from 18+ to 19+ across all pages (index, solutions, features, pricing, about, why-1platform).
- Updated metric counter on homepage from 18 to 19.
- Updated footer with Domain Management link.

## [0.3.0] — 2026-04-05

### Added

- **Ad Revenue Management solution**: New solution across all pages — connect ad accounts via OAuth, monitor earnings by page, track RPM/CTR, review policy issues, and generate revenue reports (17 API endpoints)
- **Activity Logs solution**: Full API observability — server-side logs, client-side event ingestion, trace ID correlation, and retention management (4 API endpoints)
- **5 new capability cards on About page**: Search Console, Analytics, Ad Revenue, AI Agents, Activity Logs — now matches the full solution set
- **Ad Revenue pricing card**: Added to pricing grid with includes list
- **Footer links**: Ad Revenue and Activity Logs added to Solutions column
- **Changelog entry**: `2026-04-05-v1.2.0.md` content collection entry

### Fixed

- **Provider name leak**: Removed `claude-sonnet-4-6` model name from AI Agents code example in features page, replaced with generic `1platform-agent-default`

### Changed

- **Solution count**: Updated from 15+ to 18+ across all pages (homepage, solutions, features, pricing, why-1platform, about, comparison pages, docs index, blog) to reflect current API capabilities
- **Pricing footnote**: Updated "Plus 5 more solutions" to "Plus 9 more solutions" with expanded list
- **Intelligence pillar description**: Updated to mention ad revenue management
- **Automation pillar description**: Updated to mention activity logs
- **Analytics section title**: Renamed to "Analytics, Monetization & AI Agents" on features page

## [0.2.2] — 2026-04-01

### Added

- **OAuth logo**: Added 120x120 OAuth logo asset for Google integration flows

### Changed

- **CLAUDE.md**: Updated project documentation to reflect current codebase (new components, pages, version)

## [0.1.0] — 2026-03-28

### Added

- **Google Analytics solution** on solutions page (Intelligence pillar), homepage grid, features page with code example, and footer links
- **AI Agents solution** as new "Automation & AI Agents" pillar on solutions page, homepage grid, features page with code example, and footer links
- **Analytics & AI Agents section** on features page with 2 feature cards and 2 API code examples

### Changed

- Updated solution count from "13+" to "15+" across all 10 affected files (33 occurrences): homepage, solutions, features, pricing, why-1platform, about, comparison pages, docs index, ComparisonTable component, and blog post
- Updated homepage MetricCounter from 13 to 15
- Updated solutions page Intelligence pillar description to include analytics
- Updated features page CTA count to "15+"

## [0.0.1] — 2026-03-18

### Added

- Initial release of the 1Platform marketing website
- Homepage with hero, solutions overview, and metrics
- Features, pricing, solutions, about, and why-1platform pages
- Blog with content collections (5 posts)
- Documentation section (6 pages)
- Changelog section with RSS feed
- Comparison pages (1Platform vs competitors)
- Legal pages (privacy, terms, cookies)
- Full SEO setup (JSON-LD, Open Graph, sitemap, robots.txt)
- Dark-mode-only design system with electric blue accent
- Smooth scrolling (Lenis) and reveal animations
- CI/CD pipeline with GitHub Actions
