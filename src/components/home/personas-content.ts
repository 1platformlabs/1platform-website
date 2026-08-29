import { i18nKey } from '@i18n/key';
import { PERSONA_SLUGS, type PersonaSlug } from './media-slots';

/**
 * The five audiences of the persona stack (LMW-06).
 *
 * Copy is DELIBERATELY zero new strings (CA-2): titles and descriptions are
 * the existing `home.useCase.*` catalogue; each satellite names a REAL
 * capability through the keys the capability index already defines (CA-3).
 * Destinations are the pages those audiences are sent to today.
 *
 * Geometry (desktop, relative to the 1440 frame): the front card is 400 wide,
 * centred; each card behind it steps X +29/+21/+17/+13 and rises Y
 * −45/−33/−26/−21, with widths 343/300/267/240 and square media
 * 376/322/282/251/226 (all measured, RT2-3). The four satellites sit at the
 * measured corners.
 */

export type Persona = {
  slug: PersonaSlug;
  /** `home.useCase.<key>.title` / `.description`. */
  copyKey: string;
  href: string;
  /** Satellite label keys — real capabilities from the existing catalogue. */
  satellites: [string, string, string, string];
};

export const PERSONAS: Persona[] = [
  {
    slug: 'small-business',
    copyKey: 'smallBusiness',
    href: '/solutions/online-store/',
    satellites: [
      i18nKey('home.featured.store.title'),
      i18nKey('home.featured.invoicing.title'),
      i18nKey('home.group.storefront.item.domain'),
      i18nKey('home.featured.deliveries.title'),
    ],
  },
  {
    slug: 'sellers',
    copyKey: 'sellers',
    href: '/solutions/online-store/',
    satellites: [
      i18nKey('home.group.sellGetPaid.item.paymentLinks'),
      i18nKey('home.featured.payments.title'),
      i18nKey('home.group.sellGetPaid.item.cardPresent'),
      i18nKey('home.group.sellGetPaid.item.merchantSubscriptions'),
    ],
  },
  {
    slug: 'services',
    copyKey: 'services',
    href: '/payments-invoicing/',
    satellites: [
      i18nKey('home.featured.invoicing.title'),
      i18nKey('home.group.sellGetPaid.item.paymentLinks'),
      i18nKey('home.featured.advertising.title'),
      i18nKey('home.group.contentSeo.item.legalPages'),
    ],
  },
  {
    slug: 'agencies',
    copyKey: 'agencies',
    href: '/for-agencies/',
    satellites: [
      i18nKey('home.group.storefront.item.whitelabel'),
      i18nKey('home.featured.content.title'),
      i18nKey('home.group.contentSeo.item.searchConsole'),
      i18nKey('home.group.contentSeo.item.linkBuilding'),
    ],
  },
  {
    slug: 'developers',
    copyKey: 'developers',
    href: '/for-developers/',
    satellites: [
      i18nKey('home.group.developer.item.webhooks'),
      i18nKey('home.group.developer.item.agents'),
      i18nKey('home.group.developer.item.logs'),
      i18nKey('home.group.contentSeo.item.indexing'),
    ],
  },
];

/** Stack geometry per depth position (0 = front), measured on the reference. */
export const STACK_POSITIONS = [
  { dx: 0, y: 224, w: 400, media: 376 },
  { dx: 29, y: 179, w: 343, media: 322 },
  { dx: 50, y: 146, w: 300, media: 282 },
  { dx: 67, y: 120, w: 267, media: 251 },
  { dx: 80, y: 99, w: 240, media: 226 },
] as const;

/** Satellite frames, measured: two top corners, two bottom corners. */
export const SATELLITE_POSITIONS = [
  { x: 185, y: 132, size: 160 },
  { x: 1028, y: 125, size: 200 },
  { x: 147, y: 537, size: 200 },
  { x: 1091, y: 527, size: 160 },
] as const;

if (PERSONAS.length !== PERSONA_SLUGS.length) {
  throw new Error('[personas] the content table and media-slots.ts disagree on the audiences');
}
