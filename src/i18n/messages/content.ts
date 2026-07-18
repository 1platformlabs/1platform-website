import { defineMessages } from '@i18n/ui';

/**
 * Blog and changelog chrome, plus the two category label maps.
 *
 * The blog map used to be copied verbatim into four files and the changelog map
 * into a fifth. Translating five copies of the same six labels would have
 * guaranteed they drifted, so they are deduplicated here first: five
 * translations become one. Every consumer now reads
 * `t('blog.category.' + slug)`.
 */
export default defineMessages({
  en: {
    // — Blog index —————————————————————————————————————————————
    'blog.title': 'Blog | 1Platform',
    'blog.description':
      'Insights on launching an online store, accepting payments, electronic invoicing, AI content, and the 1Platform developer API. Tutorials and product updates.',
    'blog.eyebrow': 'Writing',
    'blog.h1': 'Blog',
    'blog.lede':
      'How we build the platform, and how to build on top of it — stores, payments, invoicing, content, and the API underneath all of it.',
    'blog.subscribe': 'Subscribe via RSS',
    'blog.readingTime': '{n} min read',
    'blog.writtenBy': 'Written by',
    'blog.length': 'Length',
    'blog.published': 'Published',
    'blog.updated': 'Updated',
    'blog.topics': 'Topics',
    'blog.topicsAria': 'Browse by topic',
    'blog.latest': 'Latest',
    'blog.archive': 'Archive',

    // — Category pages —————————————————————————————————————————
    'blog.category.title': '{category} | 1Platform Blog',
    'blog.category.description': 'Browse {category} articles on the 1Platform blog.',
    'blog.category.eyebrow': 'Topic',
    'blog.category.other': 'Other topics',
    'blog.category.otherAria': 'Other topics',
    'blog.category.all': 'All articles',
    'blog.category.count_one': '{n} article',
    'blog.category.count_other': '{n} articles',

    // Initialisms mean these cannot be title-cased by rule.
    'blog.category.seo-automation': 'SEO automation',
    'blog.category.ai-content': 'AI content',
    'blog.category.api-tutorials': 'API tutorials',
    'blog.category.product-updates': 'Product updates',
    'blog.category.ecommerce': 'Ecommerce',
    'blog.category.payments-invoicing': 'Payments & invoicing',

    // — RSS feeds ——————————————————————————————————————————————
    // The post <title> was assembled from a template literal in BlogLayout, so
    // it bypassed the catalogue entirely and every Spanish post shipped an
    // English title — in the browser tab and in search results.
    'blog.post.title': '{title} | 1Platform Blog',
    'blog.readArticle': 'Read the article',
    'blog.feed.title': '1Platform Blog',
    'blog.feed.description':
      'Insights on SEO automation, AI content generation, API tutorials, and product updates from the 1Platform team.',

    // — Changelog ——————————————————————————————————————————————
    'changelog.title': 'Changelog | 1Platform',
    'changelog.description':
      'Every update, new feature, and improvement to 1Platform — online store, payments, invoicing, AI content, whitelabel dashboard, and developer API services.',
    'changelog.eyebrow': 'Product',
    'changelog.h1': 'Changelog',
    'changelog.lede':
      'Every release, in the order it shipped — new capabilities, changes to the API, and fixes.',
    'changelog.feed.title': '1Platform Changelog',
    'changelog.feed.description':
      'Track every update, new feature, and improvement to the 1Platform API and services.',

    'changelog.category.new-feature': 'New feature',
    'changelog.category.improvement': 'Improvement',
    'changelog.category.bug-fix': 'Bug fix',
    'changelog.category.api-change': 'API change',
  },
  es: {
    // — Índice del blog ————————————————————————————————————————
    'blog.title': 'Blog | 1Platform',
    'blog.description':
      'Ideas sobre cómo lanzar una tienda online, aceptar pagos, emitir facturas electrónicas, generar contenido con IA y usar la API de 1Platform. Tutoriales y novedades del producto.',
    'blog.eyebrow': 'Escribimos',
    'blog.h1': 'Blog',
    'blog.lede':
      'Cómo construimos la plataforma y cómo construir sobre ella — tiendas, pagos, facturación, contenido y la API que hay debajo de todo.',
    'blog.subscribe': 'Suscríbete por RSS',
    'blog.readingTime': '{n} min de lectura',
    'blog.writtenBy': 'Escrito por',
    'blog.length': 'Extensión',
    'blog.published': 'Publicado',
    'blog.updated': 'Actualizado',
    'blog.topics': 'Temas',
    'blog.topicsAria': 'Explorar por tema',
    'blog.latest': 'Lo último',
    'blog.archive': 'Archivo',

    // — Páginas de categoría ———————————————————————————————————
    'blog.category.title': '{category} | Blog de 1Platform',
    'blog.category.description': 'Explora los artículos de {category} en el blog de 1Platform.',
    'blog.category.eyebrow': 'Tema',
    'blog.category.other': 'Otros temas',
    'blog.category.otherAria': 'Otros temas',
    'blog.category.all': 'Todos los artículos',
    'blog.category.count_one': '{n} artículo',
    'blog.category.count_other': '{n} artículos',

    'blog.category.seo-automation': 'Automatización de SEO',
    'blog.category.ai-content': 'Contenido con IA',
    'blog.category.api-tutorials': 'Tutoriales de la API',
    'blog.category.product-updates': 'Novedades del producto',
    'blog.category.ecommerce': 'Comercio electrónico',
    'blog.category.payments-invoicing': 'Pagos y facturación',

    // — Feeds RSS ——————————————————————————————————————————————
    'blog.post.title': '{title} | Blog de 1Platform',
    'blog.readArticle': 'Leer el artículo',
    'blog.feed.title': 'Blog de 1Platform',
    'blog.feed.description':
      'Ideas sobre automatización de SEO, generación de contenido con IA, tutoriales de la API y novedades del producto, del equipo de 1Platform.',

    // — Novedades ——————————————————————————————————————————————
    'changelog.title': 'Novedades | 1Platform',
    'changelog.description':
      'Todas las actualizaciones, funciones nuevas y mejoras de 1Platform — tienda online, pagos, facturación, contenido con IA, panel de marca blanca y servicios de la API.',
    'changelog.eyebrow': 'Producto',
    'changelog.h1': 'Novedades',
    'changelog.lede':
      'Cada versión, en el orden en que se publicó — capacidades nuevas, cambios en la API y correcciones.',
    'changelog.feed.title': 'Novedades de 1Platform',
    'changelog.feed.description':
      'Sigue todas las actualizaciones, funciones nuevas y mejoras de la API y los servicios de 1Platform.',

    'changelog.category.new-feature': 'Nueva función',
    'changelog.category.improvement': 'Mejora',
    'changelog.category.bug-fix': 'Corrección',
    'changelog.category.api-change': 'Cambio de API',
  },
});
