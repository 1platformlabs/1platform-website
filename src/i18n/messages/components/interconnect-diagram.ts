import { defineMessages } from '@i18n/ui';

/**
 * The interconnect motif's seven node labels + its describing aria-label.
 *
 * The node labels are SVG `<text>` inside fixed-width `<rect>` boxes —
 * Spanish runs longer here too ("palabras clave", "facturación"), which is
 * handled geometrically in the component (wider boxes + `textLength` on the
 * labels that still don't fit), not by shortening the words unnaturally.
 *
 * "1PLATFORM API" on the spine itself is brand + a term identical in both
 * languages, so it isn't in this catalogue — it stays a literal in the
 * component, same as the brand name everywhere else.
 */
export default defineMessages({
  en: {
    'interconnect.input.keywords': 'keywords',
    'interconnect.input.aiContent': 'ai content',
    'interconnect.input.images': 'images',
    'interconnect.input.indexing': 'indexing',
    'interconnect.output.storefront': 'storefront',
    'interconnect.output.payments': 'payments',
    'interconnect.output.invoicing': 'invoicing',
    'interconnect.aria': 'Schematic of the platform: keywords, AI content, images and indexing all resolve through one 1Platform API, which delivers a storefront, payments and invoicing.',
  },
  es: {
    'interconnect.input.keywords': 'palabras clave',
    'interconnect.input.aiContent': 'contenido ia',
    'interconnect.input.images': 'imágenes',
    'interconnect.input.indexing': 'indexación',
    'interconnect.output.storefront': 'tienda',
    'interconnect.output.payments': 'pagos',
    'interconnect.output.invoicing': 'facturación',
    'interconnect.aria': 'Esquema de la plataforma: palabras clave, contenido con IA, imágenes e indexación se resuelven a través de una única API de 1Platform, que entrega una tienda, pagos y facturación.',
  },
});
