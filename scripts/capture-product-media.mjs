#!/usr/bin/env node
/**
 * capture-product-media.mjs — fills the home's product-media slots with real
 * screens, preserves its original editorial showcase backgrounds, and checks
 * every resulting image for text that is unsafe to publish.
 *
 *     node scripts/capture-product-media.mjs            # capture every slot with a route
 *     node scripts/capture-product-media.mjs --only hero-01,module-ads
 *     node scripts/capture-product-media.mjs --check    # manifest vs slots + OCR scan
 *
 * Why this exists: product evidence must be genuine rather than an illustration
 * pretending to be the app. The hero, nodes, personas and modules therefore use
 * real screens. The showcase backgrounds are the deliberate exception: five
 * original editorial photographs communicate the human outcome while the node
 * cards on top retain the verifiable product workflow.
 *
 * ── Credentials ─────────────────────────────────────────────────────────────
 * The dashboard signs in with a magic link, so there is no password to type.
 * Sign in ONCE by hand in a Playwright browser and save the storage state:
 *
 *     npx playwright codegen --save-storage=.env.local.storage.json https://<qa host>
 *
 * then point `CAPTURE_STORAGE_STATE` at that file in `.env.local`. Both are
 * git-ignored (`.env*.local`). Public surfaces (a storefront, a tracking page,
 * a payment link) need no state at all.
 *
 *     APP_QA_URL=https://…      dashboard QA
 *     STORE_QA_URL=https://…    a Bower storefront on QA
 *     ATLAS_QA_URL=https://…    an Atlas tenant on QA
 *     CAPTURE_STORAGE_STATE=.env.local.storage.json
 *
 * ── Output ──────────────────────────────────────────────────────────────────
 * `src/assets/product/<slot>.webp` at 2x the slot's CSS size, plus
 * `src/assets/product/media-manifest.json` with origin/provenance, timestamp
 * and sha256 per piece — so a reviewer can tell where each asset came from.
 *
 * ── --check (the gate) ──────────────────────────────────────────────────────
 * 1. every declared slot has a file, or is listed as still a placeholder;
 * 2. every file names a declared slot;
 * 3. OCR (tesseract.js) over every capture, against the provider names the
 *    design-system guard forbids (`scripts/check-tells.sh` rule 10 — read from
 *    the script, so the two lists cannot drift) and PII shapes (an e-mail
 *    address, a Guatemalan NIT, a phone number). A dashboard screen can show
 *    the certifier's name or a customer's e-mail, and no text scan of the
 *    source could ever see it: only the pixels can.
 * Exit 1 on any finding, or on any missing slot when MEDIA_REQUIRED=1.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = join(ROOT, 'src/assets/product');
const MANIFEST = join(OUT_DIR, 'media-manifest.json');
const SLOTS_MODULE = join(ROOT, 'src/components/home/media-slots.ts');
const GUARD = join(ROOT, 'scripts/check-tells.sh');
const OCR_CACHE = join(ROOT, 'node_modules/.cache/tesseract');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

loadDotEnvLocal();

/* ── Slots ──────────────────────────────────────────────────────────────────
   The slot list is TypeScript. Rather than duplicate it here (and let it
   drift), the module is transpiled on the fly with the TypeScript that is
   already a devDependency, then imported. */
async function loadMediaContract() {
  const ts = await import('typescript');
  const source = readFileSync(SLOTS_MODULE, 'utf8');
  const js = ts.default.transpileModule(source, {
    compilerOptions: { module: ts.default.ModuleKind.ES2022, target: ts.default.ScriptTarget.ES2022 },
  }).outputText;
  const tmp = join(ROOT, 'node_modules/.cache/media-slots.mjs');
  mkdirSync(join(ROOT, 'node_modules/.cache'), { recursive: true });
  writeFileSync(tmp, js);
  return import(pathToFileURL(tmp).href);
}

