import { defineMessages } from '@i18n/ui';

/**
 * Features page copy: four sections (ecommerce, content, distribution,
 * developer), each a set of capability cards plus one example `curl` request.
 * The `curl` bodies themselves (endpoint paths, JSON field names and sample
 * values) are left identical in both languages — they are literal API
 * examples, not prose, and the "lang": "en" parameter in the content-generation
 * sample only makes sense paired with the English sample keyword it demonstrates.
 */
export default defineMessages({
  en: {
    'features.title': 'Features — Store, Payments, Content & Developer Platform | 1Platform',
    'features.description':
      'Every feature 1Platform offers: online store, payments, electronic invoicing, AI content, distribution, and a developer-grade API — all unified.',

    // — Hero ——————————————————————————————————————————————————
    'features.hero.headline': 'Every capability, and the call that runs it',
    'features.hero.subheadline':
      'Store, payments, electronic invoicing, content, distribution, and the developer platform — each one documented, already connected to the others, and reachable from the same API.',
    'features.hero.secondaryCta': 'For Developers — View API',
    'features.hero.badge': 'Store · Payments · Content · API',

    // — On-this-page index / section eyebrows ————————————————————
    'features.section.ecommerce': 'Ecommerce essentials',
    'features.section.content': 'Content engine',
    'features.section.distribution': 'Distribution & growth',
    'features.section.developer': 'Developer platform',

    'features.demo.exampleRequest': 'Example request',

    // — Ecommerce essentials ——————————————————————————————————
    'features.ecommerce.lead': 'The monetization core',
    'features.ecommerce.note':
      'Storefront, card payments, compliant electronic invoicing, and your own domain — the part of the stack that has to work the day you open.',
    'features.commerce.payment.title': 'Payment Processing',
    'features.commerce.payment.description':
      'Accept card payments via API. Hosted checkout URLs, real-time webhooks, automatic balance crediting.',
    'features.commerce.invoicing.title': 'Electronic Invoicing',
    'features.commerce.invoicing.description':
      'Generate compliant electronic invoices automatically from every transaction. PDF + XML output.',
    'features.commerce.domain.title': 'Domain Management',
    'features.commerce.domain.description':
      'Register, transfer, renew. Manage DNS records and nameservers — all programmatically.',
    'features.commerce.store.description':
      'Catalog, cart, and checkout — ready to publish on your own domain. No plugins, no patchwork.',
    'features.demo.payments.title': 'Create a payment transaction',

    // — Content engine —————————————————————————————————————————
    'features.content.lead': 'Content that fuels the store',
    'features.content.note':
      'Articles, images, comments, author profiles, and legal pages — generated on demand, in the languages you sell in, and published without leaving the platform.',
    'features.content.item1.title': 'AI Content Generation',
    'features.content.item1.description':
      'Generate long-form SEO-optimized articles from a single keyword. Async pipeline, multi-language.',
    'features.content.item2.title': 'AI Image Generation',
    'features.content.item2.description':
      'Unique AI visuals or stock library access — commercial license included, web-optimized formats.',
    'features.content.item3.title': 'AI Comments',
    'features.content.item3.description':
      'Generate contextual comments for blog posts and articles. Natural language that matches your voice.',
    'features.content.item4.title': 'Author Profiles',
    'features.content.item4.description':
      'Create and manage author profiles with bios, avatars, and metadata for multi-author publishing.',
    'features.content.item5.title': 'Legal Pages',
    'features.content.item5.description':
      'Generate privacy policies, terms of service, and cookie notices tailored to your business.',
    'features.demo.content.title': 'Generate an SEO article',

    // — Distribution & growth ————————————————————————————————
    'features.distribution.lead': 'From published to discovered',
    'features.distribution.note':
      'Content only earns traffic once it has been researched, published, crawled, and linked. These four run in that order, and each one is an endpoint you can call.',
    'features.distribution.item1.title': 'Keyword Intelligence',
    'features.distribution.item1.description':
      'Extract keywords with volume, intent, and difficulty from any URL or topic.',
    'features.distribution.item2.title': 'CMS Publishing',
    'features.distribution.item2.description':
      'Publish directly to WordPress and other CMS platforms. Schedule, categorize, manage media via API.',
    'features.distribution.item3.title': 'Indexing Automation',
    'features.distribution.item3.description':
      'Submit URLs to search engines for faster crawling. Batch processing and status tracking.',
    'features.distribution.item4.title': 'Link Building',
    'features.distribution.item4.description':
      'Integrated marketplace for guest posts and backlinks — build authority programmatically.',
    'features.demo.indexing.title': 'Submit a URL for indexing',

    // — Developer platform ————————————————————————————————————
    'features.developer.lead': 'The operational layer',
    'features.developer.note':
      'Everything the dashboard does is something your product can do too — call it, observe it, and ship it under your own brand.',
    'features.developer.item1.title': 'REST API',
    'features.developer.item1.description':
      'Dual-token auth, async jobs, predictable JSON envelopes. Interactive docs at developer.1platform.pro.',
    'features.developer.item2.title': 'Webhooks',
    'features.developer.item2.description':
      'HMAC-signed lifecycle events, allowed-domain registration, and one-call secret rotation.',
    'features.developer.item3.description':
      'Bootstrap a fully branded dashboard in one API call — branding, theme, layout, i18n, KPIs.',
    'features.developer.item4.title': 'Activity Logs',
    'features.developer.item4.description':
      'Every API call logged with method, endpoint, status, latency. Register client-side events.',
    'features.developer.item5.title': 'AI Agents',
    'features.developer.item5.description':
      'Autonomous agents from templates or via wizard. Scheduled runs, human-in-the-loop approvals.',
    'features.developer.item6.title': 'Analytics',
    'features.developer.item6.description':
      'Connect analytics, provision properties, retrieve traffic metrics — all through one API.',
    'features.demo.whitelabel.title': 'Bootstrap a branded dashboard',
    'features.developer.moreLink': 'See the developer platform',
  },
  es: {
    'features.title': 'Funciones — tienda, pagos, contenido y plataforma para desarrolladores | 1Platform',
    'features.description':
      'Todas las funciones que ofrece 1Platform: tienda online, pagos, facturación electrónica, contenido con IA, distribución y una API de nivel profesional — todo unificado.',

    // — Hero ——————————————————————————————————————————————————
    'features.hero.headline': 'Cada capacidad, y la llamada que la ejecuta',
    'features.hero.subheadline':
      'Tienda, pagos, facturación electrónica, contenido, distribución y la plataforma para desarrolladores — cada una documentada, ya conectada con las demás, y accesible desde la misma API.',
    'features.hero.secondaryCta': 'Para desarrolladores — ver la API',
    'features.hero.badge': 'Tienda · Pagos · Contenido · API',

    // — Índice en la página / secciones ————————————————————————
    'features.section.ecommerce': 'Lo esencial de ecommerce',
    'features.section.content': 'Motor de contenido',
    'features.section.distribution': 'Distribución y crecimiento',
    'features.section.developer': 'Plataforma para desarrolladores',

    'features.demo.exampleRequest': 'Solicitud de ejemplo',

    // — Lo esencial de ecommerce ——————————————————————————————
    'features.ecommerce.lead': 'El núcleo de monetización',
    'features.ecommerce.note':
      'Tienda, pagos con tarjeta, facturación electrónica conforme a la ley y tu propio dominio — la parte del stack que tiene que funcionar el día que abres.',
    'features.commerce.payment.title': 'Procesamiento de pagos',
    'features.commerce.payment.description':
      'Acepta pagos con tarjeta vía API. URLs de checkout alojado, webhooks en tiempo real y acreditación automática de saldo.',
    'features.commerce.invoicing.title': 'Facturación electrónica',
    'features.commerce.invoicing.description':
      'Genera facturas electrónicas conformes a la ley automáticamente por cada transacción. Salida en PDF y XML.',
    'features.commerce.domain.title': 'Gestión de dominios',
    'features.commerce.domain.description':
      'Registra, transfiere, renueva. Administra registros DNS y servidores de nombres — todo mediante API.',
    'features.commerce.store.description':
      'Catálogo, carrito y checkout, listos para publicar en tu propio dominio. Sin plugins ni parches.',
    'features.demo.payments.title': 'Crear una transacción de pago',

    // — Motor de contenido —————————————————————————————————————
    'features.content.lead': 'Contenido que impulsa la tienda',
    'features.content.note':
      'Artículos, imágenes, comentarios, perfiles de autor y páginas legales — generados bajo demanda, en los idiomas en los que vendes, y publicados sin salir de la plataforma.',
    'features.content.item1.title': 'Generación de contenido con IA',
    'features.content.item1.description':
      'Genera artículos extensos y optimizados para SEO a partir de una sola palabra clave. Proceso asíncrono, multilingüe.',
    'features.content.item2.title': 'Generación de imágenes con IA',
    'features.content.item2.description':
      'Imágenes únicas generadas con IA o acceso a un banco de imágenes de stock — licencia comercial incluida, formatos optimizados para web.',
    'features.content.item3.title': 'Comentarios con IA',
    'features.content.item3.description':
      'Genera comentarios contextuales para publicaciones de blog y artículos. Lenguaje natural que se ajusta a tu voz.',
    'features.content.item4.title': 'Perfiles de autor',
    'features.content.item4.description':
      'Crea y administra perfiles de autor con biografías, avatares y metadatos para publicaciones con varios autores.',
    'features.content.item5.title': 'Páginas legales',
    'features.content.item5.description':
      'Genera políticas de privacidad, términos del servicio y avisos de cookies adaptados a tu negocio.',
    'features.demo.content.title': 'Generar un artículo SEO',

    // — Distribución y crecimiento ——————————————————————————————
    'features.distribution.lead': 'De publicado a descubierto',
    'features.distribution.note':
      'El contenido solo genera tráfico una vez que se investigó, se publicó, se rastreó y se enlazó. Estas cuatro funciones corren en ese orden, y cada una es un endpoint que puedes llamar.',
    'features.distribution.item1.title': 'Inteligencia de palabras clave',
    'features.distribution.item1.description':
      'Extrae palabras clave con volumen, intención y dificultad a partir de cualquier URL o tema.',
    'features.distribution.item2.title': 'Publicación en CMS',
    'features.distribution.item2.description':
      'Publica directamente en WordPress y otras plataformas CMS. Programa, categoriza y administra medios vía API.',
    'features.distribution.item3.title': 'Automatización de indexación',
    'features.distribution.item3.description':
      'Envía URLs a los buscadores para un rastreo más rápido. Procesamiento por lotes y seguimiento de estado.',
    'features.distribution.item4.title': 'Link Building',
    'features.distribution.item4.description':
      'Marketplace integrado para guest posts y backlinks — construye autoridad de forma programática.',
    'features.demo.indexing.title': 'Enviar una URL para indexación',

    // — Plataforma para desarrolladores ——————————————————————————
    'features.developer.lead': 'La capa operativa',
    'features.developer.note':
      'Todo lo que hace el panel, tu producto también puede hacerlo — llámalo, obsérvalo y lánzalo bajo tu propia marca.',
    'features.developer.item1.title': 'API REST',
    'features.developer.item1.description':
      'Autenticación de doble token, trabajos asíncronos, sobres JSON predecibles. Documentación interactiva en developer.1platform.pro.',
    'features.developer.item2.title': 'Webhooks',
    'features.developer.item2.description':
      'Eventos de ciclo de vida firmados con HMAC, registro de dominios permitidos y rotación de secretos en una sola llamada.',
    'features.developer.item3.description':
      'Inicializa un panel completamente personalizado con una sola llamada a la API — marca, tema, diseño, i18n, KPI.',
    'features.developer.item4.title': 'Registros de actividad',
    'features.developer.item4.description':
      'Cada llamada a la API queda registrada con método, endpoint, estado y latencia. Registra eventos del lado del cliente.',
    'features.developer.item5.title': 'Agentes de IA',
    'features.developer.item5.description':
      'Agentes autónomos a partir de plantillas o mediante asistente. Ejecuciones programadas, aprobaciones con supervisión humana.',
    'features.developer.item6.title': 'Analítica',
    'features.developer.item6.description':
      'Conecta analítica, aprovisiona propiedades, obtén métricas de tráfico — todo a través de una sola API.',
    'features.demo.whitelabel.title': 'Inicializar un panel de marca',
    'features.developer.moreLink': 'Mira la plataforma para desarrolladores',
  },
});
