# cPanel publish channel — 1Platform landing

How `1platform.pro` is built, shipped and activated on the shared cPanel account.

Epic: `epics/1platform-cpanel-migration/` in the workspace monorepo.

---

## Why this channel exists

The landing used to deploy with `rsync -avz --delete` over SSH to a box that
also hosted three other docroots inside the same `public_html`. **The shared
cPanel account has no SSH** — port 21098 is open but carries no authorised key,
and the only shell the account gets is the one **cron** provides. So the channel
is: build in CI → upload a zip over **FTPS** → a **cron** on the host extracts,
verifies and activates it.

## The shape of a release

```
/home/<account>/1platform.pro/
  public -> .deploy/releases/<V>/public      ← the document root IS this symlink
  .deploy/
    incoming/      app.zip · app.zip.sha256 · latest.json   (FTPS drop)
    releases/<V>/
      public/            the served tree: dist/ + .htaccess
      MANIFEST.sha256    sha256 of every file under public/
      BUNDLE_INFO        version · commit · built_at · files
    bin/activate.sh
    logs/activate.log
    .health_url · .health_marker
    .deployed_version · .failed_version · .lock
```

`public/` is nested one level inside the release so `MANIFEST.sha256` and
`BUNDLE_INFO` stay **outside** anything HTTP can reach.

## The swap is atomic — this was measured, not assumed

Before this script was written, the question "does this hosting serve a document
root that is a symlink?" was answered by probing the real account: a throwaway
subdomain whose docroot was a symlink served its content (200, marker present,
`x-turbo-charged-by: LiteSpeed`), and re-pointing the link with `ln -sfn` +
`mv -Tf` changed what was served on the next request. So `activate.sh` swaps a
symlink, and **there is no window** where a visitor can get `index.html` from
one release and `_astro/` chunks from another.

## Green CI does **not** mean live

The old `rsync` deploy was immediate. This one is **cron-gated**: PROD activates
on `0 * * * *`, so up to an hour passes between a green run and the new bytes
being served. **Never** infer activation from the workflow's conclusion. Verify
by fingerprint:

```bash
# What did CI publish? (from the run's cpanel-bundle artifact)
grep -m1 version cpanel-dist/BUNDLE_INFO

# What is actually being served?
curl -s https://1platform.pro/ | grep -o '/_astro/[A-Za-z0-9_.-]*\.js' | head
curl -sI https://1platform.pro/ | grep -i x-turbo-charged-by   # LiteSpeed ⇒ cPanel
```

## Verifying a deploy without fooling yourself

Two traps live in this topology, both measured:

| Origin | Answer to an **unknown** `Host` |
|---|---|
| shared cPanel `66.29.146.21` | **200 · 163 bytes** |
| old front door `185.125.168.236` | **200 · 116 KB** (its `default_server`) |

Neither is distinguishable by status code. **Always assert on the body.** For
the landing the cheap marker is the home `<title>`; the strong one is walking
the sitemap.

```bash
# Against the cPanel origin, before DNS is touched:
curl -s -k --resolve 1platform.pro:443:66.29.146.21 https://1platform.pro/ \
  | grep -o '<title>[^<]*</title>'
```

## The serving contract

`htaccess/landing.htaccess` is versioned here and published **with** the
release, so a rollback restores behaviour and content together. It carries:

- `DirectorySlash On` — the 301 `/pricing` → `/pricing/` that Astro's
  `trailingSlash: 'always'` and every canonical URL depend on.
- A **real 404** via `ErrorDocument 404 /404.html`. There is deliberately **no**
  SPA-style fallback here: a fallback turns every dead URL into a soft 200.
- `Options -Indexes` — the old origin exposed a navigable directory listing.
- Immutable caching for `/_astro/` (content-hashed) and a modest, revalidated
  TTL for un-fingerprinted files in `public/`.

> **Hard rule: nothing may force HTTPS.** The Cloudflare zone is in `flexible`
> mode, so the edge speaks plain HTTP to this origin. An https redirect here is
> an infinite loop, not hardening. `assemble.sh` fails the build if one appears.

## Rollback

Two levels, neither needs CI:

1. **Previous release** — re-point the docroot symlink. The cron keeps the last
   two releases, so the previous tree is intact:
   ```
   ln -sfn /home/<account>/1platform.pro/.deploy/releases/<PREV>/public /home/<account>/1platform.pro/public.tmp
   mv -Tf  /home/<account>/1platform.pro/public.tmp /home/<account>/1platform.pro/public
   ```
   (run it through a one-minute cron line — the account has no shell otherwise)
2. **Whole host** — put the DNS record back. While the old origin still exists
   this takes under two minutes and is the real safety net.

`activate.sh` also rolls back on its own if the health URL is reachable and
**still** fails to return the marker after the full retry window, and quarantines
that version in `.failed_version` so the next cron does not loop on it. It does
**not** roll back when curl cannot reach the URL at all (a blocked hairpin is
normal on shared hosting) — an unverifiable release is kept, not reverted on a
signal that never arrived.

## Local dry run

```bash
npm run build
BUNDLE_VERSION=local BUNDLE_COMMIT=$(git rev-parse HEAD) bash deploy/cpanel/assemble.sh
( cd cpanel-dist && zip -qr ../app.zip . )
```