/* ── Routes ─────────────────────────────────────────────────────────────────
   Which QA screen fills which slot. `url` is a template over the env hosts;
   `clip` is a CSS selector to crop to (whole viewport when absent). A slot with
   no route is skipped and reported — the placeholder stays until someone
   decides what that hole should show. Editorial slots are preserved in place
   and never overwritten by a full capture run. */
const APP = process.env.APP_QA_URL ?? '';
const STORE = process.env.STORE_QA_URL ?? '';
const ATLAS = process.env.ATLAS_QA_URL ?? '';
// Two more real product surfaces (both public, no session):
// the developer portal (QA build of the epic's own branch) and the live
// marketing site's content pages (blog articles ARE the content product's
// output; the redesign does not change them).
const DEV = process.env.DEV_QA_URL ?? '';
const SITE = process.env.SITE_PROD_URL ?? '';
const CREATOR = process.env.CREATOR_QA_URL ?? '';

const ROUTES = {
  // Hero fan — product surfaces at a glance.
  //
  // Routes are pinned to what the QA panel ACTUALLY mounts (measured 2026-08-29
  // against app-qa with a live session: the sidebar exposes dashboard, billing,
  // businesses, websites, domains, deliveries, agents, tasks, skills, tickets,
  // settings — and nothing else). The first draft of this map invented routes
  // (`/transactions`, `/content`, `/ads`, …); the panel 404s them and the
  // capture shipped the 404 screen with exit 0. A slot whose product surface
  // does not exist on QA has NO route here — it stays a labelled placeholder,
  // which is honest — rather than a route that captures an error page.
  'hero-01': { url: `${APP}/app/main/dashboard`, clip: 'main' },
  'hero-02': { url: `${STORE}/`, clip: 'main' },
  'hero-03': { url: `${APP}/app/main/billing`, clip: 'main' }, // transactions live in billing ("Recent transactions")
  'hero-04': { url: `${APP}/app/main/businesses`, clip: 'main' }, // invoicing's canonical surface (manifest: /main/businesses)
  'hero-05': { url: `${STORE}/products`, clip: 'main' },
  'hero-06': { url: `${DEV}/docs/saas/1platform-api/journeys/generar-contenido`, clip: 'main' },
  'hero-07': { url: `${APP}/app/main/billing`, clip: 'main table' },
  'hero-08': { url: `${APP}/app/main/deliveries`, clip: 'main' },
  'hero-09': { url: `${APP}/app/main/ads`, clip: 'main' }, // renders "Advertising" (the collapsed-group census missed it)
  'hero-10': { url: `${APP}/app/main/domains`, clip: 'main' },
  'hero-11': { url: `${APP}/app/main/websites`, clip: 'main' },
  'hero-12': { url: `${ATLAS}/`, clip: 'main' },
  'hero-13': { url: `${APP}/app/main/agents`, clip: 'main' },
  'hero-14': { url: `${APP}/app/main/settings`, clip: 'main' },
  // Showcase node cards — each matches its i18n label (home.showcase.<slug>.node.<n>.label)
  'showcase-store-node-1': { url: `${STORE}/products`, clip: 'main' }, // Product catalog
  'showcase-store-node-2': { url: `${STORE}/cart`, clip: 'main' }, // Checkout page
  'showcase-store-node-3': { url: `${APP}/app/main/billing`, clip: 'main' }, // Card payment
  'showcase-store-node-4': { url: `${APP}/app/main/businesses`, clip: 'main' }, // Electronic invoice
  'showcase-store-node-5': { url: `${APP}/app/main/domains`, clip: 'main' }, // Your own domain
  'showcase-payments-node-1': { url: `${APP}/app/main/billing`, clip: 'main' }, // Payment link
  'showcase-payments-node-2': { url: `${DEV}/docs/saas/1platform-api/journeys/cobros-y-saldo`, clip: 'main' }, // Card-present sale
  'showcase-payments-node-3': { url: `${APP}/app/main/businesses`, clip: 'main' }, // Invoice, PDF and XML
  'showcase-payments-node-4': { url: `${APP}/app/main/dashboard`, clip: 'main' }, // Customer subscription (balance & credits)
  'showcase-content-node-1': { url: `${SITE}/blog/automate-seo-pipeline/`, clip: 'main' }, // Keyword research
  'showcase-content-node-2': { url: `${SITE}/blog/ai-content-best-practices/`, clip: 'main' }, // Generated article
  'showcase-content-node-3': { url: `${SITE}/blog/`, clip: 'main' }, // Generated image
  'showcase-content-node-4': { url: `${APP}/app/main/websites`, clip: 'main' }, // Published and indexed
  'showcase-content-node-5': { url: `${CREATOR}/`, clip: 'main' }, // Dashboard under your brand (whitelabeled surface)
  'showcase-deliveries-node-1': { url: `${APP}/app/main/deliveries`, clip: 'main' }, // Shipping quote
  'showcase-deliveries-node-2': { url: `${APP}/app/main/deliveries`, clip: 'main' }, // Shipping label
  'showcase-deliveries-node-3': { url: `${APP}/app/main/deliveries`, clip: 'main' }, // Tracking page
  'showcase-ads-node-1': { url: `${APP}/app/main/ads`, clip: 'main' }, // Campaign setup
  'showcase-ads-node-2': { url: `${APP}/app/main/ads`, clip: 'main' }, // Creative
  'showcase-ads-node-3': { url: `${APP}/app/main/billing`, clip: 'main' }, // Spend report
  // Personas — the front card's media, one per audience
  'persona-small-business': { url: `${APP}/app/main/dashboard`, clip: 'main' },
  'persona-sellers': { url: `${STORE}/products`, clip: 'main' },
  'persona-services': { url: `${APP}/app/main/businesses`, clip: 'main' },
  'persona-agencies': { url: `${APP}/app/main/websites`, clip: 'main' },
  'persona-developers': { url: `${DEV}/api-reference/1platform-api`, clip: 'body' },
  // Personas — satellites, matching personas-content.ts satellite labels in order
  'persona-small-business-sat-1': { url: `${STORE}/`, clip: 'main' }, // Online Store
  'persona-small-business-sat-2': { url: `${APP}/app/main/businesses`, clip: 'main' }, // Electronic Invoicing
  'persona-small-business-sat-3': { url: `${APP}/app/main/domains`, clip: 'main' }, // Custom Domain
  'persona-small-business-sat-4': { url: `${APP}/app/main/deliveries`, clip: 'main' }, // Delivery Management
  'persona-sellers-sat-1': { url: `${APP}/app/main/billing`, clip: 'main' }, // Payment Links
  'persona-sellers-sat-2': { url: `${STORE}/cart`, clip: 'main' }, // Payment Processing
  'persona-sellers-sat-3': { url: `${DEV}/docs/saas/1platform-api/journeys/cobros-y-saldo`, clip: 'main' }, // Card Present
  'persona-sellers-sat-4': { url: `${APP}/app/main/dashboard`, clip: 'main' }, // Merchant Subscriptions
  'persona-services-sat-1': { url: `${APP}/app/main/businesses`, clip: 'main' }, // Electronic Invoicing
  'persona-services-sat-2': { url: `${APP}/app/main/billing`, clip: 'main' }, // Payment Links
  'persona-services-sat-3': { url: `${APP}/app/main/ads`, clip: 'main' }, // Advertising
  'persona-services-sat-4': { url: `${SITE}/privacy/`, clip: 'main' }, // Legal Pages
  'persona-agencies-sat-1': { url: `${CREATOR}/`, clip: 'main' }, // Whitelabel Dashboard
  'persona-agencies-sat-2': { url: `${DEV}/docs/saas/1platform-api/journeys/generar-contenido`, clip: 'main' }, // AI Content
  'persona-agencies-sat-3': { url: `${APP}/app/main/websites`, clip: 'main' }, // Search Console
  'persona-agencies-sat-4': { url: `${DEV}/docs/saas/1platform-api/capacidades`, clip: 'main' }, // Link Building
  'persona-developers-sat-1': { url: `${DEV}/docs/saas/1platform-api/journeys/webhooks`, clip: 'main' }, // Webhooks
  'persona-developers-sat-2': { url: `${APP}/app/main/agents`, clip: 'main' }, // AI Agents
  'persona-developers-sat-3': { url: `${DEV}/docs/saas/1platform-api/reference/error-codes`, clip: 'main' }, // Logs
  'persona-developers-sat-4': { url: `${DEV}/docs/saas/1platform-api/reference/testing`, clip: 'main' }, // Indexing
  // Module cards
  'module-online-store': { url: `${STORE}/`, clip: 'main' },
  'module-website': { url: `${APP}/app/main/websites`, clip: 'main' },
  'module-content': { url: `${DEV}/docs/saas/1platform-api/journeys/generar-contenido`, clip: 'main' },
  'module-deliveries': { url: `${APP}/app/main/deliveries`, clip: 'main' },
  'module-ads': { url: `${APP}/app/main/ads`, clip: 'main' },
  'module-whitelabel': { url: `${CREATOR}/`, clip: 'main' },
  'module-payments': { url: `${APP}/app/main/billing`, clip: 'main' },
  'module-payment-links': { url: `${APP}/app/main/billing`, clip: 'main table' },
  'module-card-present': { url: `${DEV}/docs/saas/1platform-api/journeys/cobros-y-saldo`, clip: 'main' },
  'module-webhooks': { url: `${APP}/app/main/api`, clip: 'main' }, // "API access" — core-mounted at /main/api
  'module-agents': { url: `${APP}/app/main/agents`, clip: 'main' },
  'module-domain': { url: `${APP}/app/main/domains`, clip: 'main' },
  'module-ai-image': { url: `${SITE}/blog/ai-content-best-practices/`, clip: 'main' },
  'module-search-console': { url: `${APP}/app/main/websites`, clip: 'main' },
};

