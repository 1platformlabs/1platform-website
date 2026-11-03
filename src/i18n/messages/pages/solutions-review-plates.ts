import { defineMessages } from '@i18n/ui';

/**
 * Review plates solution page.
 *
 * The page template carries NO literal copy: every string below is read by key,
 * because a tenant (and the platform itself in API mode) renders this page with
 * its own copy loaded through the API, and `t()` throws on a missing key.
 *
 * Wording rules (epic vertical-placas-nfc, D-11): never name the plate maker nor
 * any network or provider; no prices; no counts of "tools". Say "your business
 * profile on the search engine and on maps", "social networks", "chat".
 */
export default defineMessages({
  en: {
    'solutions-review-plates.title': 'Review plates — One tap or scan to your reviews and profiles | 1Platform',
    'solutions-review-plates.description':
      'A counter plate with NFC and QR. Your customer taps or scans, and lands where you choose: your reviews, your social profile, your chat or your site. Change the destination any time without new plates.',
    'solutions-review-plates.jsonld.areaServed': 'Worldwide',

    'solutions-review-plates.hero.badge': 'Review plates',
    'solutions-review-plates.hero.headline': 'One plate on the counter. Every way to reach you.',
    'solutions-review-plates.hero.subheadline':
      'Your customer taps it with their phone or scans the code, and lands where you decided: your reviews, your social profile, your chat or your site.',
    'solutions-review-plates.hero.cta.primary': 'Order my plates',
    'solutions-review-plates.hero.cta.secondary': 'See how it works',

    'solutions-review-plates.whatYouGet.eyebrow': 'What you get',
    'solutions-review-plates.whatYouGet.lead':
      'A physical plate that turns a visit into a review, a follower or a conversation.',
    'solutions-review-plates.feature.plate.title': 'A plate that works two ways',
    'solutions-review-plates.feature.plate.desc':
      'Each plate carries an NFC chip and a QR code. Phones that read NFC just tap; every other phone scans.',
    'solutions-review-plates.feature.destination.title': 'You choose where it leads',
    'solutions-review-plates.feature.destination.desc':
      'Point it to your reviews, your social profile, your chat or your own site, and switch it whenever you need.',
    'solutions-review-plates.feature.noReprint.title': 'No new plates to change it',
    'solutions-review-plates.feature.noReprint.desc':
      'The plate stays on the counter. Only the destination changes, from your panel, in a few seconds.',

    'solutions-review-plates.howItWorks.eyebrow': 'How it works',
    'solutions-review-plates.howItWorks.lead': 'Four steps, and the plate does the rest.',
    'solutions-review-plates.howItWorks.aria': 'Review plate flow',
    'solutions-review-plates.step.order': 'Order your plates from your panel',
    'solutions-review-plates.step.place': 'Place them on the counter or at the table',
    'solutions-review-plates.step.tap': 'Your customer taps or scans',
    'solutions-review-plates.step.land': 'They land where you decided',

    'solutions-review-plates.destinations.eyebrow': 'Destinations',
    'solutions-review-plates.destinations.title': 'One plate, the destination you need today',
    'solutions-review-plates.destinations.desc':
      'Change it as your business changes. The plate on the counter never has to.',
    'solutions-review-plates.destinations.includedLabel': 'Available',
    'solutions-review-plates.destinations.reviews': 'Your reviews, to collect more of them',
    'solutions-review-plates.destinations.social': 'Your profile on social networks',
    'solutions-review-plates.destinations.chat': 'A chat with your business',
    'solutions-review-plates.destinations.site': 'Your own site or any page you choose',

    'solutions-review-plates.listing.eyebrow': 'Optional service',
    'solutions-review-plates.listing.title': 'Your business on the search engine and on maps',
    'solutions-review-plates.listing.desc':
      'If your business does not appear yet, we can register your business profile on the search engine and on maps for you, so the reviews have somewhere to land.',
    'solutions-review-plates.listing.note':
      'It is a service you request together with your plates, with its status visible in your panel. It is optional: the plates work without it.',

    'solutions-review-plates.next.eyebrow': 'Next step',
    'solutions-review-plates.next.title': 'Put your first plate on the counter',
    'solutions-review-plates.next.desc':
      'Sign in, choose how many plates you need and place the order from your panel.',
  },
  es: {
    'solutions-review-plates.title': 'Placas de reseñas — Un toque o un escaneo a tus reseñas y perfiles | 1Platform',
    'solutions-review-plates.description':
      'Una placa de mostrador con NFC y QR. Tu cliente la acerca o la escanea y llega a donde tú elijas: tus reseñas, tu perfil en redes, tu chat o tu sitio. Cambia el destino cuando quieras sin placas nuevas.',
    'solutions-review-plates.jsonld.areaServed': 'Todo el mundo',

    'solutions-review-plates.hero.badge': 'Placas de reseñas',
    'solutions-review-plates.hero.headline': 'Una placa en el mostrador. Todas las formas de llegar a ti.',
    'solutions-review-plates.hero.subheadline':
      'Tu cliente la acerca con su teléfono o escanea el código y llega a donde tú decidiste: tus reseñas, tu perfil en redes, tu chat o tu sitio.',
    'solutions-review-plates.hero.cta.primary': 'Pedir mis placas',
    'solutions-review-plates.hero.cta.secondary': 'Ver cómo funciona',

    'solutions-review-plates.whatYouGet.eyebrow': 'Qué obtienes',
    'solutions-review-plates.whatYouGet.lead':
      'Una placa física que convierte una visita en una reseña, un seguidor o una conversación.',
    'solutions-review-plates.feature.plate.title': 'Una placa que funciona de dos maneras',
    'solutions-review-plates.feature.plate.desc':
      'Cada placa lleva un chip NFC y un código QR. Los teléfonos con NFC solo la acercan; los demás escanean.',
    'solutions-review-plates.feature.destination.title': 'Tú eliges a dónde lleva',
    'solutions-review-plates.feature.destination.desc':
      'Apúntala a tus reseñas, tu perfil en redes, tu chat o tu propio sitio, y cámbiala cuando lo necesites.',
    'solutions-review-plates.feature.noReprint.title': 'Sin placas nuevas para cambiarla',
    'solutions-review-plates.feature.noReprint.desc':
      'La placa se queda en el mostrador. Solo cambia el destino, desde tu panel, en unos segundos.',

    'solutions-review-plates.howItWorks.eyebrow': 'Cómo funciona',
    'solutions-review-plates.howItWorks.lead': 'Cuatro pasos, y la placa hace el resto.',
    'solutions-review-plates.howItWorks.aria': 'Flujo de la placa de reseñas',
    'solutions-review-plates.step.order': 'Pide tus placas desde tu panel',
    'solutions-review-plates.step.place': 'Colócalas en el mostrador o en la mesa',
    'solutions-review-plates.step.tap': 'Tu cliente la acerca o la escanea',
    'solutions-review-plates.step.land': 'Llega a donde tú decidiste',

    'solutions-review-plates.destinations.eyebrow': 'Destinos',
    'solutions-review-plates.destinations.title': 'Una placa, el destino que necesitas hoy',
    'solutions-review-plates.destinations.desc':
      'Cámbialo conforme cambie tu negocio. La placa del mostrador no tiene que cambiar.',
    'solutions-review-plates.destinations.includedLabel': 'Disponible',
    'solutions-review-plates.destinations.reviews': 'Tus reseñas, para juntar más',
    'solutions-review-plates.destinations.social': 'Tu perfil en redes sociales',
    'solutions-review-plates.destinations.chat': 'Un chat con tu negocio',
    'solutions-review-plates.destinations.site': 'Tu propio sitio o la página que elijas',

    'solutions-review-plates.listing.eyebrow': 'Servicio opcional',
    'solutions-review-plates.listing.title': 'Tu negocio en el buscador y en mapas',
    'solutions-review-plates.listing.desc':
      'Si tu negocio todavía no aparece, podemos dar de alta por ti el perfil de tu negocio en el buscador y en mapas, para que las reseñas tengan dónde llegar.',
    'solutions-review-plates.listing.note':
      'Es un servicio que pides junto con tus placas, con su estado visible en tu panel. Es opcional: las placas funcionan sin él.',

    'solutions-review-plates.next.eyebrow': 'Siguiente paso',
    'solutions-review-plates.next.title': 'Pon tu primera placa en el mostrador',
    'solutions-review-plates.next.desc':
      'Inicia sesión, elige cuántas placas necesitas y haz el pedido desde tu panel.',
  },
});
