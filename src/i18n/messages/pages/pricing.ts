import { defineMessages } from '@i18n/ui';

/**
 * Pricing page copy.
 *
 * The FAQ pairs and the "metered operations" rate-card rows describe how
 * billing actually runs — a prepaid balance, a hold taken before the work and
 * captured only on success, per-account rates. Nothing here states a figure:
 * the unit each operation is billed by is fixed and listed; the rate attached
 * to it is per-account and deliberately absent, in both languages alike.
 */
export default defineMessages({
  en: {
    'pricing.title': 'Pricing — Transparent, Pay-as-You-Use | 1Platform',
    'pricing.description':
      'Transparent pricing — pay only for what you use. No subscriptions, no hidden fees. Online store, payments, invoicing, content, and whitelabel dashboard.',

    // — Hero ——————————————————————————————————————————————————
    'pricing.hero.headline': 'Pay for the operations you run.',
    'pricing.hero.subheadline':
      'No subscription and no seat count. Your account holds a balance, each operation draws from it at a per-unit rate, and everything else that comes with the platform is not metered at all.',
    'pricing.cta.startFree': 'Start Free',
    'pricing.cta.contactSales': 'Contact Sales',

    // — The model ——————————————————————————————————————————————
    'pricing.model.eyebrow': 'The model',
    'pricing.model.statement': 'There is no plan to choose. There is a balance.',
    'pricing.model.noSub.label': 'No subscription',
    'pricing.model.noSub.body':
      'Your account holds a balance in USD. Every billable operation draws from it. There is no monthly fee, and nothing renews on its own.',
    'pricing.model.chargedOnSuccess.label': 'Charged on success',
    'pricing.model.chargedOnSuccess.body':
      'The cost is held against your balance before the work starts, and captured only when the operation completes. A failure releases the hold and leaves the balance untouched.',
    'pricing.model.itemised.label': 'Itemised, line by line',
    'pricing.model.itemised.body':
      'Each operation writes a line to your consumption log: what ran, which endpoint served it, what it cost, and your balance before and after.',
    'pricing.model.bounded.label': 'Bounded by design',
    'pricing.model.bounded.body':
      'A prepaid balance cannot be overspent. You are notified as it runs low, and operations stop rather than accruing a bill you never agreed to.',

    // — How a charge works —————————————————————————————————————
    'pricing.charge.eyebrow': 'How a charge works',
    'pricing.charge.lead': 'A hold first, a charge only if the work lands.',
    'pricing.charge.spineLabel': 'How a single charge moves through your balance',
    'pricing.charge.step1': 'Add balance',
    'pricing.charge.step2': 'Call an operation',
    'pricing.charge.step3': 'Cost is held',
    'pricing.charge.step4': 'The work runs',
    'pricing.charge.step5': 'Hold is captured',
    'pricing.charge.step6': 'Or released on failure',

    // — Metered operations ————————————————————————————————————
    'pricing.metered.eyebrow': 'Metered operations',
    'pricing.metered.introTitle': 'What draws from your balance, and by what unit',
    'pricing.metered.introBody':
      'The unit is fixed — it is what one charge covers. The rate attached to each unit is set per account, because it moves with volume and with where you operate, so it lives on your rate card rather than on a public list.',
    'pricing.metered.content.name': 'AI content generation',
    'pricing.metered.content.unit': 'per article',
    'pricing.metered.content.note':
      'One charge per generated article, in any supported language, whatever its length.',
    'pricing.metered.image.name': 'AI image generation',
    'pricing.metered.image.unit': 'per image',
    'pricing.metered.image.note': 'Three rates, by output: standard, HD, and HD wide.',
    'pricing.metered.stockImage.name': 'Stock image lookup',
    'pricing.metered.stockImage.unit': 'per image',
    'pricing.metered.stockImage.note':
      'Billed separately from generated images, at a materially lower unit rate.',
    'pricing.metered.keyword.name': 'Keyword extraction',
    'pricing.metered.keyword.unit': 'per search',
    'pricing.metered.keyword.note': 'Extraction and topic expansion share the same unit rate.',
    'pricing.metered.indexing.name': 'Indexing submission',
    'pricing.metered.indexing.unit': 'per URL',
    'pricing.metered.indexing.note':
      'One charge per URL submitted to search engines for indexing.',
    'pricing.metered.comment.name': 'Comment generation',
    'pricing.metered.comment.unit': 'per comment',
    'pricing.metered.comment.note':
      'Generated review and discussion copy for your catalog or articles.',
    'pricing.metered.profile.name': 'Profile generation',
    'pricing.metered.profile.unit': 'per profile',
    'pricing.metered.profile.note': 'Author and customer profiles, generated with matching avatars.',
    'pricing.metered.legalPage.name': 'Legal page generation',
    'pricing.metered.legalPage.unit': 'per page',
    'pricing.metered.legalPage.note':
      'Privacy policy, terms of service, and cookie notice, per jurisdiction.',
    'pricing.metered.searchConsole.name': 'Search Console reports',
    'pricing.metered.searchConsole.unit': 'per report',
    'pricing.metered.searchConsole.note': 'Pulled performance reports for a connected property.',
    'pricing.metered.agent.name': 'AI agent conversations',
    'pricing.metered.agent.unit': 'per step',
    'pricing.metered.agent.note':
      'Charged by step: opening the session, each response, and confirmation.',

    // — Not metered ————————————————————————————————————————————
    'pricing.included.eyebrow': 'Not metered',
    'pricing.included.lead': 'Included with the account, at no per-operation charge.',
    'pricing.included.checkLabel': 'Included',
    'pricing.included.allLink': 'See what each solution does',
    'pricing.included.platform.title': 'Platform',
    'pricing.included.platform.item1': 'Full REST API access',
    'pricing.included.platform.item2': 'Dual-token authentication',
    'pricing.included.platform.item3': 'Async jobs and webhook delivery',
    'pricing.included.platform.item4': 'Activity logs and consumption history',
    'pricing.included.storefront.title': 'Storefront',
    'pricing.included.storefront.item1': 'Catalog and hosted checkout',
    'pricing.included.storefront.item2': 'Customer accounts',
    'pricing.included.storefront.item3': 'Analytics',
    'pricing.included.storefront.item4': 'Referrals',
    'pricing.included.brand.title': 'Your brand',
    'pricing.included.brand.item1': 'Whitelabel branding and theme',
    'pricing.included.brand.item2': 'Localization bundles',
    'pricing.included.brand.item3': 'Dashboard KPIs and feature flags',
    'pricing.included.brand.item4': 'Low-balance and activity notifications',
    'pricing.included.support.title': 'Support',
    'pricing.included.support.item1': 'In-app help center',
    'pricing.included.support.item2': 'Support tickets from the dashboard',
    'pricing.included.support.item3': 'Documentation and API reference',
    'pricing.included.support.item4': 'Dedicated support on custom plans',

    // — Two ways to start —————————————————————————————————————
    'pricing.start.eyebrow': 'Two ways to start',
    'pricing.start.panel1.kicker': 'Open an account',
    'pricing.start.panel1.title': 'Start on the free plan',
    'pricing.start.panel1.body':
      'No credit card. You get a daily allowance for content generation and keyword extraction, and the full REST API from the first request. When the allowance stops being enough, add balance — the code you wrote against it does not change.',
    'pricing.start.panel2.kicker': 'Get a quote',
    'pricing.start.panel2.title': 'Ask for your rate card',
    'pricing.start.panel2.body':
      'Some costs are not ours to publish — they are set outside the platform and passed through. Those, plus volume rates, are what a quote is actually for:',
    'pricing.quoted.domain.name': 'Domain registration, transfer and renewal',
    'pricing.quoted.domain.reason': 'set by the extension and the registry',
    'pricing.quoted.payment.name': 'Payment processing',
    'pricing.quoted.payment.reason': 'set by the card networks in your country',
    'pricing.quoted.invoicing.name': 'Electronic invoicing',
    'pricing.quoted.invoicing.reason': "set by your tax authority’s certification regime",
    'pricing.quoted.linkBuilding.name': 'Link building placements',
    'pricing.quoted.linkBuilding.reason': 'set by the publisher you place with',
    'pricing.quoted.volume.name': 'Volume rates for metered operations',
    'pricing.quoted.volume.reason': 'set against the volume you expect to run',

    // — FAQ ————————————————————————————————————————————————————
    'pricing.faq.eyebrow': 'Questions',
    'pricing.faq.lead': 'The rest of what people ask before they start.',
    'pricing.faq.howPricingWorks.question': 'How does pricing work?',
    'pricing.faq.howPricingWorks.answer':
      'There is no subscription. Your account holds a prepaid balance in USD, and every billable operation draws from it at a per-unit rate. You activate whichever solutions you need and pay for the operations you actually run.',
    'pricing.faq.whyRatesHidden.question': 'Why are per-unit rates not listed on this page?',
    'pricing.faq.whyRatesHidden.answer':
      'Rates are set per account rather than published as one list, because they move with volume and with the country you operate in. The unit each operation is billed by is fixed and listed above — the rate attached to each unit comes on your rate card.',
    'pricing.faq.freePlan.question': 'Is there a free plan?',
    'pricing.faq.freePlan.answer':
      'Yes. Create an account with no credit card and you get a daily allowance for content generation and keyword extraction, plus full REST API access. When you need more than the daily allowance, add balance — nothing about how you build changes.',
    'pricing.faq.operationFails.question': 'What happens if an operation fails?',
    'pricing.faq.operationFails.answer':
      'Nothing is charged. The cost is held against your balance before the work starts and captured only once the operation completes. If it fails, the hold is released and your balance is untouched. Retries carry an idempotency key, so a repeated call is never charged twice.',
    'pricing.faq.unexpectedBill.question': 'Can I end up with a bill I did not expect?',
    'pricing.faq.unexpectedBill.answer':
      'No. Because the balance is prepaid, you cannot spend past it. You get a low-balance notification as it runs down, and once it is insufficient the affected operations stop rather than accruing a debt. Every charge is itemised in your consumption log with the operation, the endpoint, the cost, and your balance before and after.',
    'pricing.faq.volumeDiscount.question': 'Do rates improve with volume?',
    'pricing.faq.volumeDiscount.answer':
      'Yes. Per-unit rates are configured per account, so sustained volume is reflected in your rate card. Tell us the operations you expect to run and we will quote against them.',
    'pricing.faq.paymentMethods.question': 'What payment methods do you accept?',
    'pricing.faq.paymentMethods.answer':
      'Credit and debit cards, charged through the same hosted checkout the platform gives you for your own customers. For larger accounts we can arrange billing terms and consolidated invoicing.',
  },
  es: {
    'pricing.title': 'Precios — transparentes, pago por uso | 1Platform',
    'pricing.description':
      'Precios transparentes: paga solo por lo que usas. Sin suscripciones ni cargos ocultos. Tienda online, pagos, facturación, contenido y panel de marca blanca.',

    // — Hero ——————————————————————————————————————————————————
    'pricing.hero.headline': 'Paga por las operaciones que ejecutas.',
    'pricing.hero.subheadline':
      'Sin suscripción ni número de usuarios. Tu cuenta mantiene un saldo, cada operación descuenta de él a una tarifa por unidad, y todo lo demás que trae la plataforma no se factura por uso.',
    'pricing.cta.startFree': 'Empieza gratis',
    'pricing.cta.contactSales': 'Contacta a ventas',

    // — El modelo ——————————————————————————————————————————————
    'pricing.model.eyebrow': 'El modelo',
    'pricing.model.statement': 'No hay un plan que elegir. Hay un saldo.',
    'pricing.model.noSub.label': 'Sin suscripción',
    'pricing.model.noSub.body':
      'Tu cuenta mantiene un saldo en USD. Cada operación facturable descuenta de él. No hay cuota mensual, y nada se renueva por sí solo.',
    'pricing.model.chargedOnSuccess.label': 'Se cobra si se completa',
    'pricing.model.chargedOnSuccess.body':
      'El costo se retiene contra tu saldo antes de que el trabajo empiece, y se captura solo cuando la operación se completa. Si falla, la retención se libera y el saldo queda intacto.',
    'pricing.model.itemised.label': 'Detallado, línea por línea',
    'pricing.model.itemised.body':
      'Cada operación escribe una línea en tu registro de consumo: qué se ejecutó, qué endpoint la atendió, cuánto costó, y tu saldo antes y después.',
    'pricing.model.bounded.label': 'Acotado por diseño',
    'pricing.model.bounded.body':
      'Un saldo prepago no se puede sobregirar. Te avisamos cuando empieza a agotarse, y las operaciones se detienen en lugar de acumular una factura que nunca aceptaste.',

    // — Cómo funciona un cobro ————————————————————————————————
    'pricing.charge.eyebrow': 'Cómo funciona un cobro',
    'pricing.charge.lead': 'Primero una retención; un cobro solo si el trabajo se completa.',
    'pricing.charge.spineLabel': 'Cómo se mueve un solo cobro a través de tu saldo',
    'pricing.charge.step1': 'Añade saldo',
    'pricing.charge.step2': 'Llama a una operación',
    'pricing.charge.step3': 'El costo se retiene',
    'pricing.charge.step4': 'El trabajo se ejecuta',
    'pricing.charge.step5': 'La retención se captura',
    'pricing.charge.step6': 'O se libera si falla',

    // — Operaciones medidas ———————————————————————————————————
    'pricing.metered.eyebrow': 'Operaciones medidas',
    'pricing.metered.introTitle': 'Qué descuenta de tu saldo, y por qué unidad',
    'pricing.metered.introBody':
      'La unidad es fija: es lo que cubre un cobro. La tarifa asignada a cada unidad se define por cuenta, porque varía según el volumen y el país donde operas, así que vive en tu tarifario y no en una lista pública.',
    'pricing.metered.content.name': 'Generación de contenido con IA',
    'pricing.metered.content.unit': 'por artículo',
    'pricing.metered.content.note':
      'Un cargo por artículo generado, en cualquier idioma compatible, sin importar su extensión.',
    'pricing.metered.image.name': 'Generación de imágenes con IA',
    'pricing.metered.image.unit': 'por imagen',
    'pricing.metered.image.note': 'Tres tarifas, según el resultado: estándar, HD y HD panorámica.',
    'pricing.metered.stockImage.name': 'Búsqueda de imágenes de stock',
    'pricing.metered.stockImage.unit': 'por imagen',
    'pricing.metered.stockImage.note':
      'Se factura por separado de las imágenes generadas, a una tarifa unitaria considerablemente menor.',
    'pricing.metered.keyword.name': 'Extracción de palabras clave',
    'pricing.metered.keyword.unit': 'por búsqueda',
    'pricing.metered.keyword.note':
      'La extracción y la expansión de temas comparten la misma tarifa unitaria.',
    'pricing.metered.indexing.name': 'Envío para indexación',
    'pricing.metered.indexing.unit': 'por URL',
    'pricing.metered.indexing.note': 'Un cargo por cada URL enviada a los buscadores para indexación.',
    'pricing.metered.comment.name': 'Generación de comentarios',
    'pricing.metered.comment.unit': 'por comentario',
    'pricing.metered.comment.note':
      'Textos de reseñas y comentarios generados para tu catálogo o tus artículos.',
    'pricing.metered.profile.name': 'Generación de perfiles',
    'pricing.metered.profile.unit': 'por perfil',
    'pricing.metered.profile.note': 'Perfiles de autores y clientes, generados con avatares a juego.',
    'pricing.metered.legalPage.name': 'Generación de páginas legales',
    'pricing.metered.legalPage.unit': 'por página',
    'pricing.metered.legalPage.note':
      'Política de privacidad, términos del servicio y aviso de cookies, por jurisdicción.',
    'pricing.metered.searchConsole.name': 'Informes de Search Console',
    'pricing.metered.searchConsole.unit': 'por informe',
    'pricing.metered.searchConsole.note':
      'Informes de rendimiento obtenidos para una propiedad conectada.',
    'pricing.metered.agent.name': 'Conversaciones con agentes de IA',
    'pricing.metered.agent.unit': 'por paso',
    'pricing.metered.agent.note':
      'Se cobra por paso: abrir la sesión, cada respuesta y la confirmación.',

    // — Sin medición por uso ——————————————————————————————————
    'pricing.included.eyebrow': 'Sin medición por uso',
    'pricing.included.lead': 'Incluido con la cuenta, sin cargo por operación.',
    'pricing.included.checkLabel': 'Incluido',
    'pricing.included.allLink': 'Mira qué hace cada solución',
    'pricing.included.platform.title': 'Plataforma',
    'pricing.included.platform.item1': 'Acceso completo a la API REST',
    'pricing.included.platform.item2': 'Autenticación de doble token',
    'pricing.included.platform.item3': 'Trabajos asíncronos y entrega por webhook',
    'pricing.included.platform.item4': 'Registros de actividad e historial de consumo',
    'pricing.included.storefront.title': 'Tienda',
    'pricing.included.storefront.item1': 'Catálogo y checkout alojado',
    'pricing.included.storefront.item2': 'Cuentas de clientes',
    'pricing.included.storefront.item3': 'Analítica',
    'pricing.included.storefront.item4': 'Referidos',
    'pricing.included.brand.title': 'Tu marca',
    'pricing.included.brand.item1': 'Marca blanca y tema visual',
    'pricing.included.brand.item2': 'Paquetes de localización',
    'pricing.included.brand.item3': 'KPI del panel y feature flags',
    'pricing.included.brand.item4': 'Avisos de saldo bajo y actividad',
    'pricing.included.support.title': 'Soporte',
    'pricing.included.support.item1': 'Centro de ayuda dentro de la app',
    'pricing.included.support.item2': 'Tickets de soporte desde el panel',
    'pricing.included.support.item3': 'Documentación y referencia de la API',
    'pricing.included.support.item4': 'Soporte dedicado en planes personalizados',

    // — Dos formas de empezar ——————————————————————————————————
    'pricing.start.eyebrow': 'Dos formas de empezar',
    'pricing.start.panel1.kicker': 'Abre una cuenta',
    'pricing.start.panel1.title': 'Empieza en el plan gratuito',
    'pricing.start.panel1.body':
      'Sin tarjeta de crédito. Tienes una cuota diaria para generación de contenido y extracción de palabras clave, y la API REST completa desde la primera solicitud. Cuando la cuota deje de alcanzar, añade saldo: el código que escribiste no cambia.',
    'pricing.start.panel2.kicker': 'Solicita una cotización',
    'pricing.start.panel2.title': 'Pide tu tarifario',
    'pricing.start.panel2.body':
      'Algunos costos no nos corresponde publicarlos: los define alguien fuera de la plataforma y solo los trasladamos. Esos costos, más las tarifas por volumen, son justo para lo que sirve una cotización:',
    'pricing.quoted.domain.name': 'Registro, transferencia y renovación de dominios',
    'pricing.quoted.domain.reason': 'lo definen la extensión y el registro',
    'pricing.quoted.payment.name': 'Procesamiento de pagos',
    'pricing.quoted.payment.reason': 'lo definen las redes de tarjetas en tu país',
    'pricing.quoted.invoicing.name': 'Facturación electrónica',
    'pricing.quoted.invoicing.reason': 'lo define el régimen de certificación de tu autoridad fiscal',
    'pricing.quoted.linkBuilding.name': 'Colocaciones de link building',
    'pricing.quoted.linkBuilding.reason': 'lo define el editor con el que colocas el enlace',
    'pricing.quoted.volume.name': 'Tarifas por volumen para operaciones medidas',
    'pricing.quoted.volume.reason': 'se define según el volumen que esperas ejecutar',

    // — Preguntas ——————————————————————————————————————————————
    'pricing.faq.eyebrow': 'Preguntas',
    'pricing.faq.lead': 'Lo demás que la gente pregunta antes de empezar.',
    'pricing.faq.howPricingWorks.question': '¿Cómo funcionan los precios?',
    'pricing.faq.howPricingWorks.answer':
      'No hay suscripción. Tu cuenta mantiene un saldo prepago en USD, y cada operación facturable descuenta de él a una tarifa por unidad. Activas las soluciones que necesitas y pagas por las operaciones que realmente ejecutas.',
    'pricing.faq.whyRatesHidden.question': '¿Por qué las tarifas por unidad no aparecen en esta página?',
    'pricing.faq.whyRatesHidden.answer':
      'Las tarifas se definen por cuenta en lugar de publicarse en una sola lista, porque varían según el volumen y el país donde operas. La unidad con la que se factura cada operación es fija y está listada arriba; la tarifa asignada a cada unidad viene en tu tarifario.',
    'pricing.faq.freePlan.question': '¿Hay un plan gratuito?',
    'pricing.faq.freePlan.answer':
      'Sí. Crea una cuenta sin tarjeta de crédito y obtienes una cuota diaria para generación de contenido y extracción de palabras clave, además de acceso completo a la API REST. Cuando necesites más que la cuota diaria, añade saldo: nada cambia en tu forma de construir.',
    'pricing.faq.operationFails.question': '¿Qué pasa si una operación falla?',
    'pricing.faq.operationFails.answer':
      'No se cobra nada. El costo se retiene contra tu saldo antes de que el trabajo empiece y se captura solo cuando la operación se completa. Si falla, la retención se libera y tu saldo queda intacto. Los reintentos llevan una clave de idempotencia, así que una llamada repetida nunca se cobra dos veces.',
    'pricing.faq.unexpectedBill.question': '¿Puedo terminar con una factura que no esperaba?',
    'pricing.faq.unexpectedBill.answer':
      'No. Como el saldo es prepago, no puedes gastar más de lo que tienes. Recibes un aviso de saldo bajo a medida que se agota, y cuando ya no alcanza, las operaciones afectadas se detienen en lugar de generar una deuda. Cada cobro queda detallado en tu registro de consumo con la operación, el endpoint, el costo, y tu saldo antes y después.',
    'pricing.faq.volumeDiscount.question': '¿Las tarifas mejoran con el volumen?',
    'pricing.faq.volumeDiscount.answer':
      'Sí. Las tarifas por unidad se configuran por cuenta, así que un volumen sostenido se refleja en tu tarifario. Cuéntanos las operaciones que esperas ejecutar y te cotizamos en función de ellas.',
    'pricing.faq.paymentMethods.question': '¿Qué métodos de pago aceptan?',
    'pricing.faq.paymentMethods.answer':
      'Tarjetas de crédito y débito, cobradas a través del mismo checkout alojado que la plataforma te da para tus propios clientes. Para cuentas más grandes podemos acordar condiciones de facturación y facturación consolidada.',
  },
});