/* ── PII / provider patterns for the OCR gate ───────────────────────────── */
function providerPattern() {
  // Rule 10 of the guard is the single source of the forbidden list. Reading it
  // from the file is what keeps this gate and the guard from disagreeing.
  const guard = readFileSync(GUARD, 'utf8');
  const m = guard.match(/grep -rniE '([^']+)' \$SRC \$PROSE/);
  if (!m) throw new Error('could not read the provider list out of scripts/check-tells.sh rule 10');
  // grep -E syntax → JS: the list is plain alternation with \b, safe to reuse.
  return new RegExp(m[1], 'i');
}
const PII = [
  { name: 'e-mail address', re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  { name: 'Guatemalan NIT', re: /\b\d{6,8}-?[0-9K]\b/ },
  { name: 'phone number', re: /(?:\+?502[\s-]?)?\d{4}[\s-]\d{4}\b/ },
];

async function main() {
  const { MEDIA_SLOTS: slots, SHOWCASE_BACKGROUND_IDS: editorialIds } = await loadMediaContract();
  const ids = new Set(slots.map((s) => s.id));

  if (flag('--check')) return check(slots, ids);
  return capture(slots, new Set(editorialIds));
}

async function capture(slots, editorialSlots) {
  const only = opt('--only')?.split(',').filter(Boolean);
  const { chromium } = await import('@playwright/test');
  const sharp = (await import('sharp')).default;
  mkdirSync(OUT_DIR, { recursive: true });
  const manifest = readManifest();

  const storageState = process.env.CAPTURE_STORAGE_STATE;
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    ...(storageState && existsSync(storageState) ? { storageState } : {}),
  });
  const page = await context.newPage();

  const skipped = [];
  const preserved = [];
  let done = 0;
  for (const slot of slots) {
    if (only && !only.includes(slot.id)) continue;
    if (editorialSlots.has(slot.id)) {
      preserved.push(slot.id);
      continue;
    }
    const route = ROUTES[slot.id];
    if (!route || /^\/|^https?:\/\/?$/.test(route.url) || route.url.startsWith('/')) {
      skipped.push(slot.id);
      continue;
    }
    try {
      await page.goto(route.url, { waitUntil: 'networkidle', timeout: 45_000 });
      const target = route.clip ? page.locator(route.clip).first() : page;
      const png = await target.screenshot({ type: 'png' });
      const out = join(OUT_DIR, `${slot.id}.webp`);
      await sharp(png)
        .resize(slot.width * 2, slot.height * 2, { fit: 'cover', position: 'top' })
        .webp({ quality: 82 })
        .toFile(out);
      const bytes = readFileSync(out);
      upsert(manifest, {
        slot: slot.id,
        file: `${slot.id}.webp`,
        source_url: route.url,
        captured_at: new Date().toISOString(),
        sha256: createHash('sha256').update(bytes).digest('hex'),
        width: slot.width * 2,
        height: slot.height * 2,
        alt_key: `home.media.${slot.id}`,
      });
      done++;
      console.log(`captured ${slot.id} ← ${route.url}`);
    } catch (err) {
      console.error(`FAILED ${slot.id}: ${err.message}`);
    }
  }
  await browser.close();
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `\n${done} captured, ${preserved.length} editorial assets preserved, ` +
      `${skipped.length} slots without a route: ${skipped.join(', ') || '—'}`,
  );
}

