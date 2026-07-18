import { defineMessages } from '@i18n/ui';

/**
 * The `contract` dl values (base URL, header names, envelope shape) and the
 * three CodeBlock `code` samples are the literal API surface — a real
 * endpoint, a real header name, a real JSON envelope. Translating them would
 * change what a reader could paste into a terminal, so they are NOT here:
 * they stay identical Astro-side constants in both trees, same as the
 * pilot's rule against touching provider names. Only their labels (`term`,
 * `title`) are copy, and only copy gets a key.
 */
export default defineMessages({
  en: {
    'for-developers.title': 'Ecommerce REST API for SaaS — Payments, Content, Whitelabel | 1Platform',
    'for-developers.description':
      'Power your SaaS on 1Platform. REST API with dual-token auth, async jobs, predictable JSON envelopes — payments, content, and whitelabel dashboard included.',

    'for-developers.hero.headline': 'Build on a developer-grade API',
    'for-developers.hero.subheadline':
      'Power your own SaaS on top of 1Platform. One REST API, two tokens, async jobs, predictable JSON envelopes — payments, content and whitelabel dashboard included.',
    'for-developers.hero.badge': 'REST API · Async Jobs · Webhooks',
    'for-developers.hero.secondaryCta': 'Power Your SaaS',

    'for-developers.principles.eyebrow': 'API design',
    'for-developers.principles.lead': 'A platform you can build a product on, without fighting the abstractions',
    'for-developers.principles.tokens.title': 'One REST API, two tokens',
    'for-developers.principles.tokens.description':
      'Dual-token auth: the app token identifies your product, the user token identifies the end user. The same separation on every endpoint.',
    'for-developers.principles.async.title': 'Async jobs by default',
    'for-developers.principles.async.description':
      'Long-running operations return a job ID. Poll it, subscribe by webhook, or attach it to in-app notifications.',
    'for-developers.principles.envelopes.title': 'Predictable JSON envelopes',
    'for-developers.principles.envelopes.description':
      'Every endpoint returns the same envelope. Consistent error model, standard HTTP statuses, no per-endpoint surprises.',
    'for-developers.principles.webhooks.title': 'Webhooks & observability',
    'for-developers.principles.webhooks.description':
      'HMAC-signed payment lifecycle webhooks, allowed-domain registration, secret rotation, and detailed activity logs.',

    'for-developers.samples.eyebrow': 'Code samples',
    'for-developers.samples.lead': 'Same shape across every endpoint',
    'for-developers.samples.note':
      'Two tokens, JSON in, JSON out. The calls below reach three different capabilities and are still the same request.',
    'for-developers.contract.baseUrl.term': 'Base URL',
    'for-developers.contract.appToken.term': 'App token',
    'for-developers.contract.userToken.term': 'User token',
    'for-developers.contract.envelope.term': 'Envelope',
    'for-developers.samples.content.title': 'Generate an SEO article',
    'for-developers.samples.payment.title': 'Create a payment transaction',
    'for-developers.samples.dashboard.title': 'Bootstrap a whitelabel dashboard',

    'for-developers.reference.eyebrow': 'Reference',
    'for-developers.reference.title': 'The full API reference',
    'for-developers.reference.body':
      'Interactive documentation with code examples in cURL, Python and JavaScript, at developer.1platform.pro.',
    'for-developers.cta.readApiDocs': 'Read API Docs',
    'for-developers.cta.apiReference': 'API Reference',

    'for-developers.related.eyebrow': 'Related',
    'for-developers.related.lead': 'Power your product with the rest of the platform',
    'for-developers.related.whitelabel.description': 'Bootstrap a branded dashboard for your own SaaS in one API call.',
    'for-developers.related.payments.description': 'Add payments and compliant invoicing to your product via REST.',
    'for-developers.related.content.title': 'AI Content Generation',
    'for-developers.related.content.description': 'Embed content generation, images and SEO inside your product.',
  },
  es: {
    'for-developers.title': 'API REST de ecommerce para SaaS — Pagos, contenido y marca blanca | 1Platform',
    'for-developers.description':
      'Impulsa tu SaaS sobre 1Platform. API REST con autenticación de doble token, trabajos asíncronos y respuestas JSON predecibles — pagos, contenido y panel de marca blanca incluidos.',

    'for-developers.hero.headline': 'Construye sobre una API de nivel profesional',
    'for-developers.hero.subheadline':
      'Impulsa tu propio SaaS sobre 1Platform. Una API REST, dos tokens, trabajos asíncronos, respuestas JSON predecibles — pagos, contenido y panel de marca blanca incluidos.',
    'for-developers.hero.badge': 'API REST · Trabajos asíncronos · Webhooks',
    'for-developers.hero.secondaryCta': 'Impulsa tu SaaS',

    'for-developers.principles.eyebrow': 'Diseño de la API',
    'for-developers.principles.lead': 'Una plataforma sobre la que puedes construir un producto sin pelear con las abstracciones',
    'for-developers.principles.tokens.title': 'Una API REST, dos tokens',
    'for-developers.principles.tokens.description':
      'Autenticación de doble token: el token de app identifica tu producto, el token de usuario identifica al usuario final. La misma separación en cada endpoint.',
    'for-developers.principles.async.title': 'Trabajos asíncronos por defecto',
    'for-developers.principles.async.description':
      'Las operaciones de larga duración devuelven un ID de trabajo. Consúltalo por polling, suscríbete por webhook o vincúlalo a notificaciones dentro de la app.',
    'for-developers.principles.envelopes.title': 'Respuestas JSON predecibles',
    'for-developers.principles.envelopes.description':
      'Cada endpoint devuelve el mismo formato de respuesta. Modelo de errores consistente, códigos HTTP estándar, sin sorpresas por endpoint.',
    'for-developers.principles.webhooks.title': 'Webhooks y observabilidad',
    'for-developers.principles.webhooks.description':
      'Webhooks del ciclo de vida de pagos firmados con HMAC, registro de dominios permitidos, rotación de secretos y registros de actividad detallados.',

    'for-developers.samples.eyebrow': 'Ejemplos de código',
    'for-developers.samples.lead': 'La misma forma en cada endpoint',
    'for-developers.samples.note':
      'Dos tokens, JSON de entrada, JSON de salida. Las llamadas de abajo llegan a tres funciones distintas y siguen siendo la misma solicitud.',
    'for-developers.contract.baseUrl.term': 'URL base',
    'for-developers.contract.appToken.term': 'Token de app',
    'for-developers.contract.userToken.term': 'Token de usuario',
    'for-developers.contract.envelope.term': 'Envelope',
    'for-developers.samples.content.title': 'Genera un artículo de SEO',
    'for-developers.samples.payment.title': 'Crea una transacción de pago',
    'for-developers.samples.dashboard.title': 'Inicializa un panel de marca blanca',

    'for-developers.reference.eyebrow': 'Referencia',
    'for-developers.reference.title': 'La referencia completa de la API',
    'for-developers.reference.body':
      'Documentación interactiva con ejemplos de código en cURL, Python y JavaScript, en developer.1platform.pro.',
    'for-developers.cta.readApiDocs': 'Ver documentación de la API',
    'for-developers.cta.apiReference': 'Referencia de la API',

    'for-developers.related.eyebrow': 'Relacionado',
    'for-developers.related.lead': 'Impulsa tu producto con el resto de la plataforma',
    'for-developers.related.whitelabel.description': 'Inicializa un panel con tu marca para tu propio SaaS en una sola llamada a la API.',
    'for-developers.related.payments.description': 'Agrega a tu producto pagos y facturación electrónica, vía REST.',
    'for-developers.related.content.title': 'Generación de contenido con IA',
    'for-developers.related.content.description': 'Integra generación de contenido, imágenes y SEO dentro de tu producto.',
  },
});
