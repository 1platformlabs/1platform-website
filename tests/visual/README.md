# Visual baseline

Linux renders, produced in the Playwright container so the letterforms are
byte-stable (`*-linux.png`, committed). The gate **compares** — it never
regenerates on its own.

The suite has two real subjects:

- four platform home renders from the repo-mode server, preserving the existing
  `1platform.pro` visual baseline;
- four clinic renders (home and tenant-owned 404, desktop and mobile) from the
  Node adapter in API mode against `tests/fixtures/service-lead-site.json`.

Ten old `showcase-*` PNGs were intentionally retired. Their only spec and the
five showcase components it targeted were removed together in `516869a`; the
images then had no executable producer. Restoring that historical spec proved
the problem by failing all ten locators while the four current home cases
passed. An orphan image is not a regression gate.

```bash
npm run test:visual          # compare against the committed baseline
npm run test:visual:update   # regenerate — then LOOK at every changed image
```

A moved baseline is reviewed image by image before committing: additions,
deletions and dimension changes first (a full-page capture that got taller
grew a section; wider means something overflows the viewport). `-darwin`
snapshots are git-ignored on purpose — only the container's render is
authoritative, and a green local run against a local baseline proves nothing.

## Inventory cerrado

`home.spec.ts` owns four platform screenshots
(`home-{en,es}-{1440,390}`), and `clinic.spec.ts` owns four clinic screenshots
(`clinic-{home,404}-{1440,390}`). `tests/visual-baseline-inventory.spec.ts`
fails if any committed PNG is orphaned or if a live visual case lacks its
Linux baseline.
