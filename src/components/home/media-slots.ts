/**
 * Every image hole on the home page, by id and size.
 *
 * This is the contract between three things that otherwise drift apart: the
 * components that render a hole, the media pipeline that fills it with a real
 * product screen or an original editorial background
 * (`scripts/capture-product-media.mjs`), and the test that says
 * which holes are still placeholders (`tests/media-complete.spec.ts`). A hole
 * that is not declared here cannot be filled, and a file that names no hole is
 * not used — both are reported, neither is silent.
 *
 * Sizes are CSS pixels at 1x, measured on the reference (epic
 * home-landing-redesign, §6.1). Produced assets are stored at 2x for retina.
 *
 * Alt text lives in the i18n catalogue under `home.media.<slot>` — one key per
 * hole, so a screenshot is described by what it shows, not by its file name.
 */

export type MediaSlot = { id: string; width: number; height: number };

const slot = (id: string, width: number, height: number): MediaSlot => ({ id, width, height });

/** The showcase's five solutions, in scroll order. Slugs are URL-safe and stable. */
export const SHOWCASE_SLUGS = ['store', 'payments', 'content', 'deliveries', 'ads'] as const;
export type ShowcaseSlug = (typeof SHOWCASE_SLUGS)[number];

/** Original editorial backgrounds: these are never replaced by the product-screen capture run. */
export const SHOWCASE_BACKGROUND_IDS = SHOWCASE_SLUGS.map((slug) => `showcase-${slug}-bg` as const);

/** Nodes per showcase panel. The count is the number of node cards that panel draws. */
export const SHOWCASE_NODE_COUNT: Record<ShowcaseSlug, number> = {
  store: 5,
  payments: 4,
  content: 5,
  deliveries: 3,
  ads: 3,
};

/** The five audiences, in the order the segmented control lists them. */
export const PERSONA_SLUGS = ['small-business', 'sellers', 'services', 'agencies', 'developers'] as const;
export type PersonaSlug = (typeof PERSONA_SLUGS)[number];

/** The module carousel: the seven menu destinations plus seven catalogue capabilities. */
export const MODULE_SLUGS = [
  'online-store',
  'website',
  'content',
  'deliveries',
  'ads',
  'whitelabel',
  'payments',
  'payment-links',
  'card-present',
  'webhooks',
  'agents',
  'domain',
  'ai-image',
  'search-console',
] as const;
export type ModuleSlug = (typeof MODULE_SLUGS)[number];

/* The hero fan: a flat centre strip of four squares, then five pairs that turn
   towards the viewer. The pairs get taller the further out they sit — the
   reference's planes are portrait at the edges and square at the centre. */
const HERO_STRIP = [1, 2, 3, 4].map((n) => slot(`hero-${String(n).padStart(2, '0')}`, 240, 240));
const HERO_PAIR_SIZES: [number, number][] = [
  [300, 300],
  [300, 380],
  [320, 560],
  [360, 800],
  [400, 900],
];
const HERO_PAIRS = HERO_PAIR_SIZES.flatMap(([w, h], i) => [
  slot(`hero-${String(5 + i * 2).padStart(2, '0')}`, w, h),
  slot(`hero-${String(6 + i * 2).padStart(2, '0')}`, w, h),
]);

export const MEDIA_SLOTS: readonly MediaSlot[] = [
  ...HERO_STRIP,
  ...HERO_PAIRS,
  ...SHOWCASE_BACKGROUND_IDS.map((id) => slot(id, 1440, 900)),
  ...SHOWCASE_SLUGS.flatMap((s) =>
    Array.from({ length: SHOWCASE_NODE_COUNT[s] }, (_, i) => slot(`showcase-${s}-node-${i + 1}`, 280, 280)),
  ),
  ...PERSONA_SLUGS.map((s) => slot(`persona-${s}`, 376, 376)),
  ...PERSONA_SLUGS.flatMap((s) => [1, 2, 3, 4].map((n) => slot(`persona-${s}-sat-${n}`, 200, 200))),
  ...MODULE_SLUGS.map((s) => slot(`module-${s}`, 226, 226)),
];

const BY_ID = new Map(MEDIA_SLOTS.map((s) => [s.id, s]));

export function mediaSlot(id: string): MediaSlot {
  const found = BY_ID.get(id);
  if (!found) {
    throw new Error(`[media] "${id}" is not a declared media slot — add it to media-slots.ts first`);
  }
  return found;
}
