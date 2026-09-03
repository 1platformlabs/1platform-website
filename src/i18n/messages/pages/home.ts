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
    'home.title': '1Platform — Online Store, Payments, Invoicing & Delivery',
    'home.description':
      'Open your online store, take card payments, issue the invoice on every sale, and dispatch your deliveries — your whole business, from one place.',
    'home.jsonld.name': '1Platform',
    'home.jsonld.brandName': '1Platform Labs',

    // — Hero ——————————————————————————————————————————————————
    'home.hero.badge': 'Connected commerce',
    'home.hero.headline': 'Sell online. Get paid, invoice and deliver.',
    'home.hero.lead':
      'A customer buys in your store. 1Platform takes the online payment, issues the invoice and moves the order into delivery — one connected flow from checkout to door.',
    'home.hero.scene.aria':
      'A sale moves from an online store to an approved online payment, an automatically issued invoice and a tracked delivery.',
    'home.hero.store.kicker': 'Storefront',
    'home.hero.store.title': 'Online Store',
    'home.hero.store.event': 'Checkout received',
    'home.hero.store.status': 'Ready',
    'home.hero.payment.kicker': 'Checkout',
    'home.hero.payment.title': 'Online payment',
    'home.hero.payment.event': 'Card payment',
    'home.hero.payment.status': 'Approved',
    'home.hero.invoice.kicker': 'Automatic',
    'home.hero.invoice.title': 'Electronic invoice',
    'home.hero.invoice.event': 'Sale document',
    'home.hero.invoice.status': 'Issued',
    'home.hero.delivery.kicker': 'Dispatch',
    'home.hero.delivery.title': 'Delivery',
    'home.hero.delivery.event': 'Tracking shared',
    'home.hero.delivery.status': 'In transit',
    // The home does NOT reuse the chrome's generic `cta.getStarted`. The header
    // button has to work on every page, so it stays broad; the most-visited
    // page can name the outcome the visitor came for.
    'home.hero.cta': 'Open Your Store Free',
    // Both halves are sourced from /pricing/ — "Start on the free plan … No
    // credit card" and "Pay for the operations you run" — not written here.
    // The price objection was already answered by the word "free"; what stops
    // a merchant is the fear of being signed up for something.
    'home.hero.ctaNote': 'No credit card and no subscription. You pay only for what you use.',

    // — One order, four connected moments ——————————————————————
    'home.flow.eyebrow': 'One connected sale',
    'home.flow.title': 'One order. Every step moving.',
    'home.flow.lead':
      'The checkout does not end at payment. The same order becomes its invoice and delivery without being copied between disconnected systems.',
    'home.flow.store.title': 'The store receives the order',
    'home.flow.store.description':
      'Your catalogue, cart and checkout work together on a store that carries your own brand and domain.',
    'home.flow.payment.title': 'The online payment is approved',
    'home.flow.payment.description':
      'The customer pays at checkout and the order advances from the same workspace when the payment is confirmed.',
    'home.flow.invoice.title': 'The invoice is issued',
    'home.flow.invoice.description':
      'The valid electronic invoice is created from the sale automatically, without typing the order out again.',
    'home.flow.delivery.title': 'The delivery goes out',
    'home.flow.delivery.description':
      'Dispatch with your own staff or a courier and share a tracking link all the way to the customer’s door.',

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
    'home.title': '1Platform — Tienda online, pagos, facturación y envíos',
    'home.description':
      'Abre tu tienda en línea, cobra con tarjeta, emite la factura sola en cada venta y despacha tus entregas — todo tu comercio, desde un solo lugar.',
    'home.jsonld.name': '1Platform',
    'home.jsonld.brandName': '1Platform Labs',

    // — Portada ———————————————————————————————————————————————
    'home.hero.badge': 'Comercio conectado',
    'home.hero.headline': 'Vende en línea. Cobra, factura y entrega.',
    'home.hero.lead':
      'Tu cliente compra en la tienda. 1Platform recibe el pago en línea, emite la factura y mueve el pedido a reparto — un solo flujo desde el checkout hasta la puerta.',
    'home.hero.scene.aria':
      'Una venta pasa de la tienda en línea a un pago aprobado, una factura emitida automáticamente y un envío con seguimiento.',
    'home.hero.store.kicker': 'Escaparate',
    'home.hero.store.title': 'Tienda en línea',
    'home.hero.store.event': 'Checkout recibido',
    'home.hero.store.status': 'Listo',
    'home.hero.payment.kicker': 'Checkout',
    'home.hero.payment.title': 'Pago en línea',
    'home.hero.payment.event': 'Pago con tarjeta',
    'home.hero.payment.status': 'Aprobado',
    'home.hero.invoice.kicker': 'Automática',
    'home.hero.invoice.title': 'Factura electrónica',
    'home.hero.invoice.event': 'Documento de venta',
    'home.hero.invoice.status': 'Emitida',
    'home.hero.delivery.kicker': 'Despacho',
    'home.hero.delivery.title': 'Envío',
    'home.hero.delivery.event': 'Seguimiento compartido',
    'home.hero.delivery.status': 'En ruta',
    'home.hero.cta': 'Abre tu tienda gratis',
    'home.hero.ctaNote': 'Sin tarjeta de crédito y sin suscripción. Pagas solo por lo que uses.',

    // — Un pedido, cuatro momentos conectados ——————————————————
    'home.flow.eyebrow': 'Una venta conectada',
    'home.flow.title': 'Un pedido. Todo avanzando.',
    'home.flow.lead':
      'El checkout no termina en el cobro. El mismo pedido se convierte en su factura y su envío sin copiarlo entre sistemas desconectados.',
    'home.flow.store.title': 'La tienda recibe el pedido',
    'home.flow.store.description':
      'Tu catálogo, carrito y checkout trabajan juntos en una tienda con tu propia marca y dominio.',
    'home.flow.payment.title': 'El pago en línea se aprueba',
    'home.flow.payment.description':
      'El cliente paga en el checkout y el pedido avanza desde el mismo espacio cuando se confirma el cobro.',
    'home.flow.invoice.title': 'La factura se emite',
    'home.flow.invoice.description':
      'La factura electrónica válida se crea desde la venta en automático, sin volver a escribir el pedido.',
    'home.flow.delivery.title': 'El envío sale a ruta',
    'home.flow.delivery.description':
      'Despacha con tu propio personal o una mensajería y comparte seguimiento hasta la puerta del cliente.',

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
