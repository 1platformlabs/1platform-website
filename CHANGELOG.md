# Changelog

All notable changes to the 1Platform Website will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
