# Visual baseline

Linux renders, produced in the Playwright container so the letterforms are
byte-stable (`*-linux.png`, committed). The gate **compares** — it never
regenerates on its own.

```bash
npm run test:visual          # compare against the committed baseline
npm run test:visual:update   # regenerate — then LOOK at every changed image
```

A moved baseline is reviewed image by image before committing: additions,
deletions and dimension changes first (a full-page capture that got taller
grew a section; wider means something overflows the viewport). `-darwin`
snapshots are git-ignored on purpose — only the container's render is
authoritative, and a green local run against a local baseline proves nothing.

## The four baselines here are the only ones with a live test

`home.spec.ts` is the only spec in this directory, and its four screenshots
(`home-{en,es}-{1440,390}`) are the only baselines it takes. `showcase.spec.ts`
was removed on `main` before this baseline directory reached this branch
(`feat: redesign public editorial system` — the home page's solution
"showcase" section, five tabs of interconnected UI mockups, was replaced by
the simpler connected-commerce diagram `home.spec.ts` already captures), but
its ten `showcase.spec.ts-snapshots/*.png` were left behind uncommitted from
the deletion. They stayed orphaned — no spec referencing them, so
`npm run test:visual` never touched them — until this file's own commit
removed them: the ten images no longer match anything on the site (the tabbed
"Tienda online / Pagos y facturación / Contenido con IA / Envíos / Publicidad"
layout they show does not exist in `src/` any more), and a baseline nothing
compares against is not a safety net.
