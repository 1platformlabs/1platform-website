# cPanel publish channel — 1Platform landing

How `1platform.pro` is built, shipped and activated on the shared cPanel account.

Epic: `epics/1platform-cpanel-migration/` in the workspace monorepo.

---

## Why this channel exists

The landing used to deploy with `rsync -avz --delete` over SSH to a box that
also hosted three other docroots inside the same `public_html`. **The cPanel
account has no SSH** — port 21098 is open but carries no authorised key, and the
only shell the account gets is the one **cron** provides. So the channel is:
build in CI → upload a zip over **FTPS** → a **cron** on the host extracts,
verifies and activates it.

**Where it publishes (2026-07-28):** the dedicated account `mascehgw` on
`business138.web-hosting.com`, origin **66.29.132.45**, docroot
`/home/mascehgw/1platform.pro`. It shares that account with bowerfans PROD and
nothing else. It previously published to the shared `anakxipn`
(premium224, 66.29.146.21), which still hosts `app-qa.1platform.pro`.

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

## Green CI does **not** mean live — so the job now proves it

The old `rsync` deploy was immediate. This one is **cron-gated**: `*/5`, so up to
five minutes pass between a green run and the new bytes being served. (It started
hourly, copied from the Atlas and Bowerbird channels. That was never justified
here and made "deploy" mean "some time in the next hour". The activator exits
immediately when the version on disk already matches, so the extra runs cost
nothing.)

The workflow's conclusion still says nothing about activation. Once this host has
been cut over, the publish job polls the **public URL** until the served home page
matches the bundle's `index_sha`, asserts the response came from LiteSpeed, and
**fails** if the cron has not activated within ten minutes.

Before the cutover it deliberately does nothing but say so: the public URL is
still answered by the old origin, and the cPanel origin cannot be reached
verifiably by IP — it presents no certificate for this hostname, so `--resolve`
on 443 fails validation and port 80 is clear text. The check for that window is
`f4-cutover.sh` in the epic, run by hand at cutover time.

`index_sha` is the sha256 of the entry document. It is exact and cannot collide,
which a chunk-name grep cannot promise.

```bash
grep -m1 index_sha cpanel-dist/BUNDLE_INFO
curl -s https://1platform.pro/ | shasum -a 256     # after the cutover
```

## Which job proves what

Both channels stay alive until PCM-12, and each one verifies **itself**:

| Job | Deploys to | Health check target |
|---|---|---|
| `deploy` (rsync) | the legacy origin | the **legacy origin**, pinned with `LEGACY_ORIGIN_IP` (TLS verification intact) once DNS has moved |
| `publish-cpanel` | the shared cPanel account | the **public URL**, by fingerprint + LiteSpeed, once this host has been cut over |

Before this split the rsync job health-checked the public URL — which, after the
cutover, is served by the *other* channel. That gate would have gone green on a
failed legacy deploy and red on a good one whose cron had not yet run.

The legacy origin is not vestigial while it lives: the F4 rollback is a DNS
change, and it only helps if the old docroot still holds **today's** build. That
is why the rsync job is removed in PCM-12 and not before.

## Verifying a deploy without fooling yourself

Two traps live in this topology, both measured:

| Origin | Answer to an **unknown** `Host` |
|---|---|
| cPanel `66.29.132.45` (`mascehgw`, current) | **200 · 163 bytes** |
| cPanel `66.29.146.21` (`anakxipn`, previous) | **200 · 163 bytes** |
| old front door `185.125.168.236` | **200 · 116 KB** (its `default_server`) |

Neither is distinguishable by status code. **Always assert on the body.** For
the landing the cheap marker is the home `<title>`; the strong one is walking
the sitemap.

There is a third answer, and it is the one that actually caught someone out: a
vhost whose docroot exists but is **empty** answers **200 · ~1,364 bytes** with
cPanel's autoindex page — which has a `<title>` of its own. A gate that looked
for "a `<title>` tag" passed against a docroot serving `Index of /`. Match the
site's title, not the presence of the tag.

```bash
# Against the cPanel origin, before DNS is touched:
curl -s --resolve 1platform.pro:80:66.29.132.45 http://1platform.pro/ \
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
