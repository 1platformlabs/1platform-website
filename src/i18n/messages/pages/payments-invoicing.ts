import { defineMessages } from '@i18n/ui';

/**
 * Payments & Invoicing solution page.
 *
 * Webhook lifecycle states (`approved`, `denied`, `cancelled`, `expired`,
 * `dismissed`) are literal values the real API returns — they stay identical
 * in both languages, the same way the curl example's JSON field names do.
 * Only the labels around them (section eyebrow, FAQ prose) are copy.
 */
export default defineMessages({
  en: {
    'paymentsInvoicing.title': 'Accept Payments & Issue Electronic Invoices | 1Platform',
    'paymentsInvoicing.description':
      'Accept online card payments and issue compliant electronic invoices automatically — all from one platform. Webhook-driven, audit-ready, ready for production.',

    'paymentsInvoicing.jsonld.serviceName': 'Payments & Electronic Invoicing',

    'paymentsInvoicing.hero.headline': 'Payments and compliant invoicing',
    'paymentsInvoicing.hero.subheadline':
      'Accept payments and issue compliant electronic invoices automatically — from one platform. Webhook-driven, audit-ready, production-tested.',
    'paymentsInvoicing.hero.badge': 'Payments · Invoicing',
    'paymentsInvoicing.hero.primaryCta': 'Start Accepting Payments',
    'paymentsInvoicing.hero.secondaryCta': 'For Developers — View API',

    'paymentsInvoicing.whatYouGet.eyebrow': 'What you get',
    'paymentsInvoicing.whatYouGet.lead': 'From checkout to compliant invoice, on one platform',

    'paymentsInvoicing.capability.acceptPayments.title': 'Accept payments',
    'paymentsInvoicing.capability.acceptPayments.description':
      'Card payments via API. Hosted checkout URLs, real-time webhooks and automatic balance crediting.',
    'paymentsInvoicing.capability.issueInvoices.title': 'Issue invoices',
    'paymentsInvoicing.capability.issueInvoices.description':
      'Compliant electronic invoices generated automatically. PDF + XML output, multi-item lines, automatic tax calculation.',
    'paymentsInvoicing.capability.trackEverything.title': 'Track everything',
    'paymentsInvoicing.capability.trackEverything.description':
      'HMAC-signed webhooks for every lifecycle event. Activity logs with method, endpoint, status and latency.',

    'paymentsInvoicing.outcomes.eyebrow': 'One API, two outcomes',
    'paymentsInvoicing.outcomes.title': 'Create a transaction, get an invoice',
    'paymentsInvoicing.outcomes.body':
      'One call opens the checkout. When the payment settles, the invoice is issued from the same transaction — no second system to reconcile it against, no export in between.',
    'paymentsInvoicing.outcomes.lifecycleLabel': 'Webhook states',
    'paymentsInvoicing.outcomes.codeTitle': 'Create a payment transaction',

    'paymentsInvoicing.questions.eyebrow': 'Questions',
    'paymentsInvoicing.questions.lead': 'What people ask before they switch',

    'paymentsInvoicing.faq.countries.q': 'Which countries are supported for electronic invoicing?',
    'paymentsInvoicing.faq.countries.a':
      'Electronic invoicing currently issues compliant invoices for Guatemala (FEL). Additional jurisdictions are on the roadmap — contact sales for timelines.',
    'paymentsInvoicing.faq.currencies.q': 'What currencies and payment methods do you accept?',
    'paymentsInvoicing.faq.currencies.a':
      'We accept all major credit and debit cards. Settlement currency is configured per merchant — contact sales to enable additional currencies.',
    'paymentsInvoicing.faq.invoiceTypes.q': 'What types of invoices can I issue?',
    'paymentsInvoicing.faq.invoiceTypes.a':
      'Standard invoices, credit notes, and cancellations — all PDF + XML output. Multi-item line support and automatic tax calculation.',
    'paymentsInvoicing.faq.reconciliation.q': 'How does reconciliation work?',
    'paymentsInvoicing.faq.reconciliation.a':
      'Every transaction emits HMAC-signed webhooks for approved, denied, cancelled, expired, and dismissed states. Pair with activity logs for full audit trails.',

    'paymentsInvoicing.related.eyebrow': 'Related',
    'paymentsInvoicing.related.lead': 'Payments and invoicing connect with the rest of the platform',
    'paymentsInvoicing.related.onlineStore.description':
      'Add a full storefront with checkout and customer accounts.',
    'paymentsInvoicing.related.forDevelopers.description':
      'Integrate payments and invoicing into your own SaaS via REST.',
    'paymentsInvoicing.related.whitelabel.description':
      'Surface payments and invoicing under your own brand.',
  },
  es: {
    'paymentsInvoicing.title': 'Acepta pagos y emite facturas electrónicas | 1Platform',
    'paymentsInvoicing.description':
      'Acepta pagos con tarjeta y emite facturas electrónicas conformes de forma automática — todo desde una sola plataforma. Impulsado por webhooks, listo para auditoría y para producción.',

    'paymentsInvoicing.jsonld.serviceName': 'Pagos y facturación electrónica',

    'paymentsInvoicing.hero.headline': 'Pagos y facturación conforme',
    'paymentsInvoicing.hero.subheadline':
      'Acepta pagos y emite facturas electrónicas conformes de forma automática — desde una sola plataforma. Impulsado por webhooks, listo para auditoría, probado en producción.',
    'paymentsInvoicing.hero.badge': 'Pagos · Facturación',
    'paymentsInvoicing.hero.primaryCta': 'Empieza a aceptar pagos',
    'paymentsInvoicing.hero.secondaryCta': 'Para desarrolladores — ver la API',

    'paymentsInvoicing.whatYouGet.eyebrow': 'Qué obtienes',
    'paymentsInvoicing.whatYouGet.lead': 'Del checkout a la factura conforme, en una sola plataforma',

    'paymentsInvoicing.capability.acceptPayments.title': 'Acepta pagos',
    'paymentsInvoicing.capability.acceptPayments.description':
      'Pagos con tarjeta vía API. URLs de checkout alojadas, webhooks en tiempo real y acreditación automática de saldo.',
    'paymentsInvoicing.capability.issueInvoices.title': 'Emite facturas',
    'paymentsInvoicing.capability.issueInvoices.description':
      'Facturas electrónicas conformes, generadas automáticamente. Salida en PDF y XML, múltiples líneas por factura y cálculo automático de impuestos.',
    'paymentsInvoicing.capability.trackEverything.title': 'Registra todo',
    'paymentsInvoicing.capability.trackEverything.description':
      'Webhooks firmados con HMAC para cada evento del ciclo de vida. Registros de actividad con método, endpoint, estado y latencia.',

    'paymentsInvoicing.outcomes.eyebrow': 'Una API, dos resultados',
    'paymentsInvoicing.outcomes.title': 'Crea una transacción, obtén una factura',
    'paymentsInvoicing.outcomes.body':
      'Una sola llamada abre el checkout. Cuando el pago se liquida, la factura se emite desde esa misma transacción — sin un segundo sistema que conciliar, sin exportación de por medio.',
    'paymentsInvoicing.outcomes.lifecycleLabel': 'Estados del webhook',
    'paymentsInvoicing.outcomes.codeTitle': 'Crear una transacción de pago',

    'paymentsInvoicing.questions.eyebrow': 'Preguntas',
    'paymentsInvoicing.questions.lead': 'Lo que preguntan antes de dar el salto',

    'paymentsInvoicing.faq.countries.q': '¿Para qué países está disponible la facturación electrónica?',
    'paymentsInvoicing.faq.countries.a':
      'Hoy la facturación electrónica emite facturas conformes para Guatemala (FEL). Más jurisdicciones están en el roadmap — contacta a ventas para conocer los plazos.',
    'paymentsInvoicing.faq.currencies.q': '¿Qué monedas y métodos de pago aceptan?',
    'paymentsInvoicing.faq.currencies.a':
      'Aceptamos las principales tarjetas de crédito y débito. La moneda de liquidación se configura por comercio — contacta a ventas para habilitar monedas adicionales.',
    'paymentsInvoicing.faq.invoiceTypes.q': '¿Qué tipos de factura puedo emitir?',
    'paymentsInvoicing.faq.invoiceTypes.a':
      'Facturas estándar, notas de crédito y anulaciones — todas en PDF y XML. Soporta múltiples líneas por factura y calcula los impuestos automáticamente.',
    'paymentsInvoicing.faq.reconciliation.q': '¿Cómo funciona la conciliación?',
    'paymentsInvoicing.faq.reconciliation.a':
      'Cada transacción emite webhooks firmados con HMAC para los estados approved, denied, cancelled, expired y dismissed. Combínalos con los registros de actividad para una auditoría completa.',

    'paymentsInvoicing.related.eyebrow': 'Relacionado',
    'paymentsInvoicing.related.lead': 'Pagos y facturación se conectan con el resto de la plataforma',
    'paymentsInvoicing.related.onlineStore.description':
      'Suma una tienda completa con checkout y cuentas de cliente.',
    'paymentsInvoicing.related.forDevelopers.description':
      'Integra pagos y facturación en tu propio SaaS vía REST.',
    'paymentsInvoicing.related.whitelabel.description':
      'Muestra pagos y facturación bajo tu propia marca.',
  },
});
