import { defineMessages } from '@i18n/ui';

/**
 * Deliveries solution page.
 *
 * Every claim here traces to an endpoint that is live in production. The three
 * that are easiest to overstate, and the wording that keeps them honest:
 *
 *  - Courier mode answers 503 "while no courier service is configured FOR THE
 *    TENANT" — it is a per-workspace credential, not a missing partner. Copy
 *    says "enabled per workspace", never "coming soon".
 *  - `fee` on a shipment is "an informative reference — nothing is charged or
 *    debited". Copy must not imply the platform bills the delivery.
 *  - Public tracking returns strictly LESS than the shipment carries: no
 *    street, no phone, no coordinates, no price, no courier identity, and only
 *    the recipient's first name. That restraint is the selling point, so it is
 *    stated rather than glossed.
 *
 * "Quote" is deliberately not a fourth peer capability: it exists only in
 * courier mode, needs coordinates at both ends, and `quoted` is unreachable
 * with your own fleet.
 */
export default defineMessages({
  en: {
    'solutions-deliveries.title': 'Delivery Management — Dispatch and Track Every Order | 1Platform',
    'solutions-deliveries.description':
      'Register, dispatch and track shipments for your business. Works end to end with your own staff, with courier dispatch available per workspace, and a public tracking link for your buyer.',
    'solutions-deliveries.jsonld.areaServed': 'Worldwide',

    'solutions-deliveries.hero.headline': 'Get every order out the door',
    'solutions-deliveries.hero.subheadline':
      'Register a shipment, dispatch it, and follow it to the door. Your own staff can run the whole thing from day one, and your buyer gets a tracking link that needs no account.',
    'solutions-deliveries.hero.badge': 'Delivery Management',
    // The destination was already specific (`?intent=deliveries`); only the
    // label was still the site-wide generic. "Order" is this page's own word —
    // its headline is "Let every order go out the door".
    'solutions-deliveries.hero.cta.primary': 'Send Your First Order',
    'solutions-deliveries.hero.cta.secondary': 'See Pricing',

    'solutions-deliveries.whatYouGet.eyebrow': 'What you get',
    'solutions-deliveries.whatYouGet.lead':
      'Shipping that is part of the sale, not a spreadsheet beside it.',

    'solutions-deliveries.feature.register.title': 'Register the shipment',
    'solutions-deliveries.feature.register.desc':
      "Create a delivery against a branch and it picks up that branch as its pickup point. Change the branch address tomorrow and yesterday's shipment keeps the address it actually left from.",
    'solutions-deliveries.feature.dispatch.title': 'Dispatch it',
    'solutions-deliveries.feature.dispatch.desc':
      'Send it out with your own staff, or hand it to a courier service if your workspace has one configured. The same shipment, the same record, either way.',
    'solutions-deliveries.feature.track.title': 'Follow it to the door',
    'solutions-deliveries.feature.track.desc':
      'Advance the status as it moves, cancel it while there is still time, and read the whole history back per business or per shipment.',

    'solutions-deliveries.inTheBox.eyebrow': 'In the box',
    'solutions-deliveries.inTheBox.title': 'Your own fleet needs nothing else',
    'solutions-deliveries.inTheBox.desc':
      'Own-fleet delivery works end to end without a third party. Nothing here waits on a contract, an integration or a partner account.',
    'solutions-deliveries.inTheBox.includedLabel': 'Included',
    'solutions-deliveries.included.create': 'Register a shipment against any of your branches',
    'solutions-deliveries.included.pickup': 'Pickup point copied from the branch at the moment of creation',
    'solutions-deliveries.included.edit': 'Edit it while it is still a draft',
    'solutions-deliveries.included.dispatch': 'Dispatch, advance status, or cancel',
    'solutions-deliveries.included.list': 'List and filter every shipment of a business',
    'solutions-deliveries.included.tracking': 'A public tracking link for whoever is waiting',
    'solutions-deliveries.included.roles': 'Writes restricted to branch administrators',
    'solutions-deliveries.included.webhook': 'Status notices from a courier arrive server to server',

    'solutions-deliveries.howItWorks.eyebrow': 'How it works',
    'solutions-deliveries.howItWorks.lead': 'Four steps, and the last one is not yours to do.',
    'solutions-deliveries.howItWorks.aria': 'Delivery lifecycle',
    'solutions-deliveries.step.create': 'Register the shipment',
    'solutions-deliveries.step.dispatch': 'Dispatch it',
    'solutions-deliveries.step.track': 'Advance its status',
    'solutions-deliveries.step.delivered': 'Your buyer sees it arrive',

    'solutions-deliveries.tracking.eyebrow': 'Public tracking',
    'solutions-deliveries.tracking.title': 'Your buyer needs no account',
    'solutions-deliveries.tracking.desc':
      'Every shipment gets a link that anyone holding it can open. No sign-up, no password, nothing to install.',
    'solutions-deliveries.tracking.privacy':
      'It shows strictly less than the shipment holds. No street, no phone, no coordinates, no price, and only the first name of whoever is receiving it. The link is a signed derivation of the shipment rather than its waybill, so it cannot be guessed by counting upwards, and an unknown link and a wrong one answer exactly the same way.',

    'solutions-deliveries.courier.eyebrow': 'Courier dispatch',
    'solutions-deliveries.courier.title': 'A seam you can switch on',
    'solutions-deliveries.courier.desc':
      'Courier dispatch is configured per workspace. Once yours has a delivery service set up, you can ask it for a price and an estimated time before committing, and dispatch against that quote. The price is held on the server and confirmed at dispatch, so nothing that reaches the courier came from the browser.',
    'solutions-deliveries.courier.caveat':
      'Quoting is not a fourth thing you always do. It exists only in courier mode, it needs coordinates at both ends, and until your workspace has a delivery service configured those endpoints say so plainly instead of guessing a price.',
    'solutions-deliveries.courier.fee':
      'The fee recorded on a shipment is a reference for your own books. 1Platform neither debits it nor charges it.',

    'solutions-deliveries.whatItReplaces.eyebrow': 'What it replaces',
    'solutions-deliveries.whatItReplaces.lead': 'The parts you were holding together by hand.',
    'solutions-deliveries.compare.record.without': 'Shipments tracked in a spreadsheet next to the orders',
    'solutions-deliveries.compare.record.with': 'The shipment lives on the order, in the same platform',
    'solutions-deliveries.compare.buyer.without': 'Answering where is my order by message, one at a time',
    'solutions-deliveries.compare.buyer.with': 'A link your buyer opens whenever they want',
    'solutions-deliveries.compare.address.without': 'Old shipments quietly rewritten when a branch moves',
    'solutions-deliveries.compare.address.with': 'Each shipment keeps the address it actually left from',
    'solutions-deliveries.compare.courier.without': 'A separate courier integration to build and maintain',
    'solutions-deliveries.compare.courier.with': 'One dispatch step whether it is your staff or a service',

    'solutions-deliveries.related.eyebrow': 'Related',
    'solutions-deliveries.related.lead': 'What a delivery usually sits next to.',
    'solutions-deliveries.related.store.title': 'Online Store',
    'solutions-deliveries.related.store.desc':
      'The sale that produces the shipment: catalog, checkout and payment on your own domain.',
    'solutions-deliveries.related.payments.desc':
      'Charge for the order and issue its electronic invoice from the same place.',
    'solutions-deliveries.related.developers.title': 'For developers',
    'solutions-deliveries.related.developers.desc':
      'The full delivery reference, with the auth model and the rate limits that apply.',

    'solutions-deliveries.next.eyebrow': 'Next step',
    'solutions-deliveries.next.title': 'Send your first shipment',
    'solutions-deliveries.next.desc':
      'Deliveries are part of the platform, not an add-on to buy later. Register a business, add a branch, and dispatch.',
    'solutions-deliveries.next.linkCue': 'Read the delivery reference',
    'solutions-deliveries.next.actions.viewPricing': 'See Pricing',
  },

  es: {
    'solutions-deliveries.title': 'Gestión de envíos — Despacha y sigue cada pedido | 1Platform',
    'solutions-deliveries.description':
      'Registra, despacha y sigue los envíos de tu comercio. Funciona de punta a punta con tu propio personal, con despacho por mensajería habilitable por espacio de trabajo y un enlace público de seguimiento para tu comprador.',
    'solutions-deliveries.jsonld.areaServed': 'Global',

    'solutions-deliveries.hero.headline': 'Que cada pedido salga por la puerta',
    'solutions-deliveries.hero.subheadline':
      'Registra un envío, despáchalo y síguelo hasta la puerta. Tu propio personal puede hacerlo todo desde el primer día, y tu comprador recibe un enlace de seguimiento que no necesita cuenta.',
    'solutions-deliveries.hero.badge': 'Gestión de envíos',
    'solutions-deliveries.hero.cta.primary': 'Envía tu primer pedido',
    'solutions-deliveries.hero.cta.secondary': 'Ver precios',

    'solutions-deliveries.whatYouGet.eyebrow': 'Qué obtienes',
    'solutions-deliveries.whatYouGet.lead':
      'El envío como parte de la venta, no como una hoja de cálculo al lado.',

    'solutions-deliveries.feature.register.title': 'Registra el envío',
    'solutions-deliveries.feature.register.desc':
      'Crea un envío sobre una sucursal y toma esa sucursal como punto de recogida. Si mañana cambias la dirección de la sucursal, el envío de ayer conserva la dirección desde la que realmente salió.',
    'solutions-deliveries.feature.dispatch.title': 'Despáchalo',
    'solutions-deliveries.feature.dispatch.desc':
      'Envíalo con tu propio personal, o entrégalo a un servicio de mensajería si tu espacio de trabajo tiene uno configurado. El mismo envío y el mismo registro en los dos casos.',
    'solutions-deliveries.feature.track.title': 'Síguelo hasta la puerta',
    'solutions-deliveries.feature.track.desc':
      'Avanza su estado a medida que se mueve, cancélalo mientras aún hay tiempo, y lee todo el historial por comercio o por envío.',

    'solutions-deliveries.inTheBox.eyebrow': 'Incluido',
    'solutions-deliveries.inTheBox.title': 'Con tu propia flota no necesitas nada más',
    'solutions-deliveries.inTheBox.desc':
      'El envío con flota propia funciona de punta a punta sin ningún tercero. Nada de esto espera un contrato, una integración ni una cuenta de socio.',
    'solutions-deliveries.inTheBox.includedLabel': 'Incluido',
    'solutions-deliveries.included.create': 'Registrar un envío sobre cualquiera de tus sucursales',
    'solutions-deliveries.included.pickup': 'Punto de recogida copiado de la sucursal al momento de crearlo',
    'solutions-deliveries.included.edit': 'Editarlo mientras sigue siendo un borrador',
    'solutions-deliveries.included.dispatch': 'Despachar, avanzar el estado o cancelar',
    'solutions-deliveries.included.list': 'Listar y filtrar todos los envíos de un comercio',
    'solutions-deliveries.included.tracking': 'Un enlace público de seguimiento para quien lo espera',
    'solutions-deliveries.included.roles': 'Escrituras restringidas a administradores de sucursal',
    'solutions-deliveries.included.webhook': 'Los avisos de estado de una mensajería llegan de servidor a servidor',

    'solutions-deliveries.howItWorks.eyebrow': 'Cómo funciona',
    'solutions-deliveries.howItWorks.lead': 'Cuatro pasos, y el último no lo haces tú.',
    'solutions-deliveries.howItWorks.aria': 'Ciclo de vida de un envío',
    'solutions-deliveries.step.create': 'Registra el envío',
    'solutions-deliveries.step.dispatch': 'Despáchalo',
    'solutions-deliveries.step.track': 'Avanza su estado',
    'solutions-deliveries.step.delivered': 'Tu comprador lo ve llegar',

    'solutions-deliveries.tracking.eyebrow': 'Seguimiento público',
    'solutions-deliveries.tracking.title': 'Tu comprador no necesita cuenta',
    'solutions-deliveries.tracking.desc':
      'Cada envío recibe un enlace que puede abrir cualquiera que lo tenga. Sin registro, sin contraseña, sin nada que instalar.',
    'solutions-deliveries.tracking.privacy':
      'Muestra estrictamente menos de lo que guarda el envío. Sin calle, sin teléfono, sin coordenadas, sin precio, y sólo el primer nombre de quien lo recibe. El enlace es una derivación firmada del envío y no su número de guía, así que no se puede adivinar contando hacia arriba, y un enlace desconocido y uno equivocado responden exactamente igual.',

    'solutions-deliveries.courier.eyebrow': 'Despacho por mensajería',
    'solutions-deliveries.courier.title': 'Una costura que puedes encender',
    'solutions-deliveries.courier.desc':
      'El despacho por mensajería se configura por espacio de trabajo. Cuando el tuyo tiene un servicio de reparto configurado, puedes pedirle un precio y un tiempo estimado antes de comprometerte, y despachar contra esa cotización. El precio queda guardado en el servidor y se confirma al despachar, así que nada de lo que llega a la mensajería vino del navegador.',
    'solutions-deliveries.courier.caveat':
      'Cotizar no es un cuarto paso que hagas siempre. Existe sólo en modo mensajería, necesita coordenadas en los dos extremos, y mientras tu espacio de trabajo no tenga un servicio de reparto configurado esos endpoints lo dicen con todas las letras en vez de inventar un precio.',
    'solutions-deliveries.courier.fee':
      'La tarifa que queda registrada en un envío es una referencia para tus propios libros. 1Platform ni la debita ni la cobra.',

    'solutions-deliveries.whatItReplaces.eyebrow': 'Qué reemplaza',
    'solutions-deliveries.whatItReplaces.lead': 'Las piezas que venías sosteniendo a mano.',
    'solutions-deliveries.compare.record.without': 'Envíos anotados en una hoja de cálculo al lado de los pedidos',
    'solutions-deliveries.compare.record.with': 'El envío vive sobre el pedido, en la misma plataforma',
    'solutions-deliveries.compare.buyer.without': 'Responder dónde va mi pedido por mensaje, uno por uno',
    'solutions-deliveries.compare.buyer.with': 'Un enlace que tu comprador abre cuando quiere',
    'solutions-deliveries.compare.address.without': 'Envíos viejos reescritos en silencio cuando una sucursal se muda',
    'solutions-deliveries.compare.address.with': 'Cada envío conserva la dirección desde la que salió',
    'solutions-deliveries.compare.courier.without': 'Una integración de mensajería aparte que construir y mantener',
    'solutions-deliveries.compare.courier.with': 'Un solo paso de despacho, sea tu personal o un servicio',

    'solutions-deliveries.related.eyebrow': 'Relacionado',
    'solutions-deliveries.related.lead': 'Junto a qué suele ir un envío.',
    'solutions-deliveries.related.store.title': 'Tienda online',
    'solutions-deliveries.related.store.desc':
      'La venta que produce el envío: catálogo, pago y cobro en tu propio dominio.',
    'solutions-deliveries.related.payments.desc':
      'Cobra el pedido y emite su factura electrónica desde el mismo lugar.',
    'solutions-deliveries.related.developers.title': 'Para desarrolladores',
    'solutions-deliveries.related.developers.desc':
      'La referencia completa de envíos, con el modelo de autenticación y los límites que aplican.',

    'solutions-deliveries.next.eyebrow': 'Siguiente paso',
    'solutions-deliveries.next.title': 'Manda tu primer envío',
    'solutions-deliveries.next.desc':
      'Los envíos son parte de la plataforma, no un complemento que se compra después. Registra un comercio, agrega una sucursal y despacha.',
    'solutions-deliveries.next.linkCue': 'Leer la referencia de envíos',
    'solutions-deliveries.next.actions.viewPricing': 'Ver precios',
  },
});
