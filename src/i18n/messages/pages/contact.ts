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
    'contact.title': 'Contact Sales — Custom Quotes & Onboarding | 1Platform',
    'contact.description':
      'Talk to the 1Platform sales team. Custom quotes, demos, onboarding help, and partnership inquiries. Response within 24 hours, business days.',
    'contact.breadcrumb': 'Contact',

    'contact.eyebrow': 'Talk to sales',
    'contact.headline.pre': "Let's talk about",
    'contact.headline.accent': 'your scale',
    'contact.sub.pre':
      'Need a custom quote, a live demo, or onboarding help for your team? Our sales engineers reply within',
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

    'contact.panel.title': 'Email sales',
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
    'contact.title': 'Contacta a ventas — Cotizaciones personalizadas y onboarding | 1Platform',
    'contact.description':
      'Habla con el equipo de ventas de 1Platform. Cotizaciones personalizadas, demos, ayuda de onboarding y consultas de alianzas. Respuesta en 24 horas, días hábiles.',
    'contact.breadcrumb': 'Contacto',

    'contact.eyebrow': 'Habla con ventas',
    'contact.headline.pre': 'Hablemos de',
    'contact.headline.accent': 'tu escala',
    'contact.sub.pre':
      '¿Necesitas una cotización personalizada, una demo en vivo o ayuda de onboarding para tu equipo? Nuestros ingenieros de ventas responden en',
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

    'contact.panel.title': 'Escríbenos a ventas',
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
