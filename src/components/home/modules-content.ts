import type { IconName } from '@components/icons';
import { MODULE_SLUGS, type ModuleSlug } from './media-slots';

/**
 * The module carousel's cards (LMW-07, D-11): the seven destinations the menu
 * offers plus seven capabilities of the existing catalogue — fourteen modules,
 * every one a real page, every name an existing i18n key, no provider
 * anywhere.
 */
export type ModuleCard = {
  slug: ModuleSlug;
  labelKey: string;
  href: string;
  icon: IconName;
};

export const MODULES: ModuleCard[] = [
  { slug: 'online-store', labelKey: 'nav.solutions.onlineStore', href: '/solutions/online-store/', icon: 'cart' },
  { slug: 'payments', labelKey: 'nav.solutions.payments', href: '/payments-invoicing/', icon: 'card' },
  { slug: 'content', labelKey: 'nav.solutions.content', href: '/solutions/content/', icon: 'content' },
  { slug: 'website', labelKey: 'nav.solutions.website', href: '/solutions/website/', icon: 'globe' },
  { slug: 'deliveries', labelKey: 'nav.solutions.deliveries', href: '/solutions/deliveries/', icon: 'truck' },
  { slug: 'ads', labelKey: 'nav.solutions.ads', href: '/solutions/ads/', icon: 'megaphone' },
  { slug: 'whitelabel', labelKey: 'nav.solutions.whitelabel', href: '/solutions/whitelabel/', icon: 'dashboard' },
  { slug: 'payment-links', labelKey: 'home.group.sellGetPaid.item.paymentLinks', href: '/payments-invoicing/', icon: 'paylink' },
  { slug: 'card-present', labelKey: 'home.group.sellGetPaid.item.cardPresent', href: '/payments-invoicing/', icon: 'terminal' },
  { slug: 'webhooks', labelKey: 'home.group.developer.item.webhooks', href: '/for-developers/', icon: 'webhook' },
  { slug: 'agents', labelKey: 'home.group.developer.item.agents', href: '/for-developers/', icon: 'agent' },
  { slug: 'domain', labelKey: 'home.group.storefront.item.domain', href: '/solutions/website/', icon: 'domain' },
  { slug: 'ai-image', labelKey: 'home.group.contentSeo.item.aiImage', href: '/solutions/content/', icon: 'image' },
  { slug: 'search-console', labelKey: 'home.group.contentSeo.item.searchConsole', href: '/solutions/content/', icon: 'chart' },
];

/** Card pitch on the rail, measured on the reference's monitors (270 centres). */
export const CARD_SIZE = 226;
export const CARD_PITCH = 270;
/** The card the page opens on (centre of the first five). */
export const INITIAL_INDEX = 2;

const declared = new Set<string>(MODULE_SLUGS);
for (const module of MODULES) {
  if (!declared.has(module.slug)) {
    throw new Error(`[modules] ${module.slug} has no media slot in media-slots.ts`);
  }
}
if (MODULES.length !== MODULE_SLUGS.length) {
  throw new Error('[modules] the card table and media-slots.ts disagree on the module set');
}
