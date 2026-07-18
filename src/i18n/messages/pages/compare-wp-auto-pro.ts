import { defineMessages } from '@i18n/ui';

/**
 * 1Platform vs. WordPress content plugins.
 *
 * This page compares 1Platform with the *category* of automated WordPress
 * content plugins, never a named product — see the page component for the
 * reasoning. That framing has to survive translation too: "WordPress" is the
 * CMS/category being compared against (not a paid provider 1Platform's own
 * infrastructure depends on), so it stays as-is in both languages, same as
 * the English source already does throughout.
 */
export default defineMessages({
  en: {
    'compareWpAutoPro.title':
      '1Platform vs. WordPress Content Plugins: Platform vs. Plugin | 1Platform',
    'compareWpAutoPro.description':
      'Compare 1Platform with automated WordPress content plugins. See why an API-first platform with a full pipeline, payments, invoicing, and link building goes further than a plugin that lives inside one CMS.',

    'compareWpAutoPro.hero.badge': 'Compare',
    'compareWpAutoPro.hero.headline': '1Platform vs. WordPress content plugins',
    'compareWpAutoPro.hero.subheadline':
      'A content plugin automates writing inside one CMS. An API-first platform runs the pipeline around it — research, publishing, indexing, and getting paid — from any stack you like.',
    'compareWpAutoPro.hero.primaryCta': 'View API Docs',
    'compareWpAutoPro.hero.secondaryCta': 'See Pricing',

    'compareWpAutoPro.breadcrumb.compare': 'Compare',
    'compareWpAutoPro.breadcrumb.current': '1Platform vs. WordPress Content Plugins',

    'compareWpAutoPro.matrix.eyebrow': 'Feature by feature',
    'compareWpAutoPro.matrix.lead': 'The same starting point, a different ceiling.',
    'compareWpAutoPro.matrix.caption':
      'Capabilities covered by 1Platform compared with automated WordPress content plugins, split into shared capabilities and points of divergence.',
    'compareWpAutoPro.matrix.col.capability': 'Capability',
    'compareWpAutoPro.matrix.col.us': '1Platform',
    'compareWpAutoPro.matrix.col.them': 'Content plugin',
    'compareWpAutoPro.matrix.caveat':
      'Compared against automated WordPress content plugins as a category — individual plugins differ in what they cover.',

    'compareWpAutoPro.group1.name': 'Where they overlap',
    'compareWpAutoPro.group1.note':
      'Both automate content work, and both can be driven programmatically.',
    'compareWpAutoPro.group1.row1': 'API access',
    'compareWpAutoPro.group1.row2': 'Multi-site support',
    'compareWpAutoPro.group1.row3': 'Async processing',

    'compareWpAutoPro.group2.name': 'Where they diverge',
    'compareWpAutoPro.group2.note': 'A plugin runs inside one CMS; a platform sits in front of all of them.',
    'compareWpAutoPro.group2.row1': 'Full automation pipeline',
    'compareWpAutoPro.group2.row2': 'Payment processing',
    'compareWpAutoPro.group2.row3': 'Electronic invoicing',
    'compareWpAutoPro.group2.row4': 'Link building',
    'compareWpAutoPro.group2.row5': 'Framework agnostic',

    'compareWpAutoPro.differentiators.eyebrow': 'Key differentiators',
    'compareWpAutoPro.differentiators.item1.title': 'Beyond content generation',
    'compareWpAutoPro.differentiators.item1.description':
      'Automated content plugins focus on one job: creating WordPress content. 1Platform runs the whole pipeline — keyword research, AI content generation, image sourcing, CMS publishing, search engine indexing, link building, payment processing and electronic invoicing — connected through a single API.',
    'compareWpAutoPro.differentiators.item2.title': 'No vendor lock-in',
    'compareWpAutoPro.differentiators.item2.description':
      'A plugin ties your automation to the WordPress ecosystem. 1Platform is a REST API that works with any stack: React, Vue, Astro, mobile apps, custom backends. Change framework without rewriting your automation logic.',
    'compareWpAutoPro.differentiators.item3.title': 'Built-in monetization',
    'compareWpAutoPro.differentiators.item3.description':
      'Payment processing and electronic invoicing are part of the platform. Monetize the content pipeline without adding a payment gateway and a billing system to the stack — content creation through to revenue collection stays in one place.',

    'compareWpAutoPro.integrate.eyebrow': 'Integrate',
    'compareWpAutoPro.integrate.heading': 'One call, from whatever you build in',
    'compareWpAutoPro.integrate.body':
      'A single request generates optimized content, ready to publish anywhere. No install, no per-site licence, no CMS to be inside of — just an HTTP call your stack already knows how to make.',
    'compareWpAutoPro.integrate.linkCue': 'Read the API docs',
    'compareWpAutoPro.integrate.codeTitle': 'Generate content',

    'compareWpAutoPro.faq.eyebrow': 'Questions',
    'compareWpAutoPro.faq.item1.question': 'Can I migrate from a WordPress content plugin to 1Platform?',
    'compareWpAutoPro.faq.item1.answer':
      'Yes. 1Platform is API-first, so you can integrate it into an existing WordPress site or any other framework. Replace your plugin calls with 1Platform API endpoints and gain access to the full automation pipeline, including payments, invoicing, and link building.',
    'compareWpAutoPro.faq.item2.question': 'Does 1Platform work only with WordPress?',
    'compareWpAutoPro.faq.item2.answer':
      '1Platform is completely framework agnostic. It works with WordPress, Next.js, Astro, Nuxt, custom backends, mobile apps, and any platform that can make HTTP requests. Your stack, your choice.',
    'compareWpAutoPro.faq.item3.question': 'How does 1Platform handle multi-site content?',
    'compareWpAutoPro.faq.item3.answer':
      'With 1Platform, a single API account manages content across unlimited sites. Each site can have its own configuration, publishing schedule, and analytics. No separate plugin installation or licence per site.',

    'compareWpAutoPro.more.eyebrow': 'More comparisons',
    'compareWpAutoPro.more.card1.title': '1Platform vs. AI writing tools',
    'compareWpAutoPro.more.card1.description':
      'Where a writing tool stops, and what the rest of the content pipeline has to cover.',
    'compareWpAutoPro.more.card2.title': '1Platform vs. building your own integration',
    'compareWpAutoPro.more.card2.description':
      'What it takes to wire the same capabilities together yourself, and what stays your problem afterwards.',
  },
  es: {
    'compareWpAutoPro.title':
      '1Platform vs. plugins de contenido para WordPress: plataforma vs. plugin | 1Platform',
    'compareWpAutoPro.description':
      'Compara 1Platform con los plugins de contenido automatizados para WordPress. Descubre por qué una plataforma API-first con un pipeline completo, pagos, facturación y link building llega más lejos que un plugin que vive dentro de un único CMS.',

    'compareWpAutoPro.hero.badge': 'Comparativa',
    'compareWpAutoPro.hero.headline': '1Platform vs. plugins de contenido para WordPress',
    'compareWpAutoPro.hero.subheadline':
      'Un plugin de contenido automatiza la escritura dentro de un CMS. Una plataforma API-first ejecuta el pipeline completo a su alrededor —investigación, publicación, indexación y cobro— desde el stack que prefieras.',
    'compareWpAutoPro.hero.primaryCta': 'Ver documentación de la API',
    'compareWpAutoPro.hero.secondaryCta': 'Ver precios',

    'compareWpAutoPro.breadcrumb.compare': 'Comparativa',
    'compareWpAutoPro.breadcrumb.current': '1Platform vs. plugins de contenido para WordPress',

    'compareWpAutoPro.matrix.eyebrow': 'Función por función',
    'compareWpAutoPro.matrix.lead': 'El mismo punto de partida, un techo distinto.',
    'compareWpAutoPro.matrix.caption':
      'Capacidades cubiertas por 1Platform frente a los plugins de contenido automatizados para WordPress, divididas entre lo que comparten y en qué se separan.',
    'compareWpAutoPro.matrix.col.capability': 'Capacidad',
    'compareWpAutoPro.matrix.col.us': '1Platform',
    'compareWpAutoPro.matrix.col.them': 'Plugin de contenido',
    'compareWpAutoPro.matrix.caveat':
      'Comparado con los plugins de contenido automatizados para WordPress como categoría — cada plugin individual cubre cosas distintas.',

    'compareWpAutoPro.group1.name': 'Dónde coinciden',
    'compareWpAutoPro.group1.note':
      'Ambos automatizan el trabajo de contenido, y ambos se pueden controlar de forma programática.',
    'compareWpAutoPro.group1.row1': 'Acceso a la API',
    'compareWpAutoPro.group1.row2': 'Soporte multisitio',
    'compareWpAutoPro.group1.row3': 'Procesamiento asíncrono',

    'compareWpAutoPro.group2.name': 'Dónde se separan',
    'compareWpAutoPro.group2.note': 'Un plugin corre dentro de un CMS; una plataforma se sitúa delante de todos ellos.',
    'compareWpAutoPro.group2.row1': 'Pipeline de automatización completo',
    'compareWpAutoPro.group2.row2': 'Procesamiento de pagos',
    'compareWpAutoPro.group2.row3': 'Facturación electrónica',
    'compareWpAutoPro.group2.row4': 'Link building',
    'compareWpAutoPro.group2.row5': 'Independiente del framework',

    'compareWpAutoPro.differentiators.eyebrow': 'Diferenciadores clave',
    'compareWpAutoPro.differentiators.item1.title': 'Más allá de generar contenido',
    'compareWpAutoPro.differentiators.item1.description':
      'Los plugins de contenido automatizado se centran en una sola tarea: crear contenido para WordPress. 1Platform ejecuta todo el pipeline —investigación de palabras clave, generación de contenido con IA, búsqueda de imágenes, publicación en el CMS, indexación en buscadores, link building, procesamiento de pagos y facturación electrónica— conectado a través de una sola API.',
    'compareWpAutoPro.differentiators.item2.title': 'Sin dependencia de un proveedor único',
    'compareWpAutoPro.differentiators.item2.description':
      'Un plugin ata tu automatización al ecosistema de WordPress. 1Platform es una API REST que funciona con cualquier stack: React, Vue, Astro, apps móviles, backends a medida. Cambia de framework sin reescribir tu lógica de automatización.',
    'compareWpAutoPro.differentiators.item3.title': 'Monetización integrada',
    'compareWpAutoPro.differentiators.item3.description':
      'El procesamiento de pagos y la facturación electrónica son parte de la plataforma. Monetiza el pipeline de contenido sin sumar una pasarela de pago ni un sistema de facturación al stack — desde la creación del contenido hasta el cobro, todo queda en un mismo lugar.',

    'compareWpAutoPro.integrate.eyebrow': 'Integra',
    'compareWpAutoPro.integrate.heading': 'Una llamada, desde lo que sea que construyas',
    'compareWpAutoPro.integrate.body':
      'Una sola solicitud genera contenido optimizado, listo para publicar donde sea. Sin instalación, sin licencia por sitio, sin necesidad de estar dentro de un CMS — solo una llamada HTTP que tu stack ya sabe hacer.',
    'compareWpAutoPro.integrate.linkCue': 'Lee la documentación de la API',
    'compareWpAutoPro.integrate.codeTitle': 'Generar contenido',

    'compareWpAutoPro.faq.eyebrow': 'Preguntas',
    'compareWpAutoPro.faq.item1.question': '¿Puedo migrar de un plugin de contenido para WordPress a 1Platform?',
    'compareWpAutoPro.faq.item1.answer':
      'Sí. 1Platform es API-first, así que puedes integrarlo en un sitio WordPress existente o en cualquier otro framework. Sustituye las llamadas de tu plugin por los endpoints de la API de 1Platform y accede a todo el pipeline de automatización, incluyendo pagos, facturación y link building.',
    'compareWpAutoPro.faq.item2.question': '¿1Platform funciona solo con WordPress?',
    'compareWpAutoPro.faq.item2.answer':
      '1Platform es completamente independiente del framework. Funciona con WordPress, Next.js, Astro, Nuxt, backends a medida, apps móviles y cualquier plataforma capaz de hacer peticiones HTTP. Tu stack, tu decisión.',
    'compareWpAutoPro.faq.item3.question': '¿Cómo gestiona 1Platform el contenido multisitio?',
    'compareWpAutoPro.faq.item3.answer':
      'Con 1Platform, una sola cuenta de API gestiona el contenido de sitios ilimitados. Cada sitio puede tener su propia configuración, calendario de publicación y analítica. Sin instalar un plugin ni pagar una licencia por cada sitio.',

    'compareWpAutoPro.more.eyebrow': 'Más comparativas',
    'compareWpAutoPro.more.card1.title': '1Platform vs. herramientas de escritura con IA',
    'compareWpAutoPro.more.card1.description':
      'Dónde se detiene una herramienta de escritura, y lo que el resto del pipeline de contenido tiene que cubrir.',
    'compareWpAutoPro.more.card2.title': '1Platform vs. construir tu propia integración',
    'compareWpAutoPro.more.card2.description':
      'Lo que cuesta conectar tú mismo las mismas funciones, y lo que sigue siendo tu problema después.',
  },
});
