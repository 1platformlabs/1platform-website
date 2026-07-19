import { defineMessages } from '@i18n/ui';

/**
 * Card's own literals: the default `metaLabel` ("Replaces", used by the
 * compare pages when a card lists what it replaces) and the "Learn more"
 * cue that appears on every linked card. Title, description and meta text
 * itself are always passed in as props by the page that renders the card.
 */
export default defineMessages({
  en: {
    'card.metaLabel.default': 'Replaces',
    'card.learnMore': 'Learn more',
  },
  es: {
    'card.metaLabel.default': 'Reemplaza',
    'card.learnMore': 'Más información',
  },
});
