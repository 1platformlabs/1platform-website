import { defineMessages } from '@i18n/ui';

/**
 * Solutions index. Titles that name one of the five glossary solutions reuse
 * the `nav.solutions.*` keys from common.ts instead of redefining them here —
 * "Online Store", "Website Builder", "Payments & Invoicing" and "Whitelabel
 * Dashboard" all appear verbatim as card/catalogue titles on this page.
 */
export default defineMessages({
  en: {
    'solutions.title': 'Solutions — Online Store, Website, Payments, Content | 1Platform',
    'solutions.description':
      'Sell online, build a website, generate content, and ship a developer platform — all from one unified platform. Outcome-driven solutions for every business.',

    'solutions.hero.headline': 'Every Solution. One Platform.',
    'solutions.hero.subheadline':
      'Sell online, build a website, generate content, and ship a developer platform — all from one unified product. Every capability below shares one account, one API, and one bill.',
    'solutions.hero.badge': 'Sell · Build · Grow · Integrate',
    'solutions.hero.cta.secondary': 'For Developers — View API',

    'solutions.startHere.eyebrow': 'Start here',
    'solutions.startHere.lead': 'Most people arrive for one of four things.',

    'solutions.featured.onlineStore.desc':
      'Catalog, cart, and checkout on your own domain — with payments and invoicing already wired in.',
    'solutions.featured.website.desc':
      'Your own domain, a live site raised on it, and AI content that fills it.',
    'solutions.featured.payments.desc':
      'Accept card payments and issue compliant electronic invoices from the same transaction.',
    'solutions.featured.whitelabel.desc':
      'Branding, theme, layout, i18n, and KPIs resolved in one bootstrap call — under your name.',

    // — Group: sell and get paid —————————————————————————————————
    'solutions.group.intelligence.eyebrow': 'Sell and get paid',
    'solutions.group.intelligence.title': 'The monetization core',
    'solutions.group.intelligence.desc':
      'Take money, prove it with a compliant invoice, own the domain it happens on, and bill for usage — without stitching separate vendors together.',
    'solutions.group.intelligence.item.paymentProcessing.title': 'Payment Processing',
    'solutions.group.intelligence.item.paymentProcessing.desc':
      'Accept card payments via API. Checkout URLs, real-time webhooks, and automatic balance crediting.',
    'solutions.group.intelligence.item.paymentProcessing.replaces': 'A separate payment gateway integration',
    'solutions.group.intelligence.item.electronicInvoicing.title': 'Electronic Invoicing',
    'solutions.group.intelligence.item.electronicInvoicing.desc':
      'Compliant electronic invoices generated automatically. PDF + XML output, multi-item lines, automatic tax calculation.',
    'solutions.group.intelligence.item.electronicInvoicing.replaces': 'Invoicing software plus manual compliance',
    'solutions.group.intelligence.item.branches.title': 'Businesses & Branches',
    'solutions.group.intelligence.item.branches.desc':
      'A workspace can hold several businesses, and each branch issues its invoices independently — its own address, its own numbering, its own record.',
    'solutions.group.intelligence.item.branches.replaces': 'One account per location, reconciled by hand',
    'solutions.group.intelligence.item.domainManagement.title': 'Domain Management',
    'solutions.group.intelligence.item.domainManagement.desc':
      'Register, transfer, and renew domains. Manage DNS records and nameservers — all programmatically.',
    'solutions.group.intelligence.item.domainManagement.replaces': 'A separate registrar dashboard',
    'solutions.group.intelligence.item.subscriptionsBilling.title': 'Balance & Usage',
    'solutions.group.intelligence.item.subscriptionsBilling.desc':
      'Your own account with 1Platform: watch the balance, see what each operation consumed, and top it up. Credits-based, pay-per-use, transparent.',
    'solutions.group.intelligence.item.subscriptionsBilling.replaces': 'Guessing what a platform bill will say',

    'solutions.group.intelligence.item.paymentLinks.title': 'Payment Links',
    'solutions.group.intelligence.item.paymentLinks.desc':
      'Send a link to charge someone who is not a 1Platform user. They pay without an account and without signing in.',
    'solutions.group.intelligence.item.paymentLinks.replaces': 'Chasing a bank transfer by message',

    'solutions.group.intelligence.item.cardPresent.title': 'Card-Present Payments',
    'solutions.group.intelligence.item.cardPresent.desc':
      'Apply for a card terminal, attach the documents, and follow the application through to its answer.',
    'solutions.group.intelligence.item.cardPresent.replaces': 'A separate acquirer relationship',

    'solutions.group.intelligence.item.merchantSubscriptions.title': 'Customer Subscriptions',
    'solutions.group.intelligence.item.merchantSubscriptions.desc':
      'Publish your own plans, enrol your customers, and charge them on a schedule. Your plans, not your balance with us.',
    'solutions.group.intelligence.item.merchantSubscriptions.replaces': 'A separate subscription billing tool',

    'solutions.group.intelligence.item.deliveries.title': 'Delivery Management',
    'solutions.group.intelligence.item.deliveries.desc':
      'Register a shipment, dispatch it with your own staff or a courier service, and give your buyer a link to follow it.',
    'solutions.group.intelligence.item.deliveries.replaces': 'A spreadsheet beside the orders',

    // — Group: build your site ———————————————————————————————————
    'solutions.group.content.eyebrow': 'Build your site',
    'solutions.group.content.title': 'Everything the storefront is made of',
    'solutions.group.content.desc':
      'Launch a store or a website, generate the content and images that fill it, ship the legal pages it needs, and publish to your CMS.',
    'solutions.group.content.item.onlineStore.desc':
      'Launch a store with checkout, catalog, and customer accounts — no plugins, no patchwork.',
    'solutions.group.content.item.onlineStore.replaces': 'A standalone ecommerce platform',
    'solutions.group.content.item.websiteBuilder.title': 'Website & Domain',
    'solutions.group.content.item.websiteBuilder.desc':
      'Register or connect a domain and we raise the site on it — DNS, routing and mail included.',
    'solutions.group.content.item.websiteBuilder.replaces': 'A standalone website builder',
    'solutions.group.content.item.aiContentGeneration.title': 'AI Content Generation',
    'solutions.group.content.item.aiContentGeneration.desc':
      'Generate SEO-optimized articles, descriptions, and landing pages with AI. Multi-language, async pipeline.',
    'solutions.group.content.item.aiContentGeneration.replaces': 'A standalone AI writing tool',
    'solutions.group.content.item.aiImageGeneration.title': 'AI Image Generation',
    'solutions.group.content.item.aiImageGeneration.desc':
      'Create unique AI visuals or source from premium libraries — commercial license included.',
    'solutions.group.content.item.aiImageGeneration.replaces': 'Stock photo subscriptions',
    'solutions.group.content.item.legalPageGeneration.title': 'Legal Page Generation',
    'solutions.group.content.item.legalPageGeneration.desc':
      'Auto-generate privacy policies, terms of service, and cookie notices — tailored to your business.',
    'solutions.group.content.item.legalPageGeneration.replaces': 'Legal template services',
    // Moved here from /features/ when that page was retired: these three were
    // the only capabilities it named that this page did not. Everything else it
    // listed was already here, sometimes under a second name — "Keyword
    // Intelligence" and "SEO Intelligence" carried the same description word
    // for word, which is how one product ends up competing with itself.
    'solutions.group.content.item.aiComments.title': 'AI Comments',
    'solutions.group.content.item.aiComments.desc':
      'Generate contextual comments for blog posts and articles. Natural language that matches your voice.',
    'solutions.group.content.item.aiComments.replaces': 'A separate engagement or moderation tool',
    'solutions.group.content.item.authorProfiles.title': 'Author Profiles',
    'solutions.group.content.item.authorProfiles.desc':
      'Create and manage author profiles with bios, avatars, and metadata for multi-author publishing.',
    'solutions.group.content.item.authorProfiles.replaces': 'Author metadata kept by hand in the CMS',
    'solutions.group.content.item.cmsPublishing.title': 'CMS Publishing',
    'solutions.group.content.item.cmsPublishing.desc':
      'Publish directly to WordPress and other CMS platforms. Schedule posts, set categories, manage media.',
    'solutions.group.content.item.cmsPublishing.replaces': 'CMS plugins and manual publishing workflows',

    // — Group: grow and reach ————————————————————————————————————
    'solutions.group.distribution.eyebrow': 'Grow and reach',
    'solutions.group.distribution.title': 'The distribution layer',
    'solutions.group.distribution.desc':
      'Keyword intelligence, indexing, link building, analytics, paid campaigns, and ad revenue — the work that happens after the site is live.',
    'solutions.group.distribution.item.seoIntelligence.title': 'SEO Intelligence',
    'solutions.group.distribution.item.seoIntelligence.desc':
      'Extract keywords with volume, intent, and difficulty from any URL or topic.',
    'solutions.group.distribution.item.seoIntelligence.replaces': 'A standalone keyword research tool',
    'solutions.group.distribution.item.searchConsole.title': 'Search Console',
    'solutions.group.distribution.item.searchConsole.desc':
      'Connect, verify, submit sitemaps, and monitor performance programmatically.',
    'solutions.group.distribution.item.searchConsole.replaces': 'Manual search console workflows',
    'solutions.group.distribution.item.indexingAutomation.title': 'Indexing Automation',
    'solutions.group.distribution.item.indexingAutomation.desc':
      'Submit URLs to search engines for faster crawling. Batch processing and status tracking.',
    'solutions.group.distribution.item.indexingAutomation.replaces': 'Manual URL submission and indexing plugins',
    'solutions.group.distribution.item.linkBuilding.title': 'Link Building',
    'solutions.group.distribution.item.linkBuilding.desc':
      'Integrated marketplace for guest posts and backlinks — build authority programmatically.',
    'solutions.group.distribution.item.linkBuilding.replaces': 'Outreach platforms and link marketplaces',
    'solutions.group.distribution.item.analytics.title': 'Analytics',
    'solutions.group.distribution.item.analytics.desc':
      'Connect analytics, provision properties, and retrieve traffic metrics — all through one API.',
    'solutions.group.distribution.item.analytics.replaces': 'Manual analytics setup across separate dashboards',
    'solutions.group.distribution.item.adRevenueTracking.title': 'Ad Revenue Tracking',
    'solutions.group.distribution.item.adRevenueTracking.desc':
      'Connect ad accounts, monitor earnings, track policy issues, and generate custom revenue reports. This is the money coming in; running paid campaigns is Advertising, the other way round.',
    'solutions.group.distribution.item.adRevenueTracking.replaces': 'Ad platform dashboards and manual tracking',

    'solutions.group.distribution.item.advertising.title': 'Advertising Campaigns',
    'solutions.group.distribution.item.advertising.desc':
      'Build a paid campaign, fund it from your workspace balance, and get back whatever was not spent once it settles.',
    'solutions.group.distribution.item.advertising.replaces': 'A second billing relationship to advertise',

    // — Group: developer platform ———————————————————————————————
    'solutions.group.payments.eyebrow': 'Developer platform',
    'solutions.group.payments.title': 'The operational layer for builders',
    'solutions.group.payments.desc':
      'The same capabilities the dashboard uses, exposed as REST: a whitelabel shell, webhooks, logs, agents, notifications, referrals, and support.',
    'solutions.group.payments.item.whitelabelDashboard.desc':
      'Bootstrap a fully branded dashboard from one API call. Branding, theme, layout, i18n, and KPIs.',
    'solutions.group.payments.item.whitelabelDashboard.replaces': 'A custom dashboard framework',
    'solutions.group.payments.item.webhooks.title': 'Webhooks',
    'solutions.group.payments.item.webhooks.desc':
      'Subscribe to real-time lifecycle events with HMAC-signed payloads, allowed-domain registration, and secret rotation.',
    'solutions.group.payments.item.webhooks.replaces': 'Custom event polling infrastructure',
    'solutions.group.payments.item.activityLogs.title': 'Activity Logs',
    'solutions.group.payments.item.activityLogs.desc':
      'Track every API call with detailed logs. Filter by endpoint, status, or date. Register client-side events.',
    'solutions.group.payments.item.activityLogs.replaces': 'A logging service and separate monitoring',
    'solutions.group.payments.item.aiAgents.title': 'AI Agents',
    'solutions.group.payments.item.aiAgents.desc':
      'Create autonomous agents from templates or a guided wizard. Schedule runs and handle human approvals.',
    'solutions.group.payments.item.aiAgents.replaces': 'Custom automation scripts',
    'solutions.group.payments.item.inAppNotifications.title': 'In-App Notifications',
    'solutions.group.payments.item.inAppNotifications.desc':
      'Push notifications to a single user or broadcast to all. List the feed, mark read, and read unread count.',
    'solutions.group.payments.item.inAppNotifications.replaces': 'A separate notification service',
    'solutions.group.payments.item.referrals.title': 'Referrals',
    'solutions.group.payments.item.referrals.desc':
      'Resolve referral codes to referrer username and pre-filled signup URLs — power personalized landing pages.',
    'solutions.group.payments.item.referrals.replaces': 'A standalone referral platform',
    'solutions.group.payments.item.supportCenter.title': 'Support Center',
    'solutions.group.payments.item.supportCenter.desc':
      'Embed an in-app help center — tickets, threaded replies, and a public FAQ catalog grouped by category.',
    'solutions.group.payments.item.supportCenter.replaces': 'A standalone help-desk tool',

    'solutions.catalog.replacesLabel': 'Replaces',

    'solutions.comparison.eyebrow': 'Unified vs fragmented',
    'solutions.comparison.lead': 'One account instead of separate subscriptions',

    'solutions.next.eyebrow': 'Next step',
    'solutions.next.title': 'Ready to simplify your stack?',
    'solutions.next.actions.viewPricing': 'See Pricing',
  },
  es: {
    'solutions.title': 'Soluciones — Tienda online, sitio web, pagos, contenido | 1Platform',
    'solutions.description':
      'Vende por internet, crea un sitio web, genera contenido y lanza una plataforma para desarrolladores — todo desde una sola plataforma unificada. Soluciones orientadas a resultados para cualquier negocio.',

    'solutions.hero.headline': 'Cada solución. Una sola plataforma.',
    'solutions.hero.subheadline':
      'Vende por internet, crea un sitio web, genera contenido y lanza una plataforma para desarrolladores — todo desde un solo producto unificado. Cada capacidad de abajo comparte una cuenta, una API y una sola factura.',
    'solutions.hero.badge': 'Vender · Crear · Crecer · Integrar',
    'solutions.hero.cta.secondary': 'Para desarrolladores — Ver la API',

    'solutions.startHere.eyebrow': 'Empieza aquí',
    'solutions.startHere.lead': 'La mayoría llega buscando una de estas cuatro cosas.',

    'solutions.featured.onlineStore.desc':
      'Catálogo, carrito y checkout en tu propio dominio — con pagos y facturación ya integrados.',
    'solutions.featured.website.desc':
      'Tu propio dominio, un sitio levantado sobre él y contenido con IA que lo llena.',
    'solutions.featured.payments.desc':
      'Acepta pagos con tarjeta y emite facturas electrónicas conformes desde la misma transacción.',
    'solutions.featured.whitelabel.desc':
      'Marca, tema, diseño, idiomas y KPIs resueltos en una sola llamada de arranque — bajo tu propio nombre.',

    // — Grupo: vende y cobra —————————————————————————————————————
    'solutions.group.intelligence.eyebrow': 'Vende y cobra',
    'solutions.group.intelligence.title': 'El núcleo de monetización',
    'solutions.group.intelligence.desc':
      'Cobra, respáldalo con una factura conforme, sé dueño del dominio donde ocurre y factura por uso — sin combinar proveedores por tu cuenta.',
    'solutions.group.intelligence.item.paymentProcessing.title': 'Procesamiento de pagos',
    'solutions.group.intelligence.item.paymentProcessing.desc':
      'Acepta pagos con tarjeta vía API. URLs de checkout, webhooks en tiempo real y acreditación automática de saldo.',
    'solutions.group.intelligence.item.paymentProcessing.replaces': 'Una integración aparte con una pasarela de pagos',
    'solutions.group.intelligence.item.electronicInvoicing.title': 'Facturación electrónica',
    'solutions.group.intelligence.item.electronicInvoicing.desc':
      'Facturas electrónicas conformes generadas automáticamente. Salida en PDF y XML, múltiples líneas y cálculo automático de impuestos.',
    'solutions.group.intelligence.item.electronicInvoicing.replaces': 'Software de facturación más cumplimiento manual',
    'solutions.group.intelligence.item.branches.title': 'Comercios y sucursales',
    'solutions.group.intelligence.item.branches.desc':
      'Un espacio de trabajo puede tener varios comercios, y cada sucursal emite sus facturas de forma independiente: su dirección, su numeración y su registro propios.',
    'solutions.group.intelligence.item.branches.replaces': 'Una cuenta por local, cuadrada a mano',
    'solutions.group.intelligence.item.domainManagement.title': 'Gestión de dominios',
    'solutions.group.intelligence.item.domainManagement.desc':
      'Registra, transfiere y renueva dominios. Gestiona registros DNS y nameservers — todo de forma programática.',
    'solutions.group.intelligence.item.domainManagement.replaces': 'Un panel de registrador aparte',
    'solutions.group.intelligence.item.subscriptionsBilling.title': 'Saldo y consumo',
    'solutions.group.intelligence.item.subscriptionsBilling.desc':
      'Tu propia cuenta con 1Platform: mira el saldo, ve qué consumió cada operación y recárgalo. Por créditos, por uso y de forma transparente.',
    'solutions.group.intelligence.item.subscriptionsBilling.replaces': 'Adivinar qué va a decir la factura de la plataforma',

    'solutions.group.intelligence.item.paymentLinks.title': 'Enlaces de cobro',
    'solutions.group.intelligence.item.paymentLinks.desc':
      'Manda un enlace para cobrarle a alguien que no es usuario de 1Platform. Paga sin cuenta y sin iniciar sesión.',
    'solutions.group.intelligence.item.paymentLinks.replaces': 'Perseguir una transferencia por mensaje',

    'solutions.group.intelligence.item.cardPresent.title': 'Cobro con tarjeta presente',
    'solutions.group.intelligence.item.cardPresent.desc':
      'Solicita una terminal, adjunta los documentos y sigue la solicitud hasta su respuesta.',
    'solutions.group.intelligence.item.cardPresent.replaces': 'Una relación aparte con un adquirente',

    'solutions.group.intelligence.item.merchantSubscriptions.title': 'Suscripciones de tus clientes',
    'solutions.group.intelligence.item.merchantSubscriptions.desc':
      'Publica tus propios planes, da de alta a tus clientes y cóbrales de forma periódica. Tus planes, no tu saldo con nosotros.',
    'solutions.group.intelligence.item.merchantSubscriptions.replaces': 'Una herramienta aparte de cobros recurrentes',

    'solutions.group.intelligence.item.deliveries.title': 'Gestión de envíos',
    'solutions.group.intelligence.item.deliveries.desc':
      'Registra un envío, despáchalo con tu propio personal o con una mensajería, y dale a tu comprador un enlace para seguirlo.',
    'solutions.group.intelligence.item.deliveries.replaces': 'Una hoja de cálculo al lado de los pedidos',

    // — Grupo: crea tu sitio —————————————————————————————————————
    'solutions.group.content.eyebrow': 'Crea tu sitio',
    'solutions.group.content.title': 'Todo lo que forma la tienda',
    'solutions.group.content.desc':
      'Lanza una tienda o un sitio web, genera el contenido e imágenes que lo llenan, publica las páginas legales que necesita y publícalo en tu CMS.',
    'solutions.group.content.item.onlineStore.desc':
      'Lanza una tienda con checkout, catálogo y cuentas de cliente — sin plugins ni parches.',
    'solutions.group.content.item.onlineStore.replaces': 'Una plataforma de ecommerce independiente',
    'solutions.group.content.item.websiteBuilder.title': 'Sitio web y dominio',
    'solutions.group.content.item.websiteBuilder.desc':
      'Registra o conecta un dominio y levantamos el sitio sobre él — DNS, enrutamiento y correo incluidos.',
    'solutions.group.content.item.websiteBuilder.replaces': 'Un creador de sitios web independiente',
    'solutions.group.content.item.aiContentGeneration.title': 'Generación de contenido con IA',
    'solutions.group.content.item.aiContentGeneration.desc':
      'Genera artículos, descripciones y landing pages optimizados para SEO con IA. Multilingüe, con procesamiento asíncrono.',
    'solutions.group.content.item.aiContentGeneration.replaces': 'Una herramienta de redacción con IA independiente',
    'solutions.group.content.item.aiImageGeneration.title': 'Generación de imágenes con IA',
    'solutions.group.content.item.aiImageGeneration.desc':
      'Crea imágenes únicas con IA o consíguelas de bancos premium — licencia comercial incluida.',
    'solutions.group.content.item.aiImageGeneration.replaces': 'Suscripciones a bancos de imágenes',
    'solutions.group.content.item.legalPageGeneration.title': 'Generación de páginas legales',
    'solutions.group.content.item.legalPageGeneration.desc':
      'Genera automáticamente políticas de privacidad, términos del servicio y avisos de cookies — a la medida de tu negocio.',
    'solutions.group.content.item.legalPageGeneration.replaces': 'Servicios de plantillas legales',
    'solutions.group.content.item.aiComments.title': 'Comentarios con IA',
    'solutions.group.content.item.aiComments.desc':
      'Genera comentarios contextuales para publicaciones de blog y artículos. Lenguaje natural que se ajusta a tu voz.',
    'solutions.group.content.item.aiComments.replaces': 'Una herramienta aparte de interacción o moderación',
    'solutions.group.content.item.authorProfiles.title': 'Perfiles de autor',
    'solutions.group.content.item.authorProfiles.desc':
      'Crea y administra perfiles de autor con biografías, avatares y metadatos para publicaciones con varios autores.',
    'solutions.group.content.item.authorProfiles.replaces': 'Metadatos de autor mantenidos a mano en el CMS',
    'solutions.group.content.item.cmsPublishing.title': 'Publicación en CMS',
    'solutions.group.content.item.cmsPublishing.desc':
      'Publica directamente en WordPress y otras plataformas CMS. Programa publicaciones, define categorías y gestiona medios.',
    'solutions.group.content.item.cmsPublishing.replaces': 'Plugins de CMS y flujos de publicación manuales',

    // — Grupo: crece y alcanza ———————————————————————————————————
    'solutions.group.distribution.eyebrow': 'Crece y alcanza',
    'solutions.group.distribution.title': 'La capa de distribución',
    'solutions.group.distribution.desc':
      'Inteligencia de palabras clave, indexación, link building, analítica, campañas pagadas e ingresos publicitarios — el trabajo que empieza cuando el sitio ya está en vivo.',
    'solutions.group.distribution.item.seoIntelligence.title': 'Inteligencia SEO',
    'solutions.group.distribution.item.seoIntelligence.desc':
      'Extrae palabras clave con volumen, intención y dificultad a partir de cualquier URL o tema.',
    'solutions.group.distribution.item.seoIntelligence.replaces': 'Una herramienta de investigación de palabras clave independiente',
    'solutions.group.distribution.item.searchConsole.title': 'Search Console',
    'solutions.group.distribution.item.searchConsole.desc':
      'Conecta, verifica, envía sitemaps y monitorea el rendimiento de forma programática.',
    'solutions.group.distribution.item.searchConsole.replaces': 'Flujos manuales de consola de búsqueda',
    'solutions.group.distribution.item.indexingAutomation.title': 'Automatización de indexación',
    'solutions.group.distribution.item.indexingAutomation.desc':
      'Envía URLs a los motores de búsqueda para un rastreo más rápido. Procesamiento por lotes y seguimiento de estado.',
    'solutions.group.distribution.item.indexingAutomation.replaces': 'Envío manual de URLs y plugins de indexación',
    'solutions.group.distribution.item.linkBuilding.title': 'Link Building',
    'solutions.group.distribution.item.linkBuilding.desc':
      'Marketplace integrado para guest posts y backlinks — construye autoridad de forma programática.',
    'solutions.group.distribution.item.linkBuilding.replaces': 'Plataformas de outreach y marketplaces de enlaces',
    'solutions.group.distribution.item.analytics.title': 'Analítica',
    'solutions.group.distribution.item.analytics.desc':
      'Conecta analítica, aprovisiona propiedades y obtén métricas de tráfico — todo a través de una sola API.',
    'solutions.group.distribution.item.analytics.replaces': 'Configuración manual de analítica en paneles separados',
    'solutions.group.distribution.item.adRevenueTracking.title': 'Seguimiento de ingresos publicitarios',
    'solutions.group.distribution.item.adRevenueTracking.desc':
      'Conecta cuentas publicitarias, monitorea ganancias, da seguimiento a incidencias de política y genera reportes de ingresos personalizados. Este es el dinero que entra; lanzar campañas pagadas es Publicidad, la dirección contraria.',
    'solutions.group.distribution.item.adRevenueTracking.replaces': 'Paneles de plataformas publicitarias y seguimiento manual',

    'solutions.group.distribution.item.advertising.title': 'Campañas publicitarias',
    'solutions.group.distribution.item.advertising.desc':
      'Arma una campaña pagada, fondéala con el saldo de tu espacio de trabajo y recupera lo que no se gastó cuando concilia.',
    'solutions.group.distribution.item.advertising.replaces': 'Una segunda relación de cobro para anunciarte',

    // — Grupo: plataforma para desarrolladores ————————————————————
    'solutions.group.payments.eyebrow': 'Plataforma para desarrolladores',
    'solutions.group.payments.title': 'La capa operativa para quienes construyen',
    'solutions.group.payments.desc':
      'Las mismas capacidades que usa el panel, expuestas como REST: un shell de marca blanca, webhooks, logs, agentes, notificaciones, referidos y soporte.',
    'solutions.group.payments.item.whitelabelDashboard.desc':
      'Arranca un panel totalmente personalizado con tu marca desde una sola llamada a la API. Marca, tema, diseño, idiomas y KPIs.',
    'solutions.group.payments.item.whitelabelDashboard.replaces': 'Un framework de panel hecho a medida',
    'solutions.group.payments.item.webhooks.title': 'Webhooks',
    'solutions.group.payments.item.webhooks.desc':
      'Suscríbete a eventos de ciclo de vida en tiempo real con payloads firmados con HMAC, registro de dominios permitidos y rotación de secretos.',
    'solutions.group.payments.item.webhooks.replaces': 'Infraestructura de polling de eventos hecha a medida',
    'solutions.group.payments.item.activityLogs.title': 'Registro de actividad',
    'solutions.group.payments.item.activityLogs.desc':
      'Registra cada llamada a la API con logs detallados. Filtra por endpoint, estado o fecha. Registra eventos del lado del cliente.',
    'solutions.group.payments.item.activityLogs.replaces': 'Un servicio de logs y monitoreo separado',
    'solutions.group.payments.item.aiAgents.title': 'Agentes de IA',
    'solutions.group.payments.item.aiAgents.desc':
      'Crea agentes autónomos a partir de plantillas o un asistente guiado. Programa ejecuciones y gestiona aprobaciones humanas.',
    'solutions.group.payments.item.aiAgents.replaces': 'Scripts de automatización hechos a medida',
    'solutions.group.payments.item.inAppNotifications.title': 'Notificaciones en la app',
    'solutions.group.payments.item.inAppNotifications.desc':
      'Envía notificaciones a un solo usuario o a todos a la vez. Lista el feed, marca como leídas y consulta el conteo de no leídas.',
    'solutions.group.payments.item.inAppNotifications.replaces': 'Un servicio de notificaciones separado',
    'solutions.group.payments.item.referrals.title': 'Referidos',
    'solutions.group.payments.item.referrals.desc':
      'Resuelve códigos de referido al nombre de usuario del referente y URLs de registro prellenadas — impulsa landing pages personalizadas.',
    'solutions.group.payments.item.referrals.replaces': 'Una plataforma de referidos independiente',
    'solutions.group.payments.item.supportCenter.title': 'Centro de soporte',
    'solutions.group.payments.item.supportCenter.desc':
      'Integra un centro de ayuda dentro de la app — tickets, respuestas en hilo y un catálogo público de preguntas frecuentes agrupado por categoría.',
    'solutions.group.payments.item.supportCenter.replaces': 'Una herramienta de mesa de ayuda independiente',

    'solutions.catalog.replacesLabel': 'Reemplaza',

    'solutions.comparison.eyebrow': 'Unificado vs fragmentado',
    'solutions.comparison.lead': 'Una sola cuenta en lugar de suscripciones separadas',

    'solutions.next.eyebrow': 'Siguiente paso',
    'solutions.next.title': '¿Listo para simplificar tu stack?',
    'solutions.next.actions.viewPricing': 'Ver precios',
  },
});
