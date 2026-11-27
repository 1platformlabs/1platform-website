import { defineMessages } from '@i18n/ui';

/**
 * Knowledge base solution page (epic rag-en-agentes, RAG-09).
 *
 * The page template carries NO literal copy: every string below is read by key,
 * because a tenant (and the platform itself in API mode) renders this page with
 * its own copy loaded through the API, and `t()` throws on a missing key.
 *
 * Wording rules: never name a provider or a vendor; no prices, no figures and no
 * claims about results; describe only what the knowledge base does today. The
 * vocabulary (sources, public/internal, cite) is the panel's own, so a visitor
 * meets the same words after signing in.
 */
export default defineMessages({
  en: {
    'solutions-knowledge-base.title': 'Knowledge base — Agents that answer with your own information | One Platform',
    'solutions-knowledge-base.description':
      'Give your agents your documents, FAQs and site pages. They search them before answering, cite where each answer came from and keep internal files away from customers.',
    'solutions-knowledge-base.jsonld.areaServed': 'Worldwide',

    'solutions-knowledge-base.hero.badge': 'Knowledge base',
    'solutions-knowledge-base.hero.headline': 'Your agents answer with what your business knows.',
    'solutions-knowledge-base.hero.subheadline':
      'Upload your documents and keep your FAQs and site pages in sync. Your agents search them before they reply and say where each answer came from.',
    'solutions-knowledge-base.hero.cta.primary': 'Set up my knowledge base',
    'solutions-knowledge-base.hero.cta.secondary': 'See how it works',

    'solutions-knowledge-base.whatYouGet.eyebrow': 'What you get',
    'solutions-knowledge-base.whatYouGet.lead':
      'One knowledge base per workspace, shared by every agent you turn it on for.',
    'solutions-knowledge-base.feature.documents.title': 'Your documents',
    'solutions-knowledge-base.feature.documents.desc':
      'Upload PDF, DOCX, TXT or Markdown files, such as price lists, policies or manuals, and give each one the title your agents will cite.',
    'solutions-knowledge-base.feature.sync.title': 'FAQs and sites kept in sync',
    'solutions-knowledge-base.feature.sync.desc':
      'Turn on the sync and the questions you have published, plus the pages and blog posts of your own sites, stay up to date without copying anything.',
    'solutions-knowledge-base.feature.cited.title': 'Answers with their source',
    'solutions-knowledge-base.feature.cited.desc':
      'Before replying, the agent searches your knowledge base and names the document, question or page each answer comes from.',

    'solutions-knowledge-base.howItWorks.eyebrow': 'How it works',
    'solutions-knowledge-base.howItWorks.lead': 'Four steps, from your files to an answer your customer can trust.',
    'solutions-knowledge-base.howItWorks.aria': 'Knowledge base flow',
    'solutions-knowledge-base.step.add': 'Upload documents or turn on the sync',
    'solutions-knowledge-base.step.audience': 'Mark each document as public or internal',
    'solutions-knowledge-base.step.enable': 'Turn the knowledge base on for your agents',
    'solutions-knowledge-base.step.answer': 'Your agents search it and cite the source',

    'solutions-knowledge-base.audience.eyebrow': 'Who reads what',
    'solutions-knowledge-base.audience.title': 'Internal stays internal',
    'solutions-knowledge-base.audience.desc':
      'Every source is public or internal. Agents that talk to customers and prospects only read public sources, and that filter is applied on the server, not left to the agent.',
    'solutions-knowledge-base.audience.includedLabel': 'Included',
    'solutions-knowledge-base.audience.public': 'Public sources your agents can quote to customers',
    'solutions-knowledge-base.audience.internal': 'Internal sources only your team’s agents can read',
    'solutions-knowledge-base.audience.faqs': 'Published FAQs and site pages, always public',
    'solutions-knowledge-base.audience.lifecycle': 'Reindex or delete any source whenever you need to',

    'solutions-knowledge-base.usage.eyebrow': 'What you pay for',
    'solutions-knowledge-base.usage.title': 'Pay for what you index and what you search',
    'solutions-knowledge-base.usage.desc':
      'Indexing a document and each search are charged from your workspace balance. Agents that do not use the knowledge base keep working exactly as before.',
    'solutions-knowledge-base.usage.note':
      'You can try a search from your panel before turning it on for an agent. That test search is charged like any other.',

    'solutions-knowledge-base.next.eyebrow': 'Next step',
    'solutions-knowledge-base.next.title': 'Set up your knowledge base',
    'solutions-knowledge-base.next.desc':
      'Sign in, open Knowledge base in your panel and upload your first document. Integrators can also manage sources and search through the API.',
  },
  es: {
    'solutions-knowledge-base.title': 'Base de conocimiento — Agentes que responden con tu propia información | One Platform',
    'solutions-knowledge-base.description':
      'Dale a tus agentes tus documentos, preguntas frecuentes y páginas de tus sitios. Los consultan antes de responder, citan de dónde salió cada respuesta y no muestran lo interno a tus clientes.',
    'solutions-knowledge-base.jsonld.areaServed': 'Todo el mundo',

    'solutions-knowledge-base.hero.badge': 'Base de conocimiento',
    'solutions-knowledge-base.hero.headline': 'Tus agentes responden con lo que sabe tu negocio.',
    'solutions-knowledge-base.hero.subheadline':
      'Sube tus documentos y mantén al día tus preguntas frecuentes y las páginas de tus sitios. Tus agentes los consultan antes de responder y dicen de dónde salió cada respuesta.',
    'solutions-knowledge-base.hero.cta.primary': 'Configurar mi base de conocimiento',
    'solutions-knowledge-base.hero.cta.secondary': 'Ver cómo funciona',

    'solutions-knowledge-base.whatYouGet.eyebrow': 'Qué obtienes',
    'solutions-knowledge-base.whatYouGet.lead':
      'Una base de conocimiento por espacio de trabajo, compartida por cada agente al que se la actives.',
    'solutions-knowledge-base.feature.documents.title': 'Tus documentos',
    'solutions-knowledge-base.feature.documents.desc':
      'Sube archivos PDF, DOCX, TXT o Markdown, como listas de precios, políticas o manuales, y ponle a cada uno el título con el que tus agentes lo van a citar.',
    'solutions-knowledge-base.feature.sync.title': 'Preguntas frecuentes y sitios al día',
    'solutions-knowledge-base.feature.sync.desc':
      'Activa la sincronización y las preguntas que has publicado, junto con las páginas y artículos del blog de tus sitios propios, se mantienen al día sin copiar nada.',
    'solutions-knowledge-base.feature.cited.title': 'Respuestas con su fuente',
    'solutions-knowledge-base.feature.cited.desc':
      'Antes de responder, el agente busca en tu base de conocimiento y nombra el documento, la pregunta o la página de donde sale cada respuesta.',

    'solutions-knowledge-base.howItWorks.eyebrow': 'Cómo funciona',
    'solutions-knowledge-base.howItWorks.lead': 'Cuatro pasos, de tus archivos a una respuesta en la que tu cliente puede confiar.',
    'solutions-knowledge-base.howItWorks.aria': 'Flujo de la base de conocimiento',
    'solutions-knowledge-base.step.add': 'Sube documentos o activa la sincronización',
    'solutions-knowledge-base.step.audience': 'Marca cada documento como público o interno',
    'solutions-knowledge-base.step.enable': 'Activa la base de conocimiento en tus agentes',
    'solutions-knowledge-base.step.answer': 'Tus agentes la consultan y citan la fuente',

    'solutions-knowledge-base.audience.eyebrow': 'Quién lee qué',
    'solutions-knowledge-base.audience.title': 'Lo interno se queda adentro',
    'solutions-knowledge-base.audience.desc':
      'Cada fuente es pública o interna. Los agentes que conversan con clientes y prospectos sólo leen fuentes públicas, y ese filtro lo aplica el servidor, no queda a criterio del agente.',
    'solutions-knowledge-base.audience.includedLabel': 'Incluido',
    'solutions-knowledge-base.audience.public': 'Fuentes públicas que tus agentes pueden citar a tus clientes',
    'solutions-knowledge-base.audience.internal': 'Fuentes internas que sólo leen los agentes de tu equipo',
    'solutions-knowledge-base.audience.faqs': 'Preguntas frecuentes y páginas publicadas, siempre públicas',
    'solutions-knowledge-base.audience.lifecycle': 'Reindexa o elimina cualquier fuente cuando lo necesites',

    'solutions-knowledge-base.usage.eyebrow': 'Qué pagas',
    'solutions-knowledge-base.usage.title': 'Pagas por lo que indexas y por lo que buscas',
    'solutions-knowledge-base.usage.desc':
      'Indexar un documento y cada búsqueda se cobran de tu saldo del espacio de trabajo. Los agentes que no usan la base de conocimiento siguen funcionando exactamente igual.',
    'solutions-knowledge-base.usage.note':
      'Puedes probar una búsqueda desde tu panel antes de activarla en un agente. Esa búsqueda de prueba se cobra como cualquier otra.',

    'solutions-knowledge-base.next.eyebrow': 'Siguiente paso',
    'solutions-knowledge-base.next.title': 'Configura tu base de conocimiento',
    'solutions-knowledge-base.next.desc':
      'Inicia sesión, abre Base de conocimiento en tu panel y sube tu primer documento. Los integradores también pueden gestionar las fuentes y buscar por API.',
  },
});
