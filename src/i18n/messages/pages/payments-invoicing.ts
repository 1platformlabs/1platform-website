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
    'paymentsInvoicing.waysToCharge.eyebrow': 'Three ways to charge',
    'paymentsInvoicing.waysToCharge.lead':
      'Not every sale arrives through your checkout. These are the other ways money reaches you.',

    'paymentsInvoicing.charge.link.title': 'Send a payment link',
    'paymentsInvoicing.charge.link.description':
      'Emit a link and send it to whoever owes you. The person paying does not need a 1Platform account and never signs in: the link opens straight into a hosted checkout. You can list your links, look one up, and cancel one that should no longer be paid.',
    'paymentsInvoicing.charge.link.note':
      'A link that has already been paid, cancelled or expired shows a short status page instead of taking money again.',

    'paymentsInvoicing.charge.terminal.title': 'Take cards in person',
    'paymentsInvoicing.charge.terminal.description':
      'Apply for a card terminal for a business, attach the documents it asks for, send the application, and follow where it is. If something needs fixing you can correct it, and you can withdraw it while it is still open.',
    'paymentsInvoicing.charge.terminal.prerequisite':
      'It is an application, not an instant activation. Before you can open one, the business needs its tax identification and electronic invoicing already working, or the request comes back listing exactly what is missing. Only a branch administrator can file it, and the answer can be a rejection.',

    'paymentsInvoicing.charge.subscriptions.title': 'Charge your own customers monthly',
    'paymentsInvoicing.charge.subscriptions.description':
      'Build your own plans, publish them, and enrol your customers on them. Keep the customer records, read the subscriptions back, and cancel one when someone leaves. Your plans, your customers, your recurring revenue.',
    'paymentsInvoicing.charge.subscriptions.note':
      'An invitation enrols one customer once. To bring in someone else, or the same person again after theirs is used, issue another. This is separate from the balance you hold with 1Platform.',

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
    'paymentsInvoicing.waysToCharge.eyebrow': 'Tres formas de cobrar',
    'paymentsInvoicing.waysToCharge.lead':
      'No toda venta entra por tu checkout. Estas son las otras formas en que el dinero te llega.',

    'paymentsInvoicing.charge.link.title': 'Manda un enlace de cobro',
    'paymentsInvoicing.charge.link.description':
      'Emite un enlace y mándaselo a quien te debe. Quien paga no necesita una cuenta de 1Platform y nunca inicia sesión: el enlace abre directo en un checkout alojado. Puedes listar tus enlaces, consultar uno y cancelar el que ya no deba pagarse.',
    'paymentsInvoicing.charge.link.note':
      'Un enlace ya pagado, cancelado o vencido muestra una página de estado breve en lugar de volver a cobrar.',

    'paymentsInvoicing.charge.terminal.title': 'Cobra con tarjeta presente',
    'paymentsInvoicing.charge.terminal.description':
      'Solicita una terminal para un comercio, adjunta los documentos que pide, envía la solicitud y sigue en qué punto está. Si algo hay que corregir puedes hacerlo, y puedes retirarla mientras siga abierta.',
    'paymentsInvoicing.charge.terminal.prerequisite':
      'Es una solicitud, no un alta inmediata. Antes de poder abrirla, el comercio necesita su identificación tributaria y la facturación electrónica ya funcionando, o la solicitud vuelve enumerando exactamente lo que falta. Sólo un administrador de sucursal puede presentarla, y la respuesta puede ser un rechazo.',

    'paymentsInvoicing.charge.subscriptions.title': 'Cóbrale cada mes a tus clientes',
    'paymentsInvoicing.charge.subscriptions.description':
      'Arma tus propios planes, publícalos y da de alta en ellos a tus clientes. Guarda las fichas de cliente, consulta las suscripciones y cancela una cuando alguien se va. Tus planes, tus clientes, tus ingresos recurrentes.',
    'paymentsInvoicing.charge.subscriptions.note':
      'Una invitación da de alta a un cliente una vez. Para sumar a otra persona, o a la misma después de que use la suya, emite otra. Esto es distinto del saldo que tú tienes con 1Platform.',

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
