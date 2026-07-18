import { defineMessages } from '@i18n/ui';

/**
 * The literal brand slogan re-cased as an on-page headline ("One Platform.
 * Every Solution.") is NOT a key here — it stays hardcoded English in
 * About.astro, exactly like Footer.astro hardcodes "One platform. Every
 * solution." (src/components/Footer.astro:70). A brand line that changes per
 * language is no longer a brand line.
 */
export default defineMessages({
  en: {
    'about.title': 'About 1Platform Labs — One Platform for Online Business',
    'about.description':
      'Learn about 1Platform Labs and our mission to make online stores, websites, payments, AI content, and a developer-grade API available from a single platform.',

    // — Hero ——————————————————————————————————————————————————
    'about.hero.headline': 'About 1Platform Labs',
    'about.hero.subheadline':
      'We build one platform for selling, growing and integrating online — instead of stitching separate services together and calling it a stack.',
    'about.hero.badge': 'Company',
    'about.hero.secondaryCta': 'View Solutions',

    // — Mission ————————————————————————————————————————————————
    'about.mission.eyebrow': 'Our mission',
    'about.mission.p1':
      '1Platform Labs was founded on a simple observation: businesses spend more time managing their tools than using them. Running a modern online business usually means juggling a storefront, a payment processor, an invoicing system, a website builder, a content platform and a separate developer API — each with its own login, billing, data format and learning curve.',
    'about.mission.p2':
      'We set out to build something different. A single platform that brings online stores, websites, AI content, whitelabel dashboards, payments, electronic invoicing and a developer-grade REST API into one connected system. From the first product you sell to the last invoice you issue, every capability works through the same API.',

    // — Fragmentation tax ————————————————————————————————————————
    'about.fragmentation.eyebrow': 'The fragmentation tax',
    'about.fragmentation.lead': 'What a fragmented stack actually costs you',
    'about.fragmentation.note':
      'Every disconnected tool in the stack takes time and attention. Data gets lost between services, workflows break at the integration points, and teams spend their days moving records by hand instead of doing the work.',
    'about.fragmentation.row1.without': 'A separate service to subscribe to, log into and renew',
    'about.fragmentation.row1.with': 'One platform, one token pair, one dashboard',
    'about.fragmentation.row2.without': 'Data exported and re-imported by hand between tools',
    'about.fragmentation.row2.with': 'Data moves between capabilities automatically',
    'about.fragmentation.row3.without': 'A different API, auth model and error format to learn per tool',
    'about.fragmentation.row3.with': 'One REST API with a single reference',
    'about.fragmentation.row4.without': 'Billing and cost tracking scattered across vendors',
    'about.fragmentation.row4.with': 'A single bill for everything you use',
    'about.fragmentation.row5.without': 'No single view of how the business is actually doing',
    'about.fragmentation.row5.with': 'End-to-end visibility in one place',

    // — Capability index ———————————————————————————————————————
    'about.capabilities.eyebrow': 'What we build',
    'about.capabilities.lead': 'Every capability, reachable through one API',
    'about.capabilities.docsLink': 'See how they are exposed in the API',
    'about.capabilities.group.content': 'Content & SEO',
    'about.capabilities.group.commerce': 'Commerce',
    'about.capabilities.group.site': 'Site & audience',
    'about.capabilities.group.developer': 'Developer platform',
    'about.capabilities.item.aiContent': 'AI Content',
    'about.capabilities.item.keywords': 'Keywords',
    'about.capabilities.item.images': 'Images',
    'about.capabilities.item.comments': 'Comments',
    'about.capabilities.item.legalPages': 'Legal Pages',
    'about.capabilities.item.cmsPublishing': 'CMS Publishing',
    'about.capabilities.item.indexing': 'Indexing',
    'about.capabilities.item.linkBuilding': 'Link Building',
    'about.capabilities.item.searchConsole': 'Search Console',
    'about.capabilities.item.payments': 'Payments',
    'about.capabilities.item.invoicing': 'Invoicing',
    'about.capabilities.item.websiteManagement': 'Website Management',
    'about.capabilities.item.profiles': 'Profiles',
    'about.capabilities.item.analytics': 'Analytics',
    'about.capabilities.item.adRevenue': 'Ad Revenue',
    'about.capabilities.item.aiAgents': 'AI Agents',
    'about.capabilities.item.activityLogs': 'Activity Logs',

    // — Team ——————————————————————————————————————————————————
    'about.team.eyebrow': 'Our team',
    'about.team.lead': 'Built by engineers, for engineers',
    'about.team.p1':
      '1Platform Labs is a team of engineers, designers and operators who got tired of the fragmentation problem. We build the platform we always wished existed: developer-first, API-native, and relentlessly focused on removing complexity rather than adding surface.',
    'about.team.p2':
      'We are committed to building tools that are accessible, affordable and powerful enough for any scale of operation.',
    'about.team.facts.basedIn.term': 'Based in',
    'about.team.facts.basedIn.value': 'Guatemala',
    'about.team.facts.serving.term': 'Serving',
    'about.team.facts.serving.value': 'Clients worldwide',
    'about.team.facts.languages.term': 'Languages',
    'about.team.facts.languages.value': 'Spanish · English',
  },
  es: {
    'about.title': 'Nosotros — 1Platform Labs, una sola plataforma para tu negocio online',
    'about.description':
      'Conoce 1Platform Labs y nuestra misión: reunir tiendas online, sitios web, pagos, contenido con IA y una API de nivel profesional en una sola plataforma.',

    // — Hero ——————————————————————————————————————————————————
    'about.hero.headline': 'Nosotros: 1Platform Labs',
    'about.hero.subheadline':
      'Construimos una sola plataforma para vender, crecer e integrar por internet — en lugar de coser servicios sueltos y llamarlo un stack.',
    'about.hero.badge': 'Empresa',
    'about.hero.secondaryCta': 'Ver soluciones',

    // — Misión —————————————————————————————————————————————————
    'about.mission.eyebrow': 'Nuestra misión',
    'about.mission.p1':
      '1Platform Labs nació de una observación simple: las empresas pasan más tiempo administrando sus herramientas que usándolas. Llevar un negocio online moderno suele implicar hacer malabares con una tienda, un procesador de pagos, un sistema de facturación, un creador de sitios web, una plataforma de contenido y una API de desarrollador aparte — cada una con su propio inicio de sesión, facturación, formato de datos y curva de aprendizaje.',
    'about.mission.p2':
      'Nos propusimos construir algo distinto. Una sola plataforma que reúne tiendas online, sitios web, contenido con IA, paneles de marca blanca, pagos, facturación electrónica y una API REST de nivel profesional en un solo sistema conectado. Desde el primer producto que vendes hasta la última factura que emites, cada función pasa por la misma API.',

    // — El costo de la fragmentación —————————————————————————————
    'about.fragmentation.eyebrow': 'El costo de la fragmentación',
    'about.fragmentation.lead': 'Lo que un stack fragmentado realmente te cuesta',
    'about.fragmentation.note':
      'Cada herramienta desconectada del stack consume tiempo y atención. Los datos se pierden entre servicios, los flujos de trabajo se rompen en los puntos de integración y los equipos pasan el día moviendo registros a mano en vez de hacer el trabajo.',
    'about.fragmentation.row1.without': 'Un servicio aparte para suscribirte, iniciar sesión y renovar',
    'about.fragmentation.row1.with': 'Una plataforma, un par de tokens, un panel',
    'about.fragmentation.row2.without': 'Datos exportados e importados a mano entre herramientas',
    'about.fragmentation.row2.with': 'Los datos se mueven entre funciones automáticamente',
    'about.fragmentation.row3.without': 'Una API, un modelo de autenticación y un formato de error distintos por herramienta',
    'about.fragmentation.row3.with': 'Una API REST con una sola referencia',
    'about.fragmentation.row4.without': 'Facturación y control de costos repartidos entre proveedores',
    'about.fragmentation.row4.with': 'Una sola factura por todo lo que usas',
    'about.fragmentation.row5.without': 'Ninguna vista única de cómo va realmente el negocio',
    'about.fragmentation.row5.with': 'Visibilidad de punta a punta en un solo lugar',

    // — Índice de capacidades ———————————————————————————————————
    'about.capabilities.eyebrow': 'Qué construimos',
    'about.capabilities.lead': 'Cada función, disponible a través de una sola API',
    'about.capabilities.docsLink': 'Mira cómo se exponen en la API',
    'about.capabilities.group.content': 'Contenido y SEO',
    'about.capabilities.group.commerce': 'Comercio',
    'about.capabilities.group.site': 'Sitio y audiencia',
    'about.capabilities.group.developer': 'Plataforma para desarrolladores',
    'about.capabilities.item.aiContent': 'Contenido con IA',
    'about.capabilities.item.keywords': 'Palabras clave',
    'about.capabilities.item.images': 'Imágenes',
    'about.capabilities.item.comments': 'Comentarios',
    'about.capabilities.item.legalPages': 'Páginas legales',
    'about.capabilities.item.cmsPublishing': 'Publicación en CMS',
    'about.capabilities.item.indexing': 'Indexación',
    'about.capabilities.item.linkBuilding': 'Construcción de enlaces',
    'about.capabilities.item.searchConsole': 'Search Console',
    'about.capabilities.item.payments': 'Pagos',
    'about.capabilities.item.invoicing': 'Facturación',
    'about.capabilities.item.websiteManagement': 'Gestión del sitio web',
    'about.capabilities.item.profiles': 'Perfiles',
    'about.capabilities.item.analytics': 'Analítica',
    'about.capabilities.item.adRevenue': 'Ingresos publicitarios',
    'about.capabilities.item.aiAgents': 'Agentes de IA',
    'about.capabilities.item.activityLogs': 'Registros de actividad',

    // — Equipo —————————————————————————————————————————————————
    'about.team.eyebrow': 'Nuestro equipo',
    'about.team.lead': 'Construido por ingenieros, para ingenieros',
    'about.team.p1':
      '1Platform Labs es un equipo de ingenieros, diseñadores y operadores cansados del problema de la fragmentación. Construimos la plataforma que siempre quisimos que existiera: centrada en el desarrollador, nativa de API y enfocada sin descanso en quitar complejidad en vez de sumar superficie.',
    'about.team.p2':
      'Estamos comprometidos a construir herramientas accesibles, asequibles y suficientemente potentes para cualquier escala de operación.',
    'about.team.facts.basedIn.term': 'Sede',
    'about.team.facts.basedIn.value': 'Guatemala',
    'about.team.facts.serving.term': 'Servimos a',
    'about.team.facts.serving.value': 'Clientes en todo el mundo',
    'about.team.facts.languages.term': 'Idiomas',
    'about.team.facts.languages.value': 'Español · Inglés',
  },
});
