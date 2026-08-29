import { defineMessages } from '@i18n/ui';

/**
 * Home page copy — the single most-read page on the site, so headlines are
 * rewritten to hold their line in Spanish rather than transliterated.
 *
 * `home.hero.headline` is the one deliberate exception: "One Platform. Every
 * Solution." is the brand slogan (see `common.ts`), and a brand line that
 * changes per language stops being a brand line — it is identical, in
 * English, in both locales below.
 */
export default defineMessages({
  en: {
    'home.title': '1Platform — Online Store, Website & Payments in One Platform',
    'home.description':
      'Launch an online store or website with payments, electronic invoicing, AI content, and your own domain — all from one platform. Or integrate it via REST API.',

    // — JSON-LD ———————————————————————————————————————————————
    'home.jsonld.name': '1Platform',
    'home.jsonld.brandName': '1Platform Labs',

    // — Hero ——————————————————————————————————————————————————
    'home.hero.headline': 'One Platform. Every Solution.',
    'home.hero.lead':
      'Sell online, get paid, invoice and publish from a single account — in the dashboard or through one REST API. Every module already talks to the others.',
    'home.hero.fan.aria': 'Screens of the product, fanned out in perspective',
    'home.hero.search.label': 'Find your solution',
    'home.hero.search.placeholder': 'Find your solution…',
    'home.hero.search.submit': 'Go to the solution',

    // — Showcase: five solutions, scroll-pinned ————————————————————
    'home.showcase.aria': 'How each solution is put together',
    'home.showcase.tabs.aria': 'Solutions in this showcase',
    'home.showcase.entry.aria': 'Open {label}',
    'home.showcase.panel.aria': '{label}: the steps, connected',
    'home.showcase.store.node.1.label': 'Product catalog',
    'home.showcase.store.node.1.chip': 'Catalog',
    'home.showcase.store.node.2.label': 'Checkout page',
    'home.showcase.store.node.2.chip': 'Checkout',
    'home.showcase.store.node.3.label': 'Card payment',
    'home.showcase.store.node.3.chip': 'Payment',
    'home.showcase.store.node.4.label': 'Electronic invoice',
    'home.showcase.store.node.4.chip': 'Invoice',
    'home.showcase.store.node.5.label': 'Your own domain',
    'home.showcase.store.node.5.chip': 'Website',
    'home.showcase.payments.node.1.label': 'Payment link',
    'home.showcase.payments.node.1.chip': 'Link',
    'home.showcase.payments.node.2.label': 'Card-present sale',
    'home.showcase.payments.node.2.chip': 'In person',
    'home.showcase.payments.node.3.label': 'Invoice, PDF and XML',
    'home.showcase.payments.node.3.chip': 'Invoice',
    'home.showcase.payments.node.4.label': 'Customer subscription',
    'home.showcase.payments.node.4.chip': 'Recurring',
    'home.showcase.content.node.1.label': 'Keyword research',
    'home.showcase.content.node.1.chip': 'Keyword',
    'home.showcase.content.node.2.label': 'Generated article',
    'home.showcase.content.node.2.chip': 'Article',
    'home.showcase.content.node.3.label': 'Generated image',
    'home.showcase.content.node.3.chip': 'Image',
    'home.showcase.content.node.4.label': 'Published and indexed',
    'home.showcase.content.node.4.chip': 'Publish',
    'home.showcase.content.node.5.label': 'Dashboard under your brand',
    'home.showcase.content.node.5.chip': 'Whitelabel',
    'home.showcase.deliveries.node.1.label': 'Shipping quote',
    'home.showcase.deliveries.node.1.chip': 'Quote',
    'home.showcase.deliveries.node.2.label': 'Shipping label',
    'home.showcase.deliveries.node.2.chip': 'Label',
    'home.showcase.deliveries.node.3.label': 'Tracking page',
    'home.showcase.deliveries.node.3.chip': 'Tracking',
    'home.showcase.ads.node.1.label': 'Campaign setup',
    'home.showcase.ads.node.1.chip': 'Campaign',
    'home.showcase.ads.node.2.label': 'Creative',
    'home.showcase.ads.node.2.chip': 'Creative',
    'home.showcase.ads.node.3.label': 'Spend report',
    'home.showcase.ads.node.3.chip': 'Report',

    // — What you get: the four pillars ———————————————————————————

    // — Capabilities: four featured + the index ———————————————————
    'home.featured.store.title': 'Online Store',
    'home.featured.payments.title': 'Payment Processing',
    'home.featured.invoicing.title': 'Electronic Invoicing',
    'home.featured.content.title': 'AI Content Generation',

    'home.featured.deliveries.title': 'Delivery Management',
    'home.featured.advertising.title': 'Advertising Campaigns',
    'home.group.sellGetPaid.item.paymentLinks': 'Payment Links',
    'home.group.sellGetPaid.item.cardPresent': 'Card-Present Payments',
    'home.group.sellGetPaid.item.merchantSubscriptions': 'Customer Subscriptions',
    'home.group.contentSeo.item.aiImage': 'AI Image Generation',
    'home.group.contentSeo.item.indexing': 'Indexing Automation',
    'home.group.contentSeo.item.linkBuilding': 'Link Building',
    'home.group.contentSeo.item.searchConsole': 'Search Console',
    'home.group.contentSeo.item.legalPages': 'Legal Page Generation',
    'home.group.storefront.item.domain': 'Custom Domain',
    'home.group.storefront.item.whitelabel': 'Whitelabel Dashboard',
    'home.group.developer.item.webhooks': 'Webhooks',
    'home.group.developer.item.agents': 'AI Agents',
    'home.group.developer.item.logs': 'Activity Logs',


    // — Personas (LMW-06) — titles/descriptions reuse home.useCase.* ————
    'home.personas.title': 'Made for how you work',
    'home.personas.tabsAria': 'Choose your kind of business',
    'home.personas.open': 'See how {title} use 1Platform',
    // The vertical tag on each card's media is the brand name, identical in
    // both trees — brand, not copy.
    'home.personas.brandTag': '1PLATFORM',
    // Short names for the segmented control only — the cards keep the full
    // home.useCase.* copy. The reference's control is 559 px wide; the full
    // titles measured ~1,000 and overlapped the satellites (deviation noted
    // in the PROGRESO).
    'home.personas.tab.small-business': 'Small business',
    'home.personas.tab.sellers': 'Sellers & creators',
    'home.personas.tab.services': 'Services',
    'home.personas.tab.agencies': 'Agencies',
    'home.personas.tab.developers': 'Developers',

    // — Module carousel (LMW-07, D-11) ————————————————————————————
    // The heading is the brand line, English in both trees like the H1.
    'home.modules.title': 'One platform. Every solution.',
    'home.modules.carouselAria': 'Every module of the platform',
    'home.modules.prev': 'Previous modules',
    'home.modules.next': 'Next modules',
    'home.modules.position': '{current} of {total}: {label}',

    // — How it works —————————————————————————————————————————————

    // — Integrate: copy + code sample ————————————————————————————

    // — Who it's for (rendered by the persona stack since F3) ————————
    'home.useCase.smallBusiness.title': 'Small business owners',
    'home.useCase.smallBusiness.description':
      'Launch your store or website in days, not months — payments, invoicing, and content handled for you.',
    'home.useCase.sellers.title': 'Online sellers & creators',
    'home.useCase.sellers.description':
      'Sell products, services, or digital downloads — accept payments and issue compliant invoices automatically.',
    'home.useCase.services.title': 'Service-based businesses',
    'home.useCase.services.description':
      'Book services, collect deposits, send invoices, and publish your portfolio — all from one dashboard.',
    'home.useCase.agencies.title': 'Agencies managing client sites',
    'home.useCase.agencies.description':
      'Run dozens of client stores and websites from one dashboard — whitelabel optional, billing per client.',
    'home.useCase.developers.title': 'Developers building SaaS',
    'home.useCase.developers.description':
      'Use 1Platform as the backend for your own product — payments, invoicing, content, and dashboard included.',


    // — Pricing (LMW-08, D-12): geometry of the reference, the real model,
    //   zero figures. Card names group the pricing page's own catalogue. ——
    'home.pricing.title': 'Pricing',
    'home.pricing.toggle.legend': 'How you pay',
    'home.pricing.toggle.quoted': 'Quoted services',
    'home.pricing.eyebrow.metered': 'Pay per operation',
    'home.pricing.eyebrow.quoted': 'Quoted per project',
    'home.pricing.chip.noMonthly': 'No monthly fee',
    'home.pricing.chip.balance': 'Draws from your prepaid balance',
    'home.pricing.chip.quote': 'Quoted before you commit',
    'home.pricing.features.metered': 'Operations',
    'home.pricing.features.quoted': 'Services',
    'home.pricing.cta': 'See pricing',
    'home.pricing.card.content.name': 'Content',
    'home.pricing.card.content.tagline': 'Articles, comments, profiles and legal pages, generated and published.',
    'home.pricing.card.content.detail': 'Charged per article, comment, profile or page generated.',
    'home.pricing.card.imagesKeywords.name': 'Images & keywords',
    'home.pricing.card.imagesKeywords.tagline': 'Generated and stock images, and the keywords to aim them.',
    'home.pricing.card.imagesKeywords.detail': 'Charged per image produced and per keyword search you run.',
    'home.pricing.card.indexingSeo.name': 'Indexing & SEO',
    'home.pricing.card.indexingSeo.tagline': 'Get published work indexed, measured and worked by agents.',
    'home.pricing.card.indexingSeo.detail': 'Charged per URL submitted, per report pulled and per agent step.',
    'home.pricing.card.payments.name': 'Payments',
    'home.pricing.card.payments.tagline': 'Card processing, priced by the networks in your country.',
    'home.pricing.card.payments.detail': 'Your rate is quoted for your country before you take the first payment.',
    'home.pricing.card.invoicingDomains.name': 'Invoicing & domains',
    'home.pricing.card.invoicingDomains.tagline': 'Compliant invoicing and domain registration, priced by their registries.',
    'home.pricing.card.invoicingDomains.detail': 'Certification and each domain’s extension set the quote you approve first.',
    'home.pricing.card.linkVolume.name': 'Link building & volume',
    'home.pricing.card.linkVolume.tagline': 'Placements set by publishers, and volume rates set against your usage.',
    'home.pricing.card.linkVolume.detail': 'Each placement is quoted by its publisher; volume terms follow your usage.',
    'home.pricing.enterprise.name': 'Whitelabel & enterprise',
    'home.pricing.enterprise.tagline': 'The whole platform under your brand, with terms sized to your volume.',
    'home.pricing.enterprise.cta': 'Contact sales',
    'home.pricing.enterprise.f1': 'Your brand, colors and domain',
    'home.pricing.enterprise.f2': 'Per-client workspaces and billing',
    'home.pricing.enterprise.f3': 'Volume rates quoted to your usage',
    'home.pricing.enterprise.f4': 'The same REST API underneath',

    // — FAQ (LMW-09, D-13): six answers reused from the pricing page, two new —
    'home.faq.title': 'Frequently asked questions',
    'home.faq.whatIs.question': 'What is 1Platform?',
    'home.faq.whatIs.answer':
      'One account that sells online, gets paid, issues invoices, ships and publishes content — from one dashboard, or through one REST API if you are building your own product.',
    'home.faq.integrate.question': 'Can I integrate it into my own product?',
    'home.faq.integrate.answer':
      'Yes. Everything the dashboard does is exposed through the REST API, with two-token authentication and webhooks — and the whitelabel dashboard can run under your own brand.',

    // — Unified vs fragmented —————————————————————————————————————
  },
  es: {
    'home.title': '1Platform — Tienda online, sitio web y pagos en una sola plataforma',
    'home.description':
      'Lanza una tienda online o un sitio web con pagos, facturación electrónica, contenido con IA y tu propio dominio — todo desde una sola plataforma. O intégralo vía API REST.',

    // — JSON-LD ———————————————————————————————————————————————
    'home.jsonld.name': '1Platform',
    'home.jsonld.brandName': '1Platform Labs',

    // — Hero ——————————————————————————————————————————————————
    // Brand slogan — stays in English in both trees, see the module docblock.
    'home.hero.headline': 'One Platform. Every Solution.',
    'home.hero.lead':
      'Vende por internet, cobra, factura y publica desde una sola cuenta — en el panel o con una sola API REST. Cada módulo ya habla con los demás.',
    'home.hero.fan.aria': 'Pantallas del producto, desplegadas en perspectiva',
    'home.hero.search.label': 'Encuentra tu solución',
    'home.hero.search.placeholder': 'Encuentra tu solución…',
    'home.hero.search.submit': 'Ir a la solución',

    // — Showcase: cinco soluciones, fijadas al scroll ———————————————
    'home.showcase.aria': 'Cómo se compone cada solución',
    'home.showcase.tabs.aria': 'Soluciones de esta muestra',
    'home.showcase.entry.aria': 'Abrir {label}',
    'home.showcase.panel.aria': '{label}: los pasos, conectados',
    'home.showcase.store.node.1.label': 'Catálogo de productos',
    'home.showcase.store.node.1.chip': 'Catálogo',
    'home.showcase.store.node.2.label': 'Página de checkout',
    'home.showcase.store.node.2.chip': 'Checkout',
    'home.showcase.store.node.3.label': 'Pago con tarjeta',
    'home.showcase.store.node.3.chip': 'Pago',
    'home.showcase.store.node.4.label': 'Factura electrónica',
    'home.showcase.store.node.4.chip': 'Factura',
    'home.showcase.store.node.5.label': 'Tu propio dominio',
    'home.showcase.store.node.5.chip': 'Sitio web',
    'home.showcase.payments.node.1.label': 'Enlace de cobro',
    'home.showcase.payments.node.1.chip': 'Enlace',
    'home.showcase.payments.node.2.label': 'Venta con tarjeta presente',
    'home.showcase.payments.node.2.chip': 'Presencial',
    'home.showcase.payments.node.3.label': 'Factura en PDF y XML',
    'home.showcase.payments.node.3.chip': 'Factura',
    'home.showcase.payments.node.4.label': 'Suscripción del cliente',
    'home.showcase.payments.node.4.chip': 'Recurrente',
    'home.showcase.content.node.1.label': 'Investigación de palabras clave',
    'home.showcase.content.node.1.chip': 'Palabra clave',
    'home.showcase.content.node.2.label': 'Artículo generado',
    'home.showcase.content.node.2.chip': 'Artículo',
    'home.showcase.content.node.3.label': 'Imagen generada',
    'home.showcase.content.node.3.chip': 'Imagen',
    'home.showcase.content.node.4.label': 'Publicado e indexado',
    'home.showcase.content.node.4.chip': 'Publicar',
    'home.showcase.content.node.5.label': 'Panel con tu marca',
    'home.showcase.content.node.5.chip': 'Marca blanca',
    'home.showcase.deliveries.node.1.label': 'Cotización del envío',
    'home.showcase.deliveries.node.1.chip': 'Cotizar',
    'home.showcase.deliveries.node.2.label': 'Etiqueta de envío',
    'home.showcase.deliveries.node.2.chip': 'Etiqueta',
    'home.showcase.deliveries.node.3.label': 'Página de rastreo',
    'home.showcase.deliveries.node.3.chip': 'Rastreo',
    'home.showcase.ads.node.1.label': 'Configuración de la campaña',
    'home.showcase.ads.node.1.chip': 'Campaña',
    'home.showcase.ads.node.2.label': 'Creatividad',
    'home.showcase.ads.node.2.chip': 'Creatividad',
    'home.showcase.ads.node.3.label': 'Reporte de gasto',
    'home.showcase.ads.node.3.chip': 'Reporte',

    // — Lo que obtienes: los cuatro pilares —————————————————————

    // — Capacidades: cuatro destacadas + el índice ——————————————
    'home.featured.store.title': 'Tienda online',
    'home.featured.payments.title': 'Procesamiento de pagos',
    'home.featured.invoicing.title': 'Facturación electrónica',
    'home.featured.content.title': 'Generación de contenido con IA',

    'home.featured.deliveries.title': 'Gestión de envíos',
    'home.featured.advertising.title': 'Campañas publicitarias',
    'home.group.sellGetPaid.item.paymentLinks': 'Enlaces de cobro',
    'home.group.sellGetPaid.item.cardPresent': 'Cobro con tarjeta presente',
    'home.group.sellGetPaid.item.merchantSubscriptions': 'Suscripciones de tus clientes',
    'home.group.contentSeo.item.aiImage': 'Generación de imágenes con IA',
    'home.group.contentSeo.item.indexing': 'Automatización de indexación',
    'home.group.contentSeo.item.linkBuilding': 'Construcción de enlaces',
    'home.group.contentSeo.item.searchConsole': 'Search Console',
    'home.group.contentSeo.item.legalPages': 'Generación de páginas legales',
    'home.group.storefront.item.domain': 'Dominio propio',
    'home.group.storefront.item.whitelabel': 'Panel de marca blanca',
    'home.group.developer.item.webhooks': 'Webhooks',
    'home.group.developer.item.agents': 'Agentes de IA',
    'home.group.developer.item.logs': 'Registro de actividad',


    // — Personas (LMW-06) ————————————————————————————————————————
    'home.personas.title': 'Hecho para tu forma de trabajar',
    'home.personas.tabsAria': 'Elige tu tipo de negocio',
    'home.personas.open': 'Mira cómo usan 1Platform: {title}',
    'home.personas.brandTag': '1PLATFORM',
    'home.personas.tab.small-business': 'Negocios pequeños',
    'home.personas.tab.sellers': 'Vendedores y creadores',
    'home.personas.tab.services': 'Servicios',
    'home.personas.tab.agencies': 'Agencias',
    'home.personas.tab.developers': 'Desarrolladores',

    // — Carrusel de módulos (LMW-07, D-11) ———————————————————————
    'home.modules.title': 'One platform. Every solution.',
    'home.modules.carouselAria': 'Todos los módulos de la plataforma',
    'home.modules.prev': 'Módulos anteriores',
    'home.modules.next': 'Módulos siguientes',
    'home.modules.position': '{current} de {total}: {label}',

    // — Cómo funciona ————————————————————————————————————————————

    // — Integración: copy + ejemplo de código ————————————————————

    // — A quién va dirigido (lo dibuja la pila de personas desde F3) —
    'home.useCase.smallBusiness.title': 'Pequeños negocios',
    'home.useCase.smallBusiness.description':
      'Lanza tu tienda o sitio en días, no en meses — con pagos, facturación y contenido ya resueltos.',
    'home.useCase.sellers.title': 'Vendedores y creadores online',
    'home.useCase.sellers.description':
      'Vende productos, servicios o descargas digitales — acepta pagos y emite facturas conformes de forma automática.',
    'home.useCase.services.title': 'Negocios de servicios',
    'home.useCase.services.description':
      'Agenda servicios, cobra anticipos, envía facturas y publica tu portafolio — todo desde un panel.',
    'home.useCase.agencies.title': 'Agencias con sitios de clientes',
    'home.useCase.agencies.description':
      'Administra decenas de tiendas y sitios de clientes desde un panel — marca blanca opcional, facturación por cliente.',
    'home.useCase.developers.title': 'Desarrolladores que construyen SaaS',
    'home.useCase.developers.description':
      'Usa 1Platform como backend de tu propio producto — pagos, facturación, contenido y panel incluidos.',


    // — Precios (LMW-08, D-12) ————————————————————————————————————
    'home.pricing.title': 'Precios',
    'home.pricing.toggle.legend': 'Cómo se paga',
    'home.pricing.toggle.quoted': 'Servicios cotizados',
    'home.pricing.eyebrow.metered': 'Pago por operación',
    'home.pricing.eyebrow.quoted': 'Cotizado por proyecto',
    'home.pricing.chip.noMonthly': 'Sin cuota mensual',
    'home.pricing.chip.balance': 'Descuenta de tu saldo prepago',
    'home.pricing.chip.quote': 'Cotizado antes de confirmar',
    'home.pricing.features.metered': 'Operaciones',
    'home.pricing.features.quoted': 'Servicios',
    'home.pricing.cta': 'Ver precios',
    'home.pricing.card.content.name': 'Contenido',
    'home.pricing.card.content.tagline': 'Artículos, comentarios, perfiles y páginas legales, generados y publicados.',
    'home.pricing.card.content.detail': 'Se cobra por artículo, comentario, perfil o página generados.',
    'home.pricing.card.imagesKeywords.name': 'Imágenes y palabras clave',
    'home.pricing.card.imagesKeywords.tagline': 'Imágenes generadas y de stock, y las palabras clave para apuntarlas.',
    'home.pricing.card.imagesKeywords.detail': 'Se cobra por imagen producida y por búsqueda de palabras clave.',
    'home.pricing.card.indexingSeo.name': 'Indexación y SEO',
    'home.pricing.card.indexingSeo.tagline': 'Indexa lo publicado, mídelo y déjalo en manos de agentes.',
    'home.pricing.card.indexingSeo.detail': 'Se cobra por URL enviada, por reporte consultado y por paso del agente.',
    'home.pricing.card.payments.name': 'Pagos',
    'home.pricing.card.payments.tagline': 'Procesamiento de tarjetas, con el precio de las redes de tu país.',
    'home.pricing.card.payments.detail': 'Tu tarifa se cotiza para tu país antes de cobrar el primer pago.',
    'home.pricing.card.invoicingDomains.name': 'Facturación y dominios',
    'home.pricing.card.invoicingDomains.tagline': 'Facturación conforme y registro de dominios, al precio de sus registros.',
    'home.pricing.card.invoicingDomains.detail': 'La certificación y la extensión de cada dominio fijan la cotización que apruebas primero.',
    'home.pricing.card.linkVolume.name': 'Enlaces y volumen',
    'home.pricing.card.linkVolume.tagline': 'Publicaciones que fija cada medio, y tarifas por volumen según tu uso.',
    'home.pricing.card.linkVolume.detail': 'Cada publicación la cotiza su medio; las condiciones por volumen siguen tu uso.',
    'home.pricing.enterprise.name': 'Marca blanca y enterprise',
    'home.pricing.enterprise.tagline': 'Toda la plataforma con tu marca, con condiciones a la medida de tu volumen.',
    'home.pricing.enterprise.cta': 'Habla con ventas',
    'home.pricing.enterprise.f1': 'Tu marca, tus colores y tu dominio',
    'home.pricing.enterprise.f2': 'Espacios y facturación por cliente',
    'home.pricing.enterprise.f3': 'Tarifas por volumen cotizadas a tu uso',
    'home.pricing.enterprise.f4': 'La misma API REST por debajo',

    // — FAQ (LMW-09, D-13) ————————————————————————————————————————
    'home.faq.title': 'Preguntas frecuentes',
    'home.faq.whatIs.question': '¿Qué es 1Platform?',
    'home.faq.whatIs.answer':
      'Una sola cuenta que vende por internet, cobra, emite facturas, envía y publica contenido — desde un panel, o con una sola API REST si construyes tu propio producto.',
    'home.faq.integrate.question': '¿Puedo integrarlo en mi propio producto?',
    'home.faq.integrate.answer':
      'Sí. Todo lo que hace el panel está expuesto en la API REST, con autenticación de dos tokens y webhooks — y el panel de marca blanca puede correr con tu propia marca.',

    // — Unificado vs fragmentado ————————————————————————————————
  },
});
