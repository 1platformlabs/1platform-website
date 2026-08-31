import { defineMessages } from '@i18n/ui';

/**
 * The functional email itself (user "sales", domain "1platform.pro") is data,
 * not copy — it stays identical in both trees, set via `data-user`/
 * `data-domain` in Contact.astro, same as the pilot's provider-name rule
 * keeps proper nouns untranslated. Only the strings AROUND it (labels, aria
 * description, script-driven mailto subjects and button states) are keys
 * here. The inline <script> cannot see this catalogue at runtime, so those
 * strings ride into the browser as `data-*` attributes set from t() in the
 * markup — same pattern as ShareButtons.astro and CodeBlock.astro.
 */
export default defineMessages({
  en: {
    'contact.title': 'Contact — Custom Quotes & Help Getting Started | 1Platform',
    'contact.description':
      'Write to us about custom quotes, a live demo, help getting your business running, or a partnership. We reply within 24 hours, business days.',
    'contact.breadcrumb': 'Contact',

    'contact.eyebrow': 'We’re here to help',
    'contact.headline.pre': "Let's talk about",
    'contact.headline.accent': 'your business',
    'contact.sub.pre':
      'Need a custom quote, a live demo, or a hand getting set up? We reply within',
    'contact.sub.strong': '24 hours',
    'contact.sub.post': 'on business days.',
    'contact.topicPrefix': 'Asking about',

    // Mailto subject lines, keyed by the `?topic=` query param. Ride to the
    // browser script as data-* attributes — see SPECIAL ATTENTION above.
    'contact.topics.agency': 'Agency Inquiry',
    'contact.topics.whitelabel': 'Whitelabel Inquiry',
    'contact.topics.enterprise': 'Enterprise Inquiry',
    'contact.topics.custom': 'Custom Pricing',
    'contact.topics.default': 'Sales Inquiry',

    'contact.expectations.responseTime.term': 'Response time',
    'contact.expectations.responseTime.detail': 'Within 24 hours on business days (GMT-6).',
    'contact.expectations.whatToInclude.term': 'What to include',
    'contact.expectations.whatToInclude.detail':
      'Use case, expected volume, team size, and any deadline you are working to.',
    'contact.expectations.technical.term': 'Technical questions',
    'contact.expectations.technical.detailBefore': 'Check the',
    'contact.expectations.technical.linkText': 'developer documentation',
    'contact.expectations.technical.detailAfter': 'first — it covers most integrations.',

    'contact.panel.title': 'Email us',
    'contact.panel.emailAria': 'sales at 1platform dot pro',
    'contact.panel.noscript': 'Enable JavaScript to see the email address, or use the Open Email button below.',
    'contact.panel.openEmail': 'Open Email',
    'contact.panel.copyEmail': 'Copy Email',
    'contact.panel.copiedLabel': 'Copied!',
    'contact.panel.selectedLabel': 'Email selected — press Cmd/Ctrl+C',
    'contact.panel.hint.pre': 'Already on 1Platform? Sign in at',
    'contact.panel.hint.post': 'and use the in-app chat for faster support.',
  },
  es: {
    'contact.title': 'Contacto — Cotizaciones a tu medida y ayuda para empezar | 1Platform',
    'contact.description':
      'Escríbenos por una cotización a tu medida, una demo en vivo, ayuda para poner tu negocio en marcha o una alianza. Respondemos en 24 horas, días hábiles.',
    'contact.breadcrumb': 'Contacto',

    'contact.eyebrow': 'Estamos para ayudarte',
    'contact.headline.pre': 'Hablemos de',
    'contact.headline.accent': 'tu negocio',
    'contact.sub.pre':
      '¿Necesitas una cotización a tu medida, una demo en vivo o una mano para arrancar? Te respondemos en',
    'contact.sub.strong': '24 horas',
    'contact.sub.post': 'en días hábiles.',
    // Not a calque of "Asking about": that reads as "Consultando sobre Consulta
    // de agencia" once the label (itself starting with "Consulta…") drops in.
    // A short label prefix reads naturally here instead.
    'contact.topicPrefix': 'Motivo:',

    'contact.topics.agency': 'Consulta de agencia',
    'contact.topics.whitelabel': 'Consulta de marca blanca',
    'contact.topics.enterprise': 'Consulta empresarial',
    'contact.topics.custom': 'Precio personalizado',
    'contact.topics.default': 'Consulta de ventas',

    'contact.expectations.responseTime.term': 'Tiempo de respuesta',
    'contact.expectations.responseTime.detail': 'En 24 horas en días hábiles (GMT-6).',
    'contact.expectations.whatToInclude.term': 'Qué incluir',
    'contact.expectations.whatToInclude.detail':
      'Caso de uso, volumen esperado, tamaño del equipo y cualquier plazo con el que estés trabajando.',
    'contact.expectations.technical.term': 'Preguntas técnicas',
    'contact.expectations.technical.detailBefore': 'Consulta la',
    'contact.expectations.technical.linkText': 'documentación para desarrolladores',
    'contact.expectations.technical.detailAfter': 'primero — cubre la mayoría de las integraciones.',

    'contact.panel.title': 'Escríbenos',
    'contact.panel.emailAria': 'sales arroba 1platform punto pro',
    'contact.panel.noscript': 'Activa JavaScript para ver la dirección de correo, o usa el botón Abrir correo de abajo.',
    'contact.panel.openEmail': 'Abrir correo',
    'contact.panel.copyEmail': 'Copiar correo',
    'contact.panel.copiedLabel': '¡Copiado!',
    'contact.panel.selectedLabel': 'Correo seleccionado — presiona Cmd/Ctrl+C',
    'contact.panel.hint.pre': '¿Ya usas 1Platform? Inicia sesión en',
    'contact.panel.hint.post': 'y usa el chat dentro de la app para soporte más rápido.',
  },
});
