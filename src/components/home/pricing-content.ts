import { i18nKey } from '@i18n/key';
/**
 * The pricing section's cards (LMW-08, D-12): the reference's geometry with
 * the model 1Platform actually has — metered operations and quoted services,
 * zero figures. Every operation and service name is the `pricing.metered.*` /
 * `pricing.quoted.*` catalogue the pricing page already publishes, grouped
 * into three cards per mode.
 */

export type PricingCardSpec = {
  key: string;
  /** `pricing.metered.<op>.name` / `pricing.quoted.<svc>.name` keys. */
  features: string[];
};

export const METERED_CARDS: PricingCardSpec[] = [
  {
    key: 'content',
    features: [
      i18nKey('pricing.metered.content.name'),
      i18nKey('pricing.metered.comment.name'),
      i18nKey('pricing.metered.profile.name'),
      i18nKey('pricing.metered.legalPage.name'),
    ],
  },
  {
    key: 'imagesKeywords',
    features: [
      i18nKey('pricing.metered.image.name'),
      i18nKey('pricing.metered.stockImage.name'),
      i18nKey('pricing.metered.keyword.name'),
    ],
  },
  {
    key: 'indexingSeo',
    features: [
      i18nKey('pricing.metered.indexing.name'),
      i18nKey('pricing.metered.searchConsole.name'),
      i18nKey('pricing.metered.agent.name'),
    ],
  },
];

export const QUOTED_CARDS: PricingCardSpec[] = [
  {
    key: 'payments',
    features: [i18nKey('pricing.quoted.payment.name')],
  },
  {
    key: 'invoicingDomains',
    features: [i18nKey('pricing.quoted.invoicing.name'), i18nKey('pricing.quoted.domain.name')],
  },
  {
    key: 'linkVolume',
    features: [i18nKey('pricing.quoted.linkBuilding.name'), i18nKey('pricing.quoted.volume.name')],
  },
];

/** The ten metered operations and five quoted services, pinned: a group that
 *  silently loses an operation would misdescribe the model. */
const meteredCount = METERED_CARDS.reduce((n, c) => n + c.features.length, 0);
const quotedCount = QUOTED_CARDS.reduce((n, c) => n + c.features.length, 0);
if (meteredCount !== 10 || quotedCount !== 5) {
  throw new Error(`[pricing] expected 10 metered + 5 quoted, got ${meteredCount} + ${quotedCount}`);
}
