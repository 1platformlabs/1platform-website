import { defineMessages } from '@i18n/ui';

/**
 * AI Content Generation solution page. The English source names the Service
 * "AI Content Generation" and the badge/JSON-LD reuse that exact string —
 * it does not match common.ts's shorter `nav.solutions.content` ("AI
 * Content"), so it stays page-specific rather than reusing that key. The
 * breadcrumb's third crumb is shorter still ("Content"), so it gets its own
 * key too.
 */
export default defineMessages({
  en: {
    'solutions-content.title': 'AI Content Generation API — Articles, Images & SEO | 1Platform',
    'solutions-content.description':
      'Generate SEO-optimized articles, images, comments, and landing pages with AI. Extract keywords, publish to CMS, and submit for indexing — all from one platform.',
    'solutions-content.serviceName': 'AI Content Generation',
    'solutions-content.breadcrumb.content': 'Content',

    'solutions-content.hero.headline': 'Content that ranks itself',
    'solutions-content.hero.subheadline':
      'Generate SEO-optimized articles, images, and legal pages with AI. Extract keywords, publish to your CMS, and submit for indexing — all from one platform.',
    'solutions-content.hero.cta.primary': 'Start Publishing',
    'solutions-content.hero.cta.secondary': 'See Pricing',

    'solutions-content.whatYouGet.eyebrow': 'What you get',
    'solutions-content.whatYouGet.lead':
      'A complete content engine — research, generation, publishing, and indexing in one API.',

    'solutions-content.feature.articles.title': 'AI articles',
    'solutions-content.feature.articles.desc':
      'SEO-optimized articles from a single keyword. Multi-language, async job pipeline, human-quality output.',
    'solutions-content.feature.images.title': 'AI images',
    'solutions-content.feature.images.desc':
      'Generate unique visuals or source from premium libraries — commercial license included.',
    'solutions-content.feature.keyword.title': 'Keyword intelligence',
    'solutions-content.feature.keyword.desc':
      'Extract keywords with volume, intent, and difficulty from any URL or topic.',
    'solutions-content.feature.indexing.title': 'Publish & index',
    'solutions-content.feature.indexing.desc':
      'Push content to your CMS, submit URLs for indexing, and build backlinks — all from one API.',

    'solutions-content.howItWorks.eyebrow': 'How it works',
    'solutions-content.howItWorks.lead': 'From keyword to indexed article, without leaving the platform.',
    'solutions-content.howItWorks.aria': 'How content generation works, step by step',
    'solutions-content.step.extractKeywords': 'Extract keywords',
    'solutions-content.step.generateContent': 'Generate content',
    'solutions-content.step.publishCms': 'Publish to your CMS',
    'solutions-content.step.submitIndexing': 'Submit for indexing',

    'solutions-content.whatItReplaces.eyebrow': 'What it replaces',
    'solutions-content.whatItReplaces.lead': 'One platform instead of separate tools',
    'solutions-content.compare.aiWriting.without': 'An AI writing tool on its own subscription',
    'solutions-content.compare.aiWriting.with': 'AI content built in',
    'solutions-content.compare.stockImages.without': 'A stock image library billed separately',
    'solutions-content.compare.stockImages.with': 'AI images included',
    'solutions-content.compare.keyword.without': 'A keyword research tool with its own login',
    'solutions-content.compare.keyword.with': 'Keyword intelligence included',
    'solutions-content.compare.indexing.without': 'An indexing plugin plus manual URL submission',
    'solutions-content.compare.indexing.with': 'Automatic indexing',

    'solutions-content.related.eyebrow': 'Related solutions',
    'solutions-content.related.lead': 'Pair content with the rest of the platform.',
    'solutions-content.related.website.desc':
      'Launch a complete website with AI content and your own domain.',
    'solutions-content.related.onlineStore.desc':
      'Sell products with AI-generated descriptions and landing pages.',
    'solutions-content.related.developers.title': 'For Developers',
    'solutions-content.related.developers.desc':
      'Power your own product with the content API.',

    'solutions-content.next.eyebrow': 'Next step',
    'solutions-content.next.title': 'Ready to publish?',
    'solutions-content.next.desc':
      'Pay only for what you use — no subscriptions, no hidden fees. Generate, publish, and rank content from one platform.',
    'solutions-content.next.linkCue': 'Read the content API docs',
    'solutions-content.next.actions.viewPricing': 'View Pricing',
  },
  es: {
    'solutions-content.title': 'API de generación de contenido con IA — Artículos, imágenes y SEO | 1Platform',
    'solutions-content.description':
      'Genera artículos, imágenes, comentarios y landing pages optimizados para SEO con IA. Extrae palabras clave, publica en tu CMS y envía a indexación — todo desde una sola plataforma.',
    'solutions-content.serviceName': 'Generación de contenido con IA',
    'solutions-content.breadcrumb.content': 'Contenido',

    'solutions-content.hero.headline': 'Contenido que se posiciona solo',
    'solutions-content.hero.subheadline':
      'Genera artículos, imágenes y páginas legales optimizados para SEO con IA. Extrae palabras clave, publica en tu CMS y envía a indexación — todo desde una sola plataforma.',
    'solutions-content.hero.cta.primary': 'Empieza a publicar',
    'solutions-content.hero.cta.secondary': 'Ver precios',

    'solutions-content.whatYouGet.eyebrow': 'Lo que obtienes',
    'solutions-content.whatYouGet.lead':
      'Un motor de contenido completo — investigación, generación, publicación e indexación en una sola API.',

    'solutions-content.feature.articles.title': 'Artículos con IA',
    'solutions-content.feature.articles.desc':
      'Artículos optimizados para SEO a partir de una sola palabra clave. Multilingüe, procesamiento asíncrono, calidad humana.',
    'solutions-content.feature.images.title': 'Imágenes con IA',
    'solutions-content.feature.images.desc':
      'Genera imágenes únicas o consíguelas de bancos premium — licencia comercial incluida.',
    'solutions-content.feature.keyword.title': 'Inteligencia de palabras clave',
    'solutions-content.feature.keyword.desc':
      'Extrae palabras clave con volumen, intención y dificultad a partir de cualquier URL o tema.',
    'solutions-content.feature.indexing.title': 'Publica e indexa',
    'solutions-content.feature.indexing.desc':
      'Envía contenido a tu CMS, envía URLs a indexación y construye backlinks — todo desde una sola API.',

    'solutions-content.howItWorks.eyebrow': 'Cómo funciona',
    'solutions-content.howItWorks.lead': 'De la palabra clave al artículo indexado, sin salir de la plataforma.',
    'solutions-content.howItWorks.aria': 'Cómo funciona la generación de contenido, paso a paso',
    'solutions-content.step.extractKeywords': 'Extrae palabras clave',
    'solutions-content.step.generateContent': 'Genera contenido',
    'solutions-content.step.publishCms': 'Publica en tu CMS',
    'solutions-content.step.submitIndexing': 'Envía a indexación',

    'solutions-content.whatItReplaces.eyebrow': 'Lo que reemplaza',
    'solutions-content.whatItReplaces.lead': 'Una plataforma en lugar de herramientas separadas',
    'solutions-content.compare.aiWriting.without': 'Una herramienta de redacción con IA con su propia suscripción',
    'solutions-content.compare.aiWriting.with': 'Contenido con IA integrado',
    'solutions-content.compare.stockImages.without': 'Un banco de imágenes facturado por separado',
    'solutions-content.compare.stockImages.with': 'Imágenes con IA incluidas',
    'solutions-content.compare.keyword.without': 'Una herramienta de investigación de palabras clave con su propio login',
    'solutions-content.compare.keyword.with': 'Inteligencia de palabras clave incluida',
    'solutions-content.compare.indexing.without': 'Un plugin de indexación más envío manual de URLs',
    'solutions-content.compare.indexing.with': 'Indexación automática',

    'solutions-content.related.eyebrow': 'Soluciones relacionadas',
    'solutions-content.related.lead': 'Combina contenido con el resto de la plataforma.',
    'solutions-content.related.website.desc':
      'Lanza un sitio web completo con contenido de IA y tu propio dominio.',
    'solutions-content.related.onlineStore.desc':
      'Vende productos con descripciones y landing pages generadas por IA.',
    'solutions-content.related.developers.title': 'Para desarrolladores',
    'solutions-content.related.developers.desc':
      'Impulsa tu propio producto con la API de contenido.',

    'solutions-content.next.eyebrow': 'Siguiente paso',
    'solutions-content.next.title': '¿Listo para publicar?',
    'solutions-content.next.desc':
      'Paga solo por lo que uses — sin suscripciones, sin cargos ocultos. Genera, publica y posiciona contenido desde una sola plataforma.',
    'solutions-content.next.linkCue': 'Lee la documentación de la API de contenido',
    'solutions-content.next.actions.viewPricing': 'Ver precios',
  },
});
