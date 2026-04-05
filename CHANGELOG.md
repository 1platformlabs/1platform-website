# Changelog

All notable changes to the 1Platform Website will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
