import { defineMessages } from '@i18n/ui';

/**
 * 1Platform vs. building your own integration.
 *
 * `surface[].items[].path` (the literal API route strings shown in <code>)
 * are technical identifiers, not prose — they stay untranslated in both
 * trees, same as the code samples in the other two compare pages.
 */
export default defineMessages({
  en: {
    'compareCustomIntegration.title': '1Platform vs. Building Your Own Integration | 1Platform',
    'compareCustomIntegration.description':
      'Compare 1Platform with wiring up your own integration. One API, one auth model, one bill — instead of a separate service, SDK, and invoice for every capability.',

    'compareCustomIntegration.hero.badge': 'Compare',
    'compareCustomIntegration.hero.headline': '1Platform vs. building your own',
    'compareCustomIntegration.hero.subheadline':
      'You can integrate a separate service for the store, the payments, the invoicing, the content and the publishing — and then maintain all of them. Or you can integrate once.',
    'compareCustomIntegration.hero.secondaryCta': 'See Pricing',

    'compareCustomIntegration.breadcrumb.compare': 'Compare',
    'compareCustomIntegration.breadcrumb.current': '1Platform vs. Building Your Own',

    'compareCustomIntegration.compare.eyebrow': 'Two ways to get there',
    'compareCustomIntegration.compare.lead': 'The same capabilities. A different amount of your work.',

    'compareCustomIntegration.row1.without':
      'A separate service to choose, integrate and monitor for each capability',
    'compareCustomIntegration.row1.with': 'One API surface covering every capability',
    'compareCustomIntegration.row2.without': 'A different auth scheme and token model per vendor',
    'compareCustomIntegration.row2.with': 'One two-token model across every endpoint',
    'compareCustomIntegration.row3.without': 'A separate account, plan and renewal per vendor',
    'compareCustomIntegration.row3.with': 'One account, one bill',
    'compareCustomIntegration.row4.without':
      'A different error format and documentation set to learn per vendor',
    'compareCustomIntegration.row4.with': 'One response envelope, one reference',
    'compareCustomIntegration.row5.without': 'Every upstream API change becomes your migration',
    'compareCustomIntegration.row5.with': 'The contract you code against stays stable',
    'compareCustomIntegration.row6.without': 'Integration work stands between you and your first feature',
    'compareCustomIntegration.row6.with': 'The first call ships the capability',

    'compareCustomIntegration.costs.eyebrow': 'The real cost of building it yourself',
    'compareCustomIntegration.costs.item1.title': 'Development time',
    'compareCustomIntegration.costs.item1.description':
      'Wiring up a store, payments, invoicing, content and a developer API yourself means learning a different vendor for each one — every documentation set, every authentication method, every error model — before any of it serves a customer.',
    'compareCustomIntegration.costs.item2.title': 'Ongoing maintenance',
    'compareCustomIntegration.costs.item2.description':
      'APIs change. Endpoints are deprecated, rate limits move, response formats are revised. With your own integrations, every upstream change becomes your problem. With 1Platform, the API contract stays stable while those changes are absorbed behind it.',
    'compareCustomIntegration.costs.item3.title': 'Opportunity cost',
    'compareCustomIntegration.costs.item3.description':
      'Every hour spent wiring services together is an hour not spent on your core product. 1Platform lets your team work on what differentiates the business while the platform holds the infrastructure layer.',

    'compareCustomIntegration.integrate.eyebrow': 'One surface',
    'compareCustomIntegration.integrate.heading': 'Same base URL, same auth, same envelope',
    'compareCustomIntegration.integrate.body':
      'Every capability sits behind one integration. Swapping from generating content to issuing an invoice is a different path — not a different vendor, SDK, token or bill.',
    'compareCustomIntegration.integrate.linkCue': 'Read the API docs',
    'compareCustomIntegration.integrate.codeTitle': 'Generate an article',

    'compareCustomIntegration.surface.noteBefore': 'The same token pair reaches every path below, all on',
    'compareCustomIntegration.surface.group1.name': 'Content & SEO',
    'compareCustomIntegration.surface.group1.item1': 'Keyword extraction',
    'compareCustomIntegration.surface.group1.item2': 'Article generation + CMS publish',
    'compareCustomIntegration.surface.group1.item3': 'AI image generation',
    'compareCustomIntegration.surface.group1.item4': 'Submit URLs for indexing',
    'compareCustomIntegration.surface.group1.item5': 'Link building + Search Console',
    'compareCustomIntegration.surface.group2.name': 'Money',
    'compareCustomIntegration.surface.group2.item1': 'Online payment processing',
    'compareCustomIntegration.surface.group2.item2': 'Electronic invoicing',

    'compareCustomIntegration.faq.eyebrow': 'Questions',
    'compareCustomIntegration.faq.item1.question':
      'What does 1Platform save me compared with building the integration myself?',
    'compareCustomIntegration.faq.item1.answer':
      'The integration layer itself. Building across the services 1Platform replaces — store, payments, invoicing, AI content, website, and developer APIs — means a separate integration, auth model, error model and bill for each one, plus the maintenance that follows. With 1Platform you integrate once and every service is already reachable through the same contract.',
    'compareCustomIntegration.faq.item2.question': 'What happens if one of the underlying services changes?',
    'compareCustomIntegration.faq.item2.answer':
      '1Platform handles all upstream service changes internally. Your integration stays stable because you only interact with the 1Platform API. When an upstream API is updated, the 1Platform team adapts the integration so you never have to.',
    'compareCustomIntegration.faq.item3.question': 'Can I start with one service and add more later?',
    'compareCustomIntegration.faq.item3.answer':
      'Yes. 1Platform is modular by design. Start with content generation today, add keyword research next, enable publishing when you are ready. Same API key, same auth, same billing. No new integrations required.',

    'compareCustomIntegration.more.eyebrow': 'More comparisons',
    'compareCustomIntegration.more.card1.title': '1Platform vs. AI writing tools',
    'compareCustomIntegration.more.card1.description':
      'Where a writing tool stops, and what the rest of the content pipeline has to cover.',
    'compareCustomIntegration.more.card2.title': '1Platform vs. WordPress content plugins',
    'compareCustomIntegration.more.card2.description':
      'Where an automated content plugin ends and a framework-agnostic platform begins.',
  },
  es: {
    'compareCustomIntegration.title': '1Platform vs. construir tu propia integración | 1Platform',
    'compareCustomIntegration.description':
      'Compara 1Platform con construir tu propia integración. Una API, un modelo de autenticación, una factura — en lugar de un servicio, un SDK y una factura distintos para cada función.',

    'compareCustomIntegration.hero.badge': 'Comparativa',
    'compareCustomIntegration.hero.headline': '1Platform vs. construir por tu cuenta',
    'compareCustomIntegration.hero.subheadline':
      'Puedes integrar un servicio distinto para la tienda, los pagos, la facturación, el contenido y la publicación — y luego mantenerlos todos. O puedes integrar una sola vez.',
    'compareCustomIntegration.hero.secondaryCta': 'Ver precios',

    'compareCustomIntegration.breadcrumb.compare': 'Comparativa',
    'compareCustomIntegration.breadcrumb.current': '1Platform vs. construir por tu cuenta',

    'compareCustomIntegration.compare.eyebrow': 'Dos caminos para llegar',
    'compareCustomIntegration.compare.lead': 'Las mismas funciones. Una cantidad de trabajo distinta para ti.',

    'compareCustomIntegration.row1.without':
      'Un servicio distinto que elegir, integrar y monitorizar por cada función',
    'compareCustomIntegration.row1.with': 'Una sola superficie de API que cubre todas las funciones',
    'compareCustomIntegration.row2.without':
      'Un esquema de autenticación y un modelo de tokens distintos por proveedor',
    'compareCustomIntegration.row2.with': 'Un mismo modelo de dos tokens en todos los endpoints',
    'compareCustomIntegration.row3.without': 'Una cuenta, un plan y una renovación distintos por proveedor',
    'compareCustomIntegration.row3.with': 'Una cuenta, una factura',
    'compareCustomIntegration.row4.without':
      'Un formato de error y una documentación distintos que aprender por proveedor',
    'compareCustomIntegration.row4.with': 'Un mismo formato de respuesta, una sola referencia',
    'compareCustomIntegration.row5.without': 'Cada cambio en una API externa se convierte en tu migración',
    'compareCustomIntegration.row5.with': 'El contrato contra el que programas se mantiene estable',
    'compareCustomIntegration.row6.without':
      'El trabajo de integración se interpone entre tú y tu primera función',
    'compareCustomIntegration.row6.with': 'La primera llamada ya entrega la función',

    'compareCustomIntegration.costs.eyebrow': 'El costo real de construirlo tú mismo',
    'compareCustomIntegration.costs.item1.title': 'Tiempo de desarrollo',
    'compareCustomIntegration.costs.item1.description':
      'Conectar tú mismo una tienda, los pagos, la facturación, el contenido y una API para desarrolladores implica aprender un proveedor distinto para cada uno — cada documentación, cada método de autenticación, cada modelo de error — antes de que nada de eso llegue a servir a un cliente.',
    'compareCustomIntegration.costs.item2.title': 'Mantenimiento continuo',
    'compareCustomIntegration.costs.item2.description':
      'Las APIs cambian. Los endpoints se deprecian, los límites de uso se mueven, los formatos de respuesta se revisan. Con tus propias integraciones, cada cambio externo se convierte en tu problema. Con 1Platform, el contrato de la API se mantiene estable mientras esos cambios se absorben por detrás.',
    'compareCustomIntegration.costs.item3.title': 'Costo de oportunidad',
    'compareCustomIntegration.costs.item3.description':
      'Cada hora dedicada a conectar servicios entre sí es una hora que no se dedica a tu producto principal. 1Platform le permite a tu equipo trabajar en lo que diferencia al negocio, mientras la plataforma sostiene la capa de infraestructura.',

    'compareCustomIntegration.integrate.eyebrow': 'Una sola superficie',
    'compareCustomIntegration.integrate.heading': 'La misma URL base, la misma autenticación, el mismo formato',
    'compareCustomIntegration.integrate.body':
      'Cada función está detrás de una sola integración. Pasar de generar contenido a emitir una factura es una ruta distinta — no un proveedor, SDK, token o factura distintos.',
    'compareCustomIntegration.integrate.linkCue': 'Lee la documentación de la API',
    'compareCustomIntegration.integrate.codeTitle': 'Genera un artículo',

    'compareCustomIntegration.surface.noteBefore':
      'El mismo par de tokens llega a cada una de las rutas de abajo, todas en',
    'compareCustomIntegration.surface.group1.name': 'Contenido y SEO',
    'compareCustomIntegration.surface.group1.item1': 'Extracción de palabras clave',
    'compareCustomIntegration.surface.group1.item2': 'Generación de artículos + publicación en el CMS',
    'compareCustomIntegration.surface.group1.item3': 'Generación de imágenes con IA',
    'compareCustomIntegration.surface.group1.item4': 'Envío de URLs a indexar',
    'compareCustomIntegration.surface.group1.item5': 'Link building + Search Console',
    'compareCustomIntegration.surface.group2.name': 'Dinero',
    'compareCustomIntegration.surface.group2.item1': 'Procesamiento de pagos online',
    'compareCustomIntegration.surface.group2.item2': 'Facturación electrónica',

    'compareCustomIntegration.faq.eyebrow': 'Preguntas',
    'compareCustomIntegration.faq.item1.question':
      '¿Qué me ahorro con 1Platform comparado con construir la integración yo mismo?',
    'compareCustomIntegration.faq.item1.answer':
      'La propia capa de integración. Construir sobre los servicios que reemplaza 1Platform — tienda, pagos, facturación, contenido con IA, sitio web y APIs para desarrolladores — implica una integración, un modelo de autenticación, un modelo de error y una factura distintos para cada uno, más el mantenimiento que sigue. Con 1Platform, integras una vez y cada servicio ya es accesible a través del mismo contrato.',
    'compareCustomIntegration.faq.item2.question': '¿Qué pasa si cambia alguno de los servicios subyacentes?',
    'compareCustomIntegration.faq.item2.answer':
      '1Platform gestiona internamente todos los cambios en los servicios subyacentes. Tu integración se mantiene estable porque solo interactúas con la API de 1Platform. Cuando una API externa se actualiza, el equipo de 1Platform adapta la integración para que tú no tengas que hacerlo.',
    'compareCustomIntegration.faq.item3.question': '¿Puedo empezar con un servicio e ir sumando más después?',
    'compareCustomIntegration.faq.item3.answer':
      'Sí. 1Platform es modular por diseño. Empieza hoy con la generación de contenido, suma después la investigación de palabras clave, activa la publicación cuando estés listo. La misma clave de API, la misma autenticación, la misma facturación. Sin nuevas integraciones que hacer.',

    'compareCustomIntegration.more.eyebrow': 'Más comparativas',
    'compareCustomIntegration.more.card1.title': '1Platform vs. herramientas de escritura con IA',
    'compareCustomIntegration.more.card1.description':
      'Dónde se detiene una herramienta de escritura, y lo que el resto del pipeline de contenido tiene que cubrir.',
    'compareCustomIntegration.more.card2.title': '1Platform vs. plugins de contenido para WordPress',
    'compareCustomIntegration.more.card2.description':
      'Dónde termina un plugin de contenido automatizado y empieza una plataforma independiente del framework.',
  },
});
