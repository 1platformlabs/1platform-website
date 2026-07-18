import { defineMessages } from '@i18n/ui';

/**
 * Hero's own literals only. Every page that mounts <Hero> passes its
 * headline, subheadline, badge and CTA labels as props — those live in that
 * page's own message module, next to the rest of that page's copy. What
 * belongs here is what Hero would say if no page told it what to say: the
 * default CTA pair (reused verbatim from `common.ts` so "Get Started Free"
 * has exactly one Spanish translation site-wide) and the intent-chip nav's
 * own aria-label, which no page sets.
 */
export default defineMessages({
  en: {
    'hero.chips.aria': 'Where do you want to start?',
  },
  es: {
    'hero.chips.aria': '¿Dónde quieres empezar?',
  },
});
