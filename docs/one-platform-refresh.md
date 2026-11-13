# One Platform landing refresh

Implemented from the approved infrastructure prototype on 2026-11-12.
Branch: `feat/one-platform-landing-refresh`, based on `ec92069b27084eba0f1a7a0daf08e0bf01fe45df`.

## Behavior

- The infrastructure home puts the social agent immediately after the hero. Its WhatsApp-style conversation contains eight messages, typing states, internal scrolling and a demo appointment confirmation. It performs no network writes.
- Hover, keyboard focus and the pause button stop playback; touching the chat pauses it for reading. Hidden tabs and offscreen demos stop their timer. Reduced motion and no-JavaScript retain the complete conversation.
- API/MCP integration has its own section and hero CTA, with links to the existing Developer guide and its `#mcp` anchor.
- Static explanatory lists, alternating surfaces, shorter vertical spacing and the first eight capabilities keep the page compact. The remaining capabilities are expandable; `#nube` reveals its card. Selection survives collapse.
- `site.brand.presentation: symbol-and-name` opts into the current tenant name beside its symbol. Existing uploaded lockups remain the default for other tenants. Website header/footer and infrastructure access pages share this component.
- Both locales live in tenant-owned catalogues. Partial or older catalogues omit incomplete new sections rather than substituting another tenant's content.
- The real reviews component is unchanged. The prototype's local-only reviews policy is not part of the product.

## Content activation

Use [the activation runbook](infrastructure-branding-activation.md) with a fresh complete administrative snapshot. The offline preparer now proposes One Platform name/wordmark and the original symbol asset while preserving other manifest fields and publication flags. Do not seed production with a repository fixture.

The current Core contract accepts these fields; no backend schema change is needed. Implementation does not activate published tenant data. Technical routes, package names and the legal company name remain unchanged.

## Verification boundary

The local build and browser suites exercise the production Astro adapter using repository content and contractual HTTP fixtures. They are not a private-database, real-auth `/verify-epic-e2e` bank. No merge, deploy or production-data write was executed.

Developer companion branch: `feat/one-platform-brand-refresh` in `1platform-api-developer`. Both projects need to be reviewed together for shared navigation and branding.

## Local validation

- `npm run typecheck`: 0 errors, 0 warnings (18 existing hints).
- `npm run build`: passed.
- `npm run check`: design guards and 55 negative self-tests passed.
- `npm run test:branding-content`: 12 passed.
- Targeted Playwright matrix: 98 passed with two workers across infrastructure home/chrome/languages/cloud, branding, uploaded assets and photographic/access pages. This includes both languages, narrow/landscape/laptop widths, Axe, old catalogues and other tenants.
- The final CSS refinements cancel a paused message's entry animation with sufficient specificity and rely on shared chrome scroll-padding once, avoiding excess space above section anchors. `tests/infrastructure-refresh.spec.ts` covers both regressions.
- Manual product review uses the built Node adapter on port 4481 and Chrome: desktop MCP, contact/footer transition, English mobile and its menu. The live prototype is not the product evidence.

Workspace AGENTS.md and CLAUDE.md were not edited. The public prototype/ngrok process was preserved.

Final refinement verification: the old build failed the paused-animation assertion (`social-message-in` instead of `none`); the rebuilt product passed all six refresh tests, including the new anchor-spacing regression. Safari visually confirmed the initially paused message stays visible and the section begins directly below the floating header.
