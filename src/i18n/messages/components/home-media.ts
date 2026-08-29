import { defineMessages } from '@i18n/ui';

/**
 * Alt text for the home's product captures, one key per media slot
 * (`src/components/home/media-slots.ts`). A screenshot is described by what it
 * shows — the panel, the storefront, the invoice — never by its file name.
 *
 * The placeholder key is the one string shown while a slot has no capture yet;
 * it names the slot so a reviewer can tell which hole is still empty.
 */
export default defineMessages({
  en: {
    'home.media.placeholderAria': 'Product screen pending capture: {slot}',
  },
  es: {
    'home.media.placeholderAria': 'Pantalla del producto pendiente de captura: {slot}',
  },
});
