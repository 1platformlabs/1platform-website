import { defineMessages } from '@i18n/ui';

/**
 * The website-and-content solution page.
 *
 * It used to be the content page alone, with `/solutions/website/` beside it.
 * Three of that page's four cards were this one said again — AI content, CMS
 * publishing, and "built for SEO" (keyword intelligence + indexing + link
 * building) — and two of its four comparison rows were these rows, one of them
 * identical on both sides. The single claim it owned, a custom domain, lives
 * here now; its comparison row does not, because `/solutions/online-store/`
 * already carries that row word for word.
 *
 * The Service name and badge stay page-specific rather than reusing
 * `nav.solutions.content`: the menu label has to fit a menu, this one does not.
 * The breadcrumb's third crumb is shorter still, so it gets its own key.
 *
 * The step labels are the product's real sequence, not a tidier one. Two edits
 * they are not allowed to drift back into: the domain is a hard prerequisite
 * that the site is raised on — the API rejects provisioning with 422
 * DOMAIN_NOT_VERIFIED — and nothing here promises a one-click submit to
 * indexing, because the WordPress plugin never calls that endpoint and the API
 * route needs the property verified in Search Console first.
 */
export default defineMessages({
  en: {
    'solutions-content.title':
      'Website with AI content, your own domain and SEO | 1Platform',
    'solutions-content.description':
      'Register a domain, get a site raised on it, and fill it with SEO-optimized articles and images. Keyword research, CMS publishing and internal linking — all from one platform.',
    'solutions-content.serviceName': 'Website & AI content',
    'solutions-content.breadcrumb.content': 'Website & content',

    'solutions-content.hero.headline': 'Your site, with content that ranks itself',
    'solutions-content.hero.subheadline':
      'Register or connect your domain, we raise the site on it, and AI fills it with SEO-optimized articles and images — all from one platform.',
    'solutions-content.hero.cta.primary': 'Start publishing',
    'solutions-content.hero.cta.secondary': 'View pricing',

    'solutions-content.whatYouGet.eyebrow': 'What you get',
    'solutions-content.whatYouGet.lead':
      'A site of your own and the engine that fills it — domain, research, generation and publishing in one API.',

    'solutions-content.feature.domain.title': 'The domain comes first',
    'solutions-content.feature.domain.desc':
      'It starts with a domain of your own — register one here or bring the one you already have and verify it. The site goes up on that, never on a borrowed address.',
    'solutions-content.feature.site.title': 'The site, raised for you',
    'solutions-content.feature.site.desc':
      'Choose what it is — a content site, a storefront, or WordPress — and it goes up on your domain: DNS, routing, media CDN and mail.',
    'solutions-content.feature.articles.title': 'AI articles',
    'solutions-content.feature.articles.desc':
      'SEO-optimized articles from a single keyword. Multi-language, async pipeline, human-grade quality.',
    'solutions-content.feature.images.title': 'AI images',
    'solutions-content.feature.images.desc':
      'Generate original images or pull them from premium libraries — commercial licence included.',
    'solutions-content.feature.keyword.title': 'Keyword intelligence',
    'solutions-content.feature.keyword.desc':
      'Extract keywords with volume, intent and difficulty from any URL or topic.',
    'solutions-content.feature.publishing.title': 'Publishing that finishes the job',
    'solutions-content.feature.publishing.desc':
      'Articles land in your CMS already illustrated, categorised and linked to the rest of your site. Verify the property in Search Console and you can push URLs for indexing from the same API.',

    'solutions-content.howItWorks.eyebrow': 'How it works',
    'solutions-content.howItWorks.lead':
      'From a domain to a published article, without leaving the platform.',
    'solutions-content.howItWorks.aria': 'From domain to published article, step by step',
    'solutions-content.step.domain': 'Register or connect your domain',
    'solutions-content.step.chooseKind': 'Choose what the site is',
    'solutions-content.step.raise': 'We raise it on your domain',
    'solutions-content.step.extractKeywords': 'Extract your keywords',
    'solutions-content.step.generateContent': 'Generate the article and its images',
    'solutions-content.step.publishCms': 'It publishes and links itself',

    'solutions-content.whatItReplaces.eyebrow': 'What it replaces',
    'solutions-content.whatItReplaces.lead': 'One platform instead of separate tools',
    'solutions-content.compare.aiWriting.without': 'An AI writing tool on its own subscription',
    'solutions-content.compare.aiWriting.with': 'AI content built in',
    'solutions-content.compare.stockImages.without': 'A stock image library billed separately',
    'solutions-content.compare.stockImages.with': 'AI images included',
    'solutions-content.compare.keyword.without': 'A keyword research tool with its own login',
    'solutions-content.compare.keyword.with': 'Keyword intelligence included',
    'solutions-content.compare.indexing.without': 'An indexing plugin plus manual URL submission',
    'solutions-content.compare.indexing.with': 'Indexing from the same API',

    'solutions-content.related.eyebrow': 'Related solutions',
    'solutions-content.related.lead': 'Pair your site with the rest of the platform.',
    'solutions-content.related.onlineStore.desc':
      'Sell products with AI-generated descriptions and landing pages.',
    'solutions-content.related.ads.desc':
      'Bring buyers to what you published, with campaigns run from the same platform.',
    'solutions-content.related.developers.title': 'For Developers',
    'solutions-content.related.developers.desc':
      'Power your own product with the content API.',

    'solutions-content.next.eyebrow': 'Next step',
    'solutions-content.next.title': 'Ready to publish?',
    'solutions-content.next.desc':
      'Pay only for what you use — no subscriptions, no hidden fees. Your domain, your site on it, and the content that fills it, from one platform.',
    'solutions-content.next.linkCue': 'Read the content API docs',
    'solutions-content.next.actions.viewPricing': 'View pricing',
  },
  es: {
    'solutions-content.title':
      'Sitio web con contenido de IA, dominio propio y SEO | 1Platform',
    'solutions-content.description':
      'Registra un dominio, levantamos el sitio sobre él y lo llenas con artículos e imágenes optimizados para SEO. Palabras clave, publicación en tu CMS y enlazado interno — todo desde una sola plataforma.',
    'solutions-content.serviceName': 'Sitio web y contenido con IA',
    'solutions-content.breadcrumb.content': 'Sitio web y contenido',

    'solutions-content.hero.headline': 'Tu sitio, con contenido que se posiciona solo',
    'solutions-content.hero.subheadline':
      'Registra o conecta tu dominio, levantamos el sitio sobre él y la IA lo llena con artículos e imágenes optimizados para SEO — todo desde una sola plataforma.',
    'solutions-content.hero.cta.primary': 'Empieza a publicar',
    'solutions-content.hero.cta.secondary': 'Ver precios',

    'solutions-content.whatYouGet.eyebrow': 'Lo que obtienes',
    'solutions-content.whatYouGet.lead':
      'Un sitio propio y el motor que lo llena — dominio, investigación, generación y publicación en una sola API.',

    'solutions-content.feature.domain.title': 'El dominio va primero',
    'solutions-content.feature.domain.desc':
      'Todo empieza por un dominio tuyo: regístralo aquí o trae el que ya tienes y verifícalo. El sitio se levanta sobre ese, nunca sobre una dirección prestada.',
    'solutions-content.feature.site.title': 'El sitio, levantado por ti',
    'solutions-content.feature.site.desc':
      'Elige qué es —un sitio de contenido, una tienda o WordPress— y sube sobre tu dominio: DNS, enrutamiento, CDN de medios y correo.',
    'solutions-content.feature.articles.title': 'Artículos con IA',
    'solutions-content.feature.articles.desc':
      'Artículos optimizados para SEO a partir de una sola palabra clave. Multilingüe, procesamiento asíncrono, calidad humana.',
    'solutions-content.feature.images.title': 'Imágenes con IA',
    'solutions-content.feature.images.desc':
      'Genera imágenes únicas o consíguelas de bancos premium — licencia comercial incluida.',
    'solutions-content.feature.keyword.title': 'Inteligencia de palabras clave',
    'solutions-content.feature.keyword.desc':
      'Extrae palabras clave con volumen, intención y dificultad a partir de cualquier URL o tema.',
    'solutions-content.feature.publishing.title': 'Publicación que termina el trabajo',
    'solutions-content.feature.publishing.desc':
      'Los artículos llegan a tu CMS ya ilustrados, categorizados y enlazados con el resto de tu sitio. Verifica la propiedad en Search Console y podrás enviar URLs a indexación desde la misma API.',

    'solutions-content.howItWorks.eyebrow': 'Cómo funciona',
    'solutions-content.howItWorks.lead':
      'Del dominio al artículo publicado, sin salir de la plataforma.',
    'solutions-content.howItWorks.aria': 'Del dominio al artículo publicado, paso a paso',
    'solutions-content.step.domain': 'Registra o conecta tu dominio',
    'solutions-content.step.chooseKind': 'Elige qué es el sitio',
    'solutions-content.step.raise': 'Lo levantamos sobre tu dominio',
    'solutions-content.step.extractKeywords': 'Extrae tus palabras clave',
    'solutions-content.step.generateContent': 'Genera el artículo y sus imágenes',
    'solutions-content.step.publishCms': 'Se publica y se enlaza solo',

    'solutions-content.whatItReplaces.eyebrow': 'Lo que reemplaza',
    'solutions-content.whatItReplaces.lead': 'Una plataforma en lugar de herramientas separadas',
    'solutions-content.compare.aiWriting.without': 'Una herramienta de redacción con IA con su propia suscripción',
    'solutions-content.compare.aiWriting.with': 'Contenido con IA integrado',
    'solutions-content.compare.stockImages.without': 'Un banco de imágenes facturado por separado',
    'solutions-content.compare.stockImages.with': 'Imágenes con IA incluidas',
    'solutions-content.compare.keyword.without': 'Una herramienta de investigación de palabras clave con su propio login',
    'solutions-content.compare.keyword.with': 'Inteligencia de palabras clave incluida',
    'solutions-content.compare.indexing.without': 'Un plugin de indexación más envío manual de URLs',
    'solutions-content.compare.indexing.with': 'Indexación desde la misma API',

    'solutions-content.related.eyebrow': 'Soluciones relacionadas',
    'solutions-content.related.lead': 'Combina tu sitio con el resto de la plataforma.',
    'solutions-content.related.onlineStore.desc':
      'Vende productos con descripciones y landing pages generadas por IA.',
    'solutions-content.related.ads.desc':
      'Trae compradores a lo que publicaste, con campañas desde la misma plataforma.',
    'solutions-content.related.developers.title': 'Para desarrolladores',
    'solutions-content.related.developers.desc':
      'Impulsa tu propio producto con la API de contenido.',

    'solutions-content.next.eyebrow': 'Siguiente paso',
    'solutions-content.next.title': '¿Listo para publicar?',
    'solutions-content.next.desc':
      'Paga solo por lo que uses — sin suscripciones, sin cargos ocultos. Tu dominio, tu sitio sobre él y el contenido que lo llena, desde una sola plataforma.',
    'solutions-content.next.linkCue': 'Lee la documentación de la API de contenido',
    'solutions-content.next.actions.viewPricing': 'Ver precios',
  },
});
