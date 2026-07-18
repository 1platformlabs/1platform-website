import { defineMessages } from '@i18n/ui';

/**
 * Whitelabel Dashboard solution page. "Whitelabel Dashboard" as a
 * title/badge reuses `nav.solutions.whitelabel` from common.ts. The
 * breadcrumb's third crumb says the shorter "Whitelabel" in the English
 * source, so it gets its own page-specific key.
 */
export default defineMessages({
  en: {
    'solutions-whitelabel.title': 'Whitelabel Dashboard — Branded SaaS in One API Call | 1Platform',
    'solutions-whitelabel.description':
      'Bootstrap a fully branded dashboard from one API call — branding, theme, layout, i18n, and home KPIs. Power your own product under your brand.',
    'solutions-whitelabel.breadcrumb.whitelabel': 'Whitelabel',

    'solutions-whitelabel.hero.headline': 'Your own brand, your own dashboard',
    'solutions-whitelabel.hero.subheadline':
      'Bootstrap a fully branded dashboard from one API call. Branding, theme, layout, i18n, and home KPIs — everything your users see, under your name.',
    'solutions-whitelabel.hero.cta.primary': 'Talk to Sales',
    'solutions-whitelabel.hero.cta.secondary': 'Read API Docs',

    'solutions-whitelabel.bootstrap.eyebrow': 'One bootstrap call',
    'solutions-whitelabel.bootstrap.title': 'Everything the dashboard needs, in a single response',
    'solutions-whitelabel.bootstrap.desc':
      'No configuration bundle to build, no theme file to ship, no second request before the first screen is useful. Authenticate as the tenant and the shell comes back branded.',
    'solutions-whitelabel.bootstrap.linkCue': 'Read the bootstrap reference',
    'solutions-whitelabel.bootstrap.codeTitle': 'Bootstrap a branded dashboard',

    'solutions-whitelabel.whatYouGet.eyebrow': 'What you get',
    'solutions-whitelabel.whatYouGet.lead': 'What the bootstrap response resolves',

    'solutions-whitelabel.spec.branding.term': 'Branding & theme',
    'solutions-whitelabel.spec.branding.detail':
      'Logo, palette, typography, layout, enabled modules, and feature flags — all returned in a single bootstrap response, so the shell renders branded on first paint.',
    'solutions-whitelabel.spec.localization.term': 'Localization',
    'solutions-whitelabel.spec.localization.detail':
      'Localized bundles served per tenant. Language packs reload without redeploying the dashboard.',
    'solutions-whitelabel.spec.kpis.term': 'Home KPIs',
    'solutions-whitelabel.spec.kpis.detail':
      'Balance, unread counts, in-flight counters, and feature gates resolved in the same call — no extra round trips before the first screen is useful.',
    'solutions-whitelabel.spec.contract.term': 'The contract we use ourselves',
    'solutions-whitelabel.spec.contract.detail':
      'The 1Platform dashboard is built on this bootstrap response. You are configuring the same surface we ship, not a separate whitelabel edition of it.',

    'solutions-whitelabel.howItWorks.eyebrow': 'How it works',
    'solutions-whitelabel.howItWorks.lead': 'From tenant configuration to a branded dashboard in production.',
    'solutions-whitelabel.howItWorks.aria': 'How to launch a whitelabel dashboard, step by step',
    'solutions-whitelabel.step.configureTenant': 'Configure your tenant',
    'solutions-whitelabel.step.setBranding': 'Set branding & theme',
    'solutions-whitelabel.step.bootstrap': 'Bootstrap the dashboard',
    'solutions-whitelabel.step.launch': 'Launch under your brand',

    'solutions-whitelabel.related.eyebrow': 'Related solutions',
    'solutions-whitelabel.related.lead': 'Whitelabel pairs naturally with the rest of the platform.',
    'solutions-whitelabel.related.developers.title': 'For Developers',
    'solutions-whitelabel.related.developers.desc':
      'Power your own SaaS on top of the platform — REST API, async jobs, predictable envelopes.',
    'solutions-whitelabel.related.agencies.title': 'For Agencies',
    'solutions-whitelabel.related.agencies.desc':
      'Run dozens of client stores and websites from one dashboard.',
    'solutions-whitelabel.related.payments.desc':
      'Built-in payments and electronic invoicing across every tenant.',

    'solutions-whitelabel.next.eyebrow': 'Next step',
    'solutions-whitelabel.next.title': 'Ready to whitelabel?',
    'solutions-whitelabel.next.desc':
      'Talk to sales about pricing and onboarding for your tenant, or read the API reference and try the bootstrap call first.',
  },
  es: {
    'solutions-whitelabel.title': 'Panel de marca blanca — SaaS con tu marca en una sola llamada a la API | 1Platform',
    'solutions-whitelabel.description':
      'Arranca un panel totalmente personalizado con tu marca desde una sola llamada a la API — marca, tema, diseño, idiomas y KPIs de inicio. Impulsa tu propio producto bajo tu marca.',
    'solutions-whitelabel.breadcrumb.whitelabel': 'Marca blanca',

    'solutions-whitelabel.hero.headline': 'Tu propia marca, tu propio panel',
    'solutions-whitelabel.hero.subheadline':
      'Arranca un panel totalmente personalizado con tu marca desde una sola llamada a la API. Marca, tema, diseño, idiomas y KPIs de inicio — todo lo que ven tus usuarios, bajo tu nombre.',
    'solutions-whitelabel.hero.cta.primary': 'Habla con ventas',
    'solutions-whitelabel.hero.cta.secondary': 'Ver documentación de la API',

    'solutions-whitelabel.bootstrap.eyebrow': 'Una sola llamada de arranque',
    'solutions-whitelabel.bootstrap.title': 'Todo lo que necesita el panel, en una sola respuesta',
    'solutions-whitelabel.bootstrap.desc':
      'No hay que armar un paquete de configuración, ni entregar un archivo de tema, ni hacer una segunda solicitud antes de que la primera pantalla sea útil. Autentícate como el tenant y el shell vuelve ya personalizado con tu marca.',
    'solutions-whitelabel.bootstrap.linkCue': 'Lee la referencia de arranque',
    'solutions-whitelabel.bootstrap.codeTitle': 'Arranca un panel con tu marca',

    'solutions-whitelabel.whatYouGet.eyebrow': 'Lo que obtienes',
    'solutions-whitelabel.whatYouGet.lead': 'Lo que resuelve la respuesta de arranque',

    'solutions-whitelabel.spec.branding.term': 'Marca y tema',
    'solutions-whitelabel.spec.branding.detail':
      'Logo, paleta, tipografía, diseño, módulos habilitados y feature flags — todo devuelto en una sola respuesta de arranque, para que el shell se renderice con tu marca desde el primer render.',
    'solutions-whitelabel.spec.localization.term': 'Localización',
    'solutions-whitelabel.spec.localization.detail':
      'Paquetes localizados servidos por tenant. Los paquetes de idioma se recargan sin volver a desplegar el panel.',
    'solutions-whitelabel.spec.kpis.term': 'KPIs de inicio',
    'solutions-whitelabel.spec.kpis.detail':
      'Saldo, conteos sin leer, contadores en curso y feature gates resueltos en la misma llamada — sin viajes adicionales antes de que la primera pantalla sea útil.',
    'solutions-whitelabel.spec.contract.term': 'El contrato que usamos nosotros mismos',
    'solutions-whitelabel.spec.contract.detail':
      'El panel de 1Platform está construido sobre esta misma respuesta de arranque. Estás configurando la misma superficie que publicamos, no una edición de marca blanca aparte.',

    'solutions-whitelabel.howItWorks.eyebrow': 'Cómo funciona',
    'solutions-whitelabel.howItWorks.lead': 'De la configuración del tenant a un panel con tu marca en producción.',
    'solutions-whitelabel.howItWorks.aria': 'Cómo lanzar un panel de marca blanca, paso a paso',
    'solutions-whitelabel.step.configureTenant': 'Configura tu tenant',
    'solutions-whitelabel.step.setBranding': 'Define marca y tema',
    'solutions-whitelabel.step.bootstrap': 'Arranca el panel',
    'solutions-whitelabel.step.launch': 'Lanza bajo tu marca',

    'solutions-whitelabel.related.eyebrow': 'Soluciones relacionadas',
    'solutions-whitelabel.related.lead': 'La marca blanca combina naturalmente con el resto de la plataforma.',
    'solutions-whitelabel.related.developers.title': 'Para desarrolladores',
    'solutions-whitelabel.related.developers.desc':
      'Impulsa tu propio SaaS sobre la plataforma — API REST, trabajos asíncronos, respuestas predecibles.',
    'solutions-whitelabel.related.agencies.title': 'Para agencias',
    'solutions-whitelabel.related.agencies.desc':
      'Gestiona decenas de tiendas y sitios web de clientes desde un solo panel.',
    'solutions-whitelabel.related.payments.desc':
      'Pagos y facturación electrónica integrados en cada tenant.',

    'solutions-whitelabel.next.eyebrow': 'Siguiente paso',
    'solutions-whitelabel.next.title': '¿Listo para tu marca blanca?',
    'solutions-whitelabel.next.desc':
      'Habla con ventas sobre precios y alta de tu tenant, o lee la referencia de la API y prueba primero la llamada de arranque.',
  },
});
