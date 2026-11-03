# Floating WhatsApp — local acceptance and release plan

## Scope

One Website PR adds a fixed lower-right contact link to the infrastructure and photographic landing compositions. The URL is read from the resolved tenant; photographic pages preserve their existing hero sales message. Missing, malformed and non-WhatsApp destinations render no control. No API deployment, database migration, new configuration, package publication or tenant activation is needed.

Public contact census (2026-11-02): 1Platform +50253946564; Medipago +50236532841; Vende Fácil +50252370065. The old Vende Fácil host redirects to vendefacil.gt. These are the already published conversations: no message was sent and an agent response was not tested.

## Real local bank

- Website branch: feat/landing-whatsapp-float, based on 153d63bf0fc8883fba1cc728611dc93c60004ba3.
- Core branch and control: 0ee54244bddb400282f62ccffe0b698508a8315a, full app.main:app, unchanged API code.
- Private MongoDB 7: mongo-e2e-landing-whatsapp-float, loopback 27104, DB e2e_landing_whatsapp_float.
- Branch ports: Core 8410, Website 4721. Control: Core 8710, Website 5021. Persistent worktrees named landing-whatsapp-float-{api,website}{,-control}.
- Public SiteTenant and published SitePage census persisted through real models with tests/bench/seed_whatsapp_contacts.py. No HTTP doubles, MSW, QA fallback, private customer data or production writes. Public endpoints do not need an authenticated user session.
- `tests/bench/whatsapp-contacts.real.mjs`: 14 passing cases. Four roots/locales × desktop 1440×900, mobile 390×844 and landscape 844×390; fixed geometry, original CTA destination equality, keyboard focus, reduced motion, mobile menu/Escape, no horizontal overflow, no-JS contact, unknown-host 404. Browser screenshots and results are beside this file.
- Same probe against main control exits 1: `Missing floating WhatsApp: 1platform.pro/` (0 versus 1). Thus the gate discriminates the requested behavior.
- Reviewed the 12 browser captures and before/after Linux screenshot differences. Only the requested control and hero footer clearance change. Retained the unrelated clinic reference.

## Regressions and local gates

The initial full suite detected the contact outside a landmark. Wrapping it in a labeled aside fixes the existing Axe checks, including no-JS. An overlapping local Docker build temporarily replaced dist during a second suite; the visual build now runs in a separate disposable directory and the full suite was rerun with exclusive build ownership (no retries or threshold changes).

Node 24.18.0; typecheck: 0 errors, 0 warnings; build: passed; design/provider guard and 53 negative self-tests: passed; functional suite: 597 passed, 25 existing skips; Linux Playwright 1.61.1 visual gate: 11 passed; served baseline: 100 identical, 0 differing, 0 wrong. Media OCR: 78 produced, 0 placeholders. Gitleaks: no leaks.

The byte baseline deliberately changes only `/` and `/es/`; seven home/commerce visual references add the button. No thresholds, retries or test exclusions changed.

## Release

PR workflow: verification only. Merge to main triggers prod.yml: build, tag/release and the existing dedicated-host deployment. The legacy cPanel job stays disabled. Production health before release is recorded twice per domain in pre-release.json and equals main 153d63bf0fc8883fba1cc728611dc93c60004ba3.

Wait for all PR checks before merge; follow the deploy and verify `/api/health` twice against the merge SHA plus rendered contact and tenant destinations on all three live domains. Rollback is a revert PR through the same protected main and normal deployment pipeline; no schema/data rollback is required.

Root AGENTS.md and CLAUDE.md were not changed; no workspace-wide fact changed.
