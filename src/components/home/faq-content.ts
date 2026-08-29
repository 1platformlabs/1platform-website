import { i18nKey } from '@i18n/key';

/**
 * The eight FAQ entries (LMW-09, D-13), by key prefix: `<prefix>.question` /
 * `<prefix>.answer`. Six are the pricing page's own answers — same copy in
 * both places by reading the same catalogue, never by duplicating it — and
 * two are the home's. One list, two consumers: the accordion and the
 * `FAQPage` JSON-LD must never disagree about what was asked.
 */
export const FAQ_KEYS = [
  i18nKey('home.faq.whatIs'),
  i18nKey('pricing.faq.howPricingWorks'),
  i18nKey('pricing.faq.whyRatesHidden'),
  i18nKey('pricing.faq.freePlan'),
  i18nKey('home.faq.integrate'),
  i18nKey('pricing.faq.operationFails'),
  i18nKey('pricing.faq.unexpectedBill'),
  i18nKey('pricing.faq.volumeDiscount'),
] as const;
