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
    'home.hero.subheadline':
      'Launch your online store or website with payments, electronic invoicing, AI-generated content, and your own domain — all from one platform. Or integrate it into your product via one REST API.',
    'home.hero.badge': 'Stores · Websites · Payments · Invoicing',
    'home.hero.cta.primary': 'Launch Your Store',
    'home.hero.cta.secondary': 'For Developers — View API',
    'home.chip.sell': 'I want to sell online',
    'home.chip.website': 'I want a website',
    'home.chip.api': 'I integrate via API',

    // — What you get: the four pillars ———————————————————————————
    'home.section.whatYouGet.eyebrow': 'What you get',
    'home.section.whatYouGet.lead': 'Everything a business needs to sell online, already connected.',
    'home.pillars.sell.title': 'Sell online from day one',
    'home.pillars.sell.description':
      'Checkout, payments, electronic invoicing, and your own domain — ready to go without integrating separate providers.',
    'home.pillars.content.title': 'Content that ranks itself',
    'home.pillars.content.description':
      'Articles, images, comments, and legal pages generated and published by AI — optimized for search and conversion.',
    'home.pillars.dashboard.title': 'Your own brand, your own dashboard',
    'home.pillars.dashboard.description':
      'Whitelabel the entire experience under your brand — colors, layout, KPIs, and localization — from a single API call.',
    'home.pillars.api.title': 'Built on a developer-grade API',
    'home.pillars.api.description':
      'Everything above is available via REST. Dual-token auth, async jobs, predictable envelopes — power your own SaaS on top.',

    // — Capabilities: four featured + the index ———————————————————
    'home.section.capabilities.eyebrow': 'Capabilities',
    'home.section.capabilities.seeAll': 'See all solutions',
    'home.featured.store.title': 'Online Store',
    'home.featured.store.description':
      'Launch a store with checkout, catalog, and customer accounts — no plugins, no patchwork.',
    'home.featured.payments.title': 'Payment Processing',
    'home.featured.payments.description':
      'Accept card payments via API. Checkout URLs, webhook notifications, and automatic balance crediting.',
    'home.featured.invoicing.title': 'Electronic Invoicing',
    'home.featured.invoicing.description':
      'Generate compliant electronic invoices automatically from every transaction — PDF + XML out of the box.',
    'home.featured.content.title': 'AI Content Generation',
    'home.featured.content.description':
      'Generate full SEO-optimized articles, descriptions, and landing copy from a single keyword.',

    'home.group.contentSeo.title': 'Content & SEO',
    'home.group.contentSeo.item.aiImage': 'AI Image Generation',
    'home.group.contentSeo.item.aiKeyword': 'AI Keyword Extraction',
    'home.group.contentSeo.item.cms': 'CMS Publishing',
    'home.group.contentSeo.item.indexing': 'Indexing Automation',
    'home.group.contentSeo.item.linkBuilding': 'Link Building',
    'home.group.contentSeo.item.searchConsole': 'Search Console',
    'home.group.contentSeo.item.legalPages': 'Legal Page Generation',

    'home.group.storefront.title': 'Storefront & brand',
    'home.group.storefront.item.domain': 'Custom Domain',
    'home.group.storefront.item.whitelabel': 'Whitelabel Dashboard',

    'home.group.developer.title': 'Developer platform',
    'home.group.developer.item.webhooks': 'Webhooks',
    'home.group.developer.item.agents': 'AI Agents',
    'home.group.developer.item.logs': 'Activity Logs',

    // — How it works —————————————————————————————————————————————
    'home.section.howItWorks.eyebrow': 'How it works',
    'home.section.howItWorks.lead': 'From account to live store, in one platform.',

    // — Integrate: copy + code sample ————————————————————————————
    'home.section.integrate.eyebrow': 'Integrate',
    'home.section.integrate.title': 'A REST API with no surprises',
    'home.section.integrate.body':
      'Predictable endpoints, one token pair, consistent response envelopes. Everything the dashboard does, your product can do too.',
    'home.section.integrate.cta': 'Read the API docs',
    'home.section.integrate.code.title': 'Create a payment transaction',
    // Code sample: kept identical in both locales, same as the endpoint/API-key
    // convention in the glossary — a curl command is not prose.
    'home.section.integrate.code.snippet': `curl -X POST https://api.1platform.pro/api/v1/users/transactions \\
  -H "Authorization: Bearer $APP_TOKEN" \\
  -H "x-user-token: $USER_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 25.00,
    "description": "Order #1042"
  }'`,

    // — Who it's for ——————————————————————————————————————————————
    'home.section.whoFor.eyebrow': "Who it's for",
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

    // — Unified vs fragmented —————————————————————————————————————
    'home.section.comparison.eyebrow': 'Unified vs fragmented',
    'home.section.comparison.lead': "What changes when it's one platform",
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
    'home.hero.subheadline':
      'Lanza tu tienda online o tu sitio web con pagos, facturación electrónica, contenido generado con IA y tu propio dominio — todo desde una sola plataforma. O intégralo en tu producto con una sola API REST.',
    'home.hero.badge': 'Tiendas · Sitios web · Pagos · Facturación',
    'home.hero.cta.primary': 'Lanza tu tienda',
    'home.hero.cta.secondary': 'Para desarrolladores — Ver la API',
    'home.chip.sell': 'Quiero vender online',
    'home.chip.website': 'Quiero un sitio web',
    'home.chip.api': 'Integro vía API',

    // — Lo que obtienes: los cuatro pilares —————————————————————
    'home.section.whatYouGet.eyebrow': 'Lo que obtienes',
    'home.section.whatYouGet.lead': 'Todo lo que un negocio necesita para vender online, ya conectado.',
    'home.pillars.sell.title': 'Vende por internet desde el día uno',
    'home.pillars.sell.description':
      'Checkout, pagos, facturación electrónica y tu propio dominio — listos para usar sin integrar proveedores por separado.',
    'home.pillars.content.title': 'Contenido que se posiciona solo',
    'home.pillars.content.description':
      'Artículos, imágenes, comentarios y páginas legales generados y publicados con IA — optimizados para buscadores y conversión.',
    'home.pillars.dashboard.title': 'Tu marca, tu panel',
    'home.pillars.dashboard.description':
      'Personaliza toda la experiencia con tu marca — colores, diseño, KPIs e idioma — con una sola llamada a la API.',
    'home.pillars.api.title': 'Sobre una API para desarrolladores',
    'home.pillars.api.description':
      'Todo lo anterior está disponible vía REST: autenticación de dos tokens, tareas asíncronas y respuestas predecibles — construye tu propio SaaS encima.',

    // — Capacidades: cuatro destacadas + el índice ——————————————
    'home.section.capabilities.eyebrow': 'Capacidades',
    'home.section.capabilities.seeAll': 'Ver todas las soluciones',
    'home.featured.store.title': 'Tienda online',
    'home.featured.store.description':
      'Lanza una tienda con checkout, catálogo y cuentas de cliente — sin plugins ni parches.',
    'home.featured.payments.title': 'Procesamiento de pagos',
    'home.featured.payments.description':
      'Acepta pagos con tarjeta vía API. URLs de checkout, notificaciones webhook y acreditación automática de saldo.',
    'home.featured.invoicing.title': 'Facturación electrónica',
    'home.featured.invoicing.description':
      'Genera facturas electrónicas conformes de forma automática en cada transacción — PDF y XML listos para usar.',
    'home.featured.content.title': 'Generación de contenido con IA',
    'home.featured.content.description':
      'Genera artículos completos optimizados para SEO, descripciones y textos de landing a partir de una sola palabra clave.',

    'home.group.contentSeo.title': 'Contenido y SEO',
    'home.group.contentSeo.item.aiImage': 'Generación de imágenes con IA',
    'home.group.contentSeo.item.aiKeyword': 'Extracción de palabras clave con IA',
    'home.group.contentSeo.item.cms': 'Publicación en CMS',
    'home.group.contentSeo.item.indexing': 'Automatización de indexación',
    'home.group.contentSeo.item.linkBuilding': 'Construcción de enlaces',
    'home.group.contentSeo.item.searchConsole': 'Search Console',
    'home.group.contentSeo.item.legalPages': 'Generación de páginas legales',

    'home.group.storefront.title': 'Tienda y marca',
    'home.group.storefront.item.domain': 'Dominio propio',
    'home.group.storefront.item.whitelabel': 'Panel de marca blanca',

    'home.group.developer.title': 'Plataforma para desarrolladores',
    'home.group.developer.item.webhooks': 'Webhooks',
    'home.group.developer.item.agents': 'Agentes de IA',
    'home.group.developer.item.logs': 'Registro de actividad',

    // — Cómo funciona ————————————————————————————————————————————
    'home.section.howItWorks.eyebrow': 'Cómo funciona',
    'home.section.howItWorks.lead': 'De la cuenta a la tienda en vivo, en una sola plataforma.',

    // — Integración: copy + ejemplo de código ————————————————————
    'home.section.integrate.eyebrow': 'Integración',
    'home.section.integrate.title': 'Una API REST sin sorpresas',
    'home.section.integrate.body':
      'Endpoints predecibles, un solo par de tokens y respuestas con un formato constante. Todo lo que hace el panel, tu producto también puede hacerlo.',
    'home.section.integrate.cta': 'Lee la documentación de la API',
    'home.section.integrate.code.title': 'Crea una transacción de pago',
    'home.section.integrate.code.snippet': `curl -X POST https://api.1platform.pro/api/v1/users/transactions \\
  -H "Authorization: Bearer $APP_TOKEN" \\
  -H "x-user-token: $USER_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 25.00,
    "description": "Order #1042"
  }'`,

    // — A quién va dirigido ——————————————————————————————————————
    'home.section.whoFor.eyebrow': 'Para quién es',
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

    // — Unificado vs fragmentado ————————————————————————————————
    'home.section.comparison.eyebrow': 'Unificado vs. fragmentado',
    'home.section.comparison.lead': 'Qué cambia cuando es una sola plataforma',
  },
});
