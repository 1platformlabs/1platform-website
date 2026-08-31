import { defineMessages } from '@i18n/ui';

/** Copy used by the current editorial home. Keep this module deliberately
 * small: retired visual systems must not keep translation keys alive.
 *
 * The home speaks to a merchant who wants to go digital, so it is built on
 * three load-bearing jobs — sell, get paid, deliver — and everything else is
 * framed as a tool that makes those three earn more. Two rules follow from
 * that and are easy to undo by accident:
 *
 * 1. The H1 is the merchant's sentence, not the product's. The brand line
 *    ("One Platform. Every Solution.") is the badge above it — it signs the
 *    page, it does not open it. A visitor who reads Spanish should not meet
 *    English in the largest type on the page.
 * 2. Every band owns its own eyebrow, heading and lead. They used to share
 *    keys, so "Hecho para tu forma de trabajar" rendered three times and
 *    "Preguntas frecuentes" twice — `no-repeated-paragraph.spec.ts` never saw
 *    it because its floor is 60 characters and these are short. Reusing a
 *    neighbour's key here is a defect, not a saving.
 */
export default defineMessages({
  en: {
    'home.title': '1Platform — Online Store, Card Payments & Deliveries',
    'home.description':
      'Open your online store, take card payments, issue the invoice on every sale, and dispatch your deliveries — your whole business, from one place.',
    'home.jsonld.name': '1Platform',
    'home.jsonld.brandName': '1Platform Labs',

    // — Hero ——————————————————————————————————————————————————
    'home.hero.badge': 'One Platform. Every Solution.',
    'home.hero.headline': 'Your business, selling online today',
    'home.hero.lead':
      'Open your store, take card payments, deliver to the door and invoice automatically — all from one place, with no tools to glue together.',
    'home.hero.fan.aria': 'A 1Platform workspace on a tablet',
    'home.hero.capabilities.aria': 'The three essentials of your business',
    // The home does NOT reuse the chrome's generic `cta.getStarted`. The header
    // button has to work on every page, so it stays broad; the most-visited
    // page can name the outcome the visitor came for.
    'home.hero.cta': 'Open Your Store Free',
    // Both halves are sourced from /pricing/ — "Start on the free plan … No
    // credit card" and "Pay for the operations you run" — not written here.
    // The price objection was already answered by the word "free"; what stops
    // a merchant is the fear of being signed up for something.
    'home.hero.ctaNote': 'No credit card and no subscription. You pay only for what you use.',

    // — The three that carry the business ——————————————————————
    'home.focus.eyebrow': 'The essentials',
    'home.focus.title': 'Sell, get paid, deliver',
    'home.focus.lead':
      'Three things hold an online business up. Here all three arrive already connected to each other, so you start selling instead of assembling.',
    // Each card carries a PROMISE, never a menu label. The pills above them
    // already name the products ("Online Store", "Payments & Invoicing",
    // "Deliveries"); a card that repeats one of those names reads as a second,
    // slightly different name for the same thing on the same screen.
    'home.focus.store.title': 'Your store, open around the clock',
    'home.focus.store.description':
      'Your catalogue, your prices and your brand in a store of your own — with a cart, a one-page checkout and accounts for your customers.',
    // The card used to describe the checkout case only. /payments-invoicing/
    // also documents a payment link, a card terminal and recurring plans —
    // three ways of getting paid that a shopkeeper who has no catalogue yet can
    // use on day one, and that this page never named.
    'home.focus.payments.title': 'Get paid however suits you',
    'home.focus.payments.description':
      'At the checkout, through a link you send, or on a card terminal at your counter — and the valid electronic invoice is issued at the moment of the sale, with nobody typing it out afterwards.',
    'home.focus.deliveries.title': 'Delivery to the door',
    'home.focus.deliveries.description':
      'Dispatch with your own staff or with a courier, and give your buyer a link where they watch their order move all the way to their door.',

    // — Everything that makes those three earn more ————————————
    'home.tools.eyebrow': 'Tools',
    'home.tools.title': 'And everything that makes you sell more',
    'home.tools.lead':
      'With the essentials handled, these three go to work so more people find you, choose you and come back to buy again.',
    // Labelled by the job, not the product name: the nav still calls these
    // "Website Builder", "Advertising" and "AI Content", and it should — that is
    // a directory. This is an argument, and it is ordered nearest-to-the-sale.
    'home.tools.ads': 'Ads that bring buyers to it',
    'home.tools.content': 'A site of your own, with words and pictures that sell',

    // — Who it is for ——————————————————————————————————————————
    'home.personas.eyebrow': 'Who it is for',
    'home.personas.title': 'Made for how you work',
    'home.personas.lead':
      'Whether you sell from a counter, run your clients’ brands or are building your own product, you start from the same account.',
    'home.useCase.merchants.title': 'Businesses ready to grow',
    'home.useCase.merchants.description':
      'Put your business online and sell to everyone who never makes it to your counter — payments, invoices and deliveries already handled.',
    'home.useCase.agencies.title': 'Agencies running several brands',
    'home.useCase.agencies.description':
      'Run your clients’ stores and sites from one dashboard — your own brand up front, billing kept separate for each client.',
    'home.useCase.developers.title': 'Teams building their own product',
    'home.useCase.developers.description':
      'Use 1Platform as the engine of your own product — payments, invoicing, deliveries, content and dashboard included.',

    // — FAQ ————————————————————————————————————————————————————
    'home.faq.eyebrow': 'Before you start',
    'home.faq.title': 'Frequently asked questions',
    'home.faq.whatIs.question': 'What is 1Platform?',
    'home.faq.whatIs.answer':
      'One account your business sells from, takes card payments through, issues its invoices with, dispatches its deliveries from and publishes its content on — from one dashboard, or through one REST API if you are building your own product.',
    'home.faq.technical.question': 'Do I need to be technical to use it?',
    'home.faq.technical.answer':
      'No. You build your store, load your products and start taking payments from the dashboard, without writing a line of code. The API is there for whoever wants it, not for whoever wants to sell.',
    'home.faq.integrate.question': 'Can I integrate it into my own product?',
    'home.faq.integrate.answer':
      'Yes. Everything the dashboard does is exposed through the REST API, with two-token authentication and webhooks — and the whitelabel dashboard can run under your own brand.',
  },
  es: {
    'home.title': '1Platform — Tienda en línea, cobros con tarjeta y entregas',
    'home.description':
      'Abre tu tienda en línea, cobra con tarjeta, emite la factura sola en cada venta y despacha tus entregas — todo tu comercio, desde un solo lugar.',
    'home.jsonld.name': '1Platform',
    'home.jsonld.brandName': '1Platform Labs',

    // — Portada ———————————————————————————————————————————————
    'home.hero.badge': 'One Platform. Every Solution.',
    'home.hero.headline': 'Tu comercio, vendiendo en línea desde hoy',
    'home.hero.lead':
      'Abre tu tienda, cobra con tarjeta, entrega a domicilio y factura en automático — todo desde un solo lugar, sin pegar herramientas sueltas.',
    'home.hero.fan.aria': 'Un espacio de trabajo de 1Platform en una tableta',
    'home.hero.capabilities.aria': 'Lo esencial de tu comercio',
    'home.hero.cta': 'Abre tu tienda gratis',
    'home.hero.ctaNote': 'Sin tarjeta de crédito y sin suscripción. Pagas solo por lo que uses.',

    // — Las tres que sostienen el comercio —————————————————————
    'home.focus.eyebrow': 'Lo esencial',
    'home.focus.title': 'Vende, cobra y entrega',
    'home.focus.lead':
      'Tres cosas sostienen a un comercio en línea. Aquí las tres llegan ya conectadas entre sí, así que empiezas vendiendo en vez de armando.',
    'home.focus.store.title': 'Tu tienda, abierta a toda hora',
    'home.focus.store.description':
      'Tu catálogo, tus precios y tu marca en una tienda propia — con carrito, checkout de una sola página y cuentas para tus clientes.',
    'home.focus.payments.title': 'Cobra como te sirva',
    'home.focus.payments.description':
      'En el checkout, con un enlace que mandas, o en una terminal sobre tu mostrador — y la factura electrónica válida sale en el mismo momento de la venta, sin que nadie la escriba después.',
    'home.focus.deliveries.title': 'Entrega a domicilio',
    'home.focus.deliveries.description':
      'Despacha con tu propio personal o con una mensajería, y dale a tu comprador un enlace donde ve su pedido avanzar hasta su puerta.',

    // — Lo que hace rendir más a esas tres —————————————————————
    'home.tools.eyebrow': 'Herramientas',
    'home.tools.title': 'Y todo lo que hace que vendas más',
    'home.tools.lead':
      'Con lo esencial resuelto, estas tres se ponen a trabajar para que más gente te encuentre, te elija y vuelva a comprarte.',
    'home.tools.ads': 'Publicidad que te trae compradores',
    'home.tools.content': 'Un sitio tuyo, con textos e imágenes que venden',

    // — Para quién es —————————————————————————————————————————
    'home.personas.eyebrow': 'Para quién es',
    'home.personas.title': 'Hecho para tu forma de trabajar',
    'home.personas.lead':
      'Ya vendas desde un mostrador, lleves las marcas de tus clientes o estés construyendo tu propio producto, empiezas desde la misma cuenta.',
    'home.useCase.merchants.title': 'Comercios que quieren crecer',
    'home.useCase.merchants.description':
      'Pon tu negocio en línea y véndele a toda la gente que hoy no llega hasta tu mostrador — con los cobros, las facturas y las entregas ya resueltos.',
    'home.useCase.agencies.title': 'Agencias que llevan varias marcas',
    'home.useCase.agencies.description':
      'Administra las tiendas y los sitios de tus clientes desde un solo panel — con tu marca al frente y la facturación separada para cada uno.',
    'home.useCase.developers.title': 'Equipos que construyen su producto',
    'home.useCase.developers.description':
      'Usa 1Platform como el motor de tu propio producto — pagos, facturación, envíos, contenido y panel ya incluidos.',

    // — Preguntas frecuentes ——————————————————————————————————
    'home.faq.eyebrow': 'Antes de empezar',
    'home.faq.title': 'Preguntas frecuentes',
    'home.faq.whatIs.question': '¿Qué es 1Platform?',
    'home.faq.whatIs.answer':
      'Una sola cuenta desde la que tu comercio vende, cobra con tarjeta, emite sus facturas, despacha sus entregas y publica su contenido — desde un panel, o con una sola API REST si construyes tu propio producto.',
    'home.faq.technical.question': '¿Necesito saber de tecnología para usarlo?',
    'home.faq.technical.answer':
      'No. Armas tu tienda, cargas tus productos y empiezas a cobrar desde el panel, sin escribir una línea de código. La API está ahí para quien la quiera, no para quien quiera vender.',
    'home.faq.integrate.question': '¿Puedo integrarlo en mi propio producto?',
    'home.faq.integrate.answer':
      'Sí. Todo lo que hace el panel está expuesto en la API REST, con autenticación de dos tokens y webhooks — y el panel de marca blanca puede correr con tu propia marca.',
  },
});