async function check(slots, ids) {
  const manifest = readManifest();
  const files = readdirSync(OUT_DIR).filter((f) => /\.(webp|png|jpe?g|avif)$/i.test(f));
  const produced = new Set(files.map((f) => f.replace(/\.[a-z0-9]+$/i, '')));

  const findings = [];
  for (const f of produced) if (!ids.has(f)) findings.push(`file names no declared slot: ${f}`);
  for (const entry of manifest) if (!produced.has(entry.slot)) findings.push(`manifest entry without file: ${entry.slot}`);

  const placeholders = slots.filter((s) => !produced.has(s.id)).map((s) => s.id);

  // OCR every produced piece. tesseract.js downloads its language data on first
  // use; that is acceptable for an operator's gate and never runs in the build.
  if (produced.size) {
    const { createWorker } = await import('tesseract.js');
    mkdirSync(OCR_CACHE, { recursive: true });
    const worker = await createWorker('eng', 1, { cachePath: OCR_CACHE });
    const providers = providerPattern();
    for (const f of files) {
      const { data } = await worker.recognize(join(OUT_DIR, f));
      const text = data.text.replace(/\s+/g, ' ');
      const p = text.match(providers);
      if (p) findings.push(`${f}: provider name visible in the capture`);
      for (const { name, re } of PII) {
        const m = text.match(re);
        if (m) findings.push(`${f}: ${name} visible in the capture`);
      }
    }
    await worker.terminate();
  }

  console.log(`${produced.size} produced · ${placeholders.length} still placeholders`);
  if (placeholders.length) console.log(`  placeholders: ${placeholders.join(', ')}`);
  for (const f of findings) console.log(`FAIL  ${f}`);

  if (findings.length) process.exit(1);
  if (process.env.MEDIA_REQUIRED === '1' && placeholders.length) {
    console.log('MEDIA_REQUIRED=1 and slots are still placeholders — not ready to merge.');
    process.exit(1);
  }
}

function readManifest() {
  if (!existsSync(MANIFEST)) return [];
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

function upsert(manifest, entry) {
  const i = manifest.findIndex((m) => m.slot === entry.slot);
  if (i >= 0) manifest[i] = entry;
  else manifest.push(entry);
}

function loadDotEnvLocal() {
  const p = join(ROOT, '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
