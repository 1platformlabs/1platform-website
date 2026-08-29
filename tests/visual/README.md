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
