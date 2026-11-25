import { defineMessages } from '@i18n/ui';

/**
 * Coupons solution page (epic cupones-motor-core, MCU-09).
 *
 * The page template carries NO literal copy: every string below is read by key,
 * because a tenant (and the platform itself in API mode) renders this page with
 * its own copy loaded through the API, and `t()` throws on a missing key.
 *
 * Wording rules: never name a provider or a vendor; no prices, no figures and no
 * claims about results; describe only what the coupon engine does today.
 */
export default defineMessages({
  en: {
    'solutions-coupons.title': 'Coupons — Discounts and unique codes for your store and your clients | One Platform',
    'solutions-coupons.description':
      'Create discount coupons and batches of unique codes, set when they apply and how many times they can be used, and honor them in your online store and in person.',
    'solutions-coupons.jsonld.areaServed': 'Worldwide',

    'solutions-coupons.hero.badge': 'Coupons',
    'solutions-coupons.hero.headline': 'Create a coupon in a few steps. Control exactly where it applies.',
    'solutions-coupons.hero.subheadline':
      'Offer a percentage or a fixed amount off, as a single code or a batch of unique codes, and decide when it is valid, how many times it can be used and whether it adds to your seasonal sales.',
    'solutions-coupons.hero.cta.primary': 'Create a coupon',
    'solutions-coupons.hero.cta.secondary': 'See how it works',

    'solutions-coupons.whatYouGet.eyebrow': 'What you get',
    'solutions-coupons.whatYouGet.lead':
      'One place to create, share and follow every coupon, instead of codes scattered across tools.',
    'solutions-coupons.feature.create.title': 'Percent or fixed amount',
    'solutions-coupons.feature.create.desc':
      'Choose a percentage off or a fixed amount in your currency, set a minimum purchase if you want one, and give the coupon a name you will recognize.',
    'solutions-coupons.feature.codes.title': 'One code or a batch of unique ones',
    'solutions-coupons.feature.codes.desc':
      'Pick your own code, let the system generate it, or create a batch where every code works once, ready to export and hand out.',
    'solutions-coupons.feature.rules.title': 'Rules you control',
    'solutions-coupons.feature.rules.desc':
      'Set a start and end date, a limit on total uses and on uses per customer, and pause or archive a coupon whenever you need to.',

    'solutions-coupons.howItWorks.eyebrow': 'How it works',
    'solutions-coupons.howItWorks.lead': 'Four steps, from the idea to the redeemed discount.',
    'solutions-coupons.howItWorks.aria': 'Coupon flow',
    'solutions-coupons.step.create': 'Create the coupon and set its rules',
    'solutions-coupons.step.share': 'Share the code, or hand out the batch',
    'solutions-coupons.step.redeem': 'Your customer redeems it online or in person',
    'solutions-coupons.step.track': 'Follow how many times each coupon was used',

    'solutions-coupons.guardrails.eyebrow': 'What you can set',
    'solutions-coupons.guardrails.title': 'Each coupon follows your rules',
    'solutions-coupons.guardrails.desc':
      'A coupon is only applied when the purchase meets what you defined, and a code stops being accepted once it reaches its limit.',
    'solutions-coupons.guardrails.includedLabel': 'Included',
    'solutions-coupons.guardrails.batches': 'Batches of unique codes, each valid once, exportable to a file',
    'solutions-coupons.guardrails.limits': 'A limit on total uses and on uses per customer',
    'solutions-coupons.guardrails.window': 'A validity window with a start and an end date',
    'solutions-coupons.guardrails.sales': 'Your choice of whether a coupon adds to a seasonal sale or not',

    'solutions-coupons.everywhere.eyebrow': 'Where it works',
    'solutions-coupons.everywhere.title': 'In your store, in person and in the balance',
    'solutions-coupons.everywhere.desc':
      'The same coupons are honored when someone buys in your online store and when you apply one at the counter. You can also issue balance coupons that credit a client’s account.',
    'solutions-coupons.everywhere.note':
      'Balance coupons are issued by the platform team for the clients of a workspace, and each one can be redeemed only within its own limits.',

    'solutions-coupons.next.eyebrow': 'Next step',
    'solutions-coupons.next.title': 'Create your first coupon',
    'solutions-coupons.next.desc':
      'Sign in, open Coupons in your panel and create one in a few steps. Integrators can also manage coupons through the API.',
  },
  es: {
    'solutions-coupons.title': 'Cupones — Descuentos y códigos únicos para tu tienda y tus clientes | One Platform',
    'solutions-coupons.description':
      'Crea cupones de descuento y lotes de códigos únicos, define cuándo aplican y cuántas veces se pueden usar, y respétalos en tu tienda en línea y en persona.',
    'solutions-coupons.jsonld.areaServed': 'Todo el mundo',

    'solutions-coupons.hero.badge': 'Cupones',
    'solutions-coupons.hero.headline': 'Crea un cupón en pocos pasos. Controla exactamente dónde aplica.',
    'solutions-coupons.hero.subheadline':
      'Ofrece un porcentaje o un monto fijo de descuento, con un solo código o un lote de códigos únicos, y decide cuándo vale, cuántas veces se puede usar y si se suma a tus ofertas de temporada.',
    'solutions-coupons.hero.cta.primary': 'Crear un cupón',
    'solutions-coupons.hero.cta.secondary': 'Ver cómo funciona',

    'solutions-coupons.whatYouGet.eyebrow': 'Qué obtienes',
    'solutions-coupons.whatYouGet.lead':
      'Un solo lugar para crear, compartir y seguir cada cupón, en vez de códigos repartidos entre herramientas.',
    'solutions-coupons.feature.create.title': 'Porcentaje o monto fijo',
    'solutions-coupons.feature.create.desc':
      'Elige un porcentaje de descuento o un monto fijo en tu moneda, fija una compra mínima si quieres y ponle al cupón un nombre que reconozcas.',
    'solutions-coupons.feature.codes.title': 'Un código o un lote de códigos únicos',
    'solutions-coupons.feature.codes.desc':
      'Escribe tu propio código, deja que el sistema lo genere o crea un lote donde cada código sirve una sola vez, listo para exportar y repartir.',
    'solutions-coupons.feature.rules.title': 'Reglas que tú controlas',
    'solutions-coupons.feature.rules.desc':
      'Define fecha de inicio y de fin, un límite de usos totales y por cliente, y pausa o archiva un cupón cuando lo necesites.',

    'solutions-coupons.howItWorks.eyebrow': 'Cómo funciona',
    'solutions-coupons.howItWorks.lead': 'Cuatro pasos, de la idea al descuento canjeado.',
    'solutions-coupons.howItWorks.aria': 'Flujo de cupones',
    'solutions-coupons.step.create': 'Crea el cupón y define sus reglas',
    'solutions-coupons.step.share': 'Comparte el código o reparte el lote',
    'solutions-coupons.step.redeem': 'Tu cliente lo canjea en línea o en persona',
    'solutions-coupons.step.track': 'Sigue cuántas veces se usó cada cupón',

    'solutions-coupons.guardrails.eyebrow': 'Lo que puedes definir',
    'solutions-coupons.guardrails.title': 'Cada cupón sigue tus reglas',
    'solutions-coupons.guardrails.desc':
      'Un cupón sólo se aplica cuando la compra cumple lo que definiste, y un código deja de aceptarse al llegar a su límite.',
    'solutions-coupons.guardrails.includedLabel': 'Incluido',
    'solutions-coupons.guardrails.batches': 'Lotes de códigos únicos, cada uno válido una vez y exportable a un archivo',
    'solutions-coupons.guardrails.limits': 'Un límite de usos totales y de usos por cliente',
    'solutions-coupons.guardrails.window': 'Un periodo de validez con fecha de inicio y de fin',
    'solutions-coupons.guardrails.sales': 'Tú eliges si un cupón se suma a una oferta de temporada o no',

    'solutions-coupons.everywhere.eyebrow': 'Dónde funciona',
    'solutions-coupons.everywhere.title': 'En tu tienda, en persona y en el saldo',
    'solutions-coupons.everywhere.desc':
      'Los mismos cupones se respetan cuando alguien compra en tu tienda en línea y cuando lo aplicas en el mostrador. También existen cupones de saldo que acreditan la cuenta de un cliente.',
    'solutions-coupons.everywhere.note':
      'Los cupones de saldo los emite el equipo de la plataforma para los clientes de un espacio de trabajo, y cada uno sólo se puede canjear dentro de sus propios límites.',

    'solutions-coupons.next.eyebrow': 'Siguiente paso',
    'solutions-coupons.next.title': 'Crea tu primer cupón',
    'solutions-coupons.next.desc':
      'Inicia sesión, abre Cupones en tu panel y crea uno en pocos pasos. Los integradores también pueden gestionar cupones por API.',
  },
});
