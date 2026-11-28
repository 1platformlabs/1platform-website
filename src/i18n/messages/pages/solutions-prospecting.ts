import { defineMessages } from '@i18n/ui';

/**
 * Prospecting solution page (epic vertical-prospeccion, PRS-13).
 *
 * The page template carries NO literal copy: every string below is read by key,
 * because a tenant (and the platform itself in API mode) renders this page with
 * its own copy loaded through the API, and `t()` throws on a missing key.
 *
 * Wording rules: never name a provider or a vendor; no prices (the diagnosis
 * price is still undecided); say plainly that a person approves every message
 * and that a goal starts in draft mode, where nothing is sent.
 */
export default defineMessages({
  en: {
    'solutions-prospecting.title': 'Prospecting — Find companies that fit, with every message approved by you | One Platform',
    'solutions-prospecting.description':
      'Describe who you want to reach. Sofia finds companies that fit, researches their sites and prepares a message for each one. You review and approve before anything is sent.',
    'solutions-prospecting.jsonld.areaServed': 'Worldwide',

    'solutions-prospecting.hero.badge': 'Prospecting',
    'solutions-prospecting.hero.headline': 'Find the right companies. You decide what gets sent.',
    'solutions-prospecting.hero.subheadline':
      'Set a goal and Sofia finds companies that fit, researches their sites and prepares a message for each one. Nothing leaves until you approve it.',
    'solutions-prospecting.hero.cta.primary': 'Set up prospecting',
    'solutions-prospecting.hero.cta.secondary': 'See how it works',

    'solutions-prospecting.whatYouGet.eyebrow': 'What you get',
    'solutions-prospecting.whatYouGet.lead':
      'A pipeline that does the research and the first draft, and leaves the decisions to you.',
    'solutions-prospecting.feature.diagnosis.title': 'A reason to write, with its source',
    'solutions-prospecting.feature.diagnosis.desc':
      'Sofia reads each company’s site and notes what is missing, quoting the page where she found it, so every message starts from something real.',
    'solutions-prospecting.feature.review.title': 'A message ready to review',
    'solutions-prospecting.feature.review.desc':
      'Each company gets a short, personal draft. Rules you set, such as length, banned words and allowed links, are checked before you see it.',
    'solutions-prospecting.feature.control.title': 'You approve every message',
    'solutions-prospecting.feature.control.desc':
      'Sofia prepares drafts; she never approves, sends or classifies replies. A person on your team does, one message at a time.',

    'solutions-prospecting.howItWorks.eyebrow': 'How it works',
    'solutions-prospecting.howItWorks.lead': 'Four steps, with you in charge of the last one.',
    'solutions-prospecting.howItWorks.aria': 'Prospecting flow',
    'solutions-prospecting.step.goal': 'Describe who you want to reach and what you offer',
    'solutions-prospecting.step.research': 'Sofia researches companies and prepares drafts',
    'solutions-prospecting.step.review': 'You review, correct and approve each message',
    'solutions-prospecting.step.send': 'Approved messages go out and replies are tracked',

    'solutions-prospecting.guardrails.eyebrow': 'Built-in safeguards',
    'solutions-prospecting.guardrails.title': 'Control stays with your team',
    'solutions-prospecting.guardrails.desc':
      'Prospecting is built so that a mistake costs a rejected draft, not a message to the wrong person.',
    'solutions-prospecting.guardrails.includedLabel': 'Included',
    'solutions-prospecting.guardrails.draft': 'Draft mode: a new goal prepares everything and sends nothing',
    'solutions-prospecting.guardrails.approval': 'Human approval on every message before it is sent',
    'solutions-prospecting.guardrails.optout': 'An opt-out line in every message, honored right away',
    'solutions-prospecting.guardrails.excluded': 'A list of excluded companies that no goal can contact',

    'solutions-prospecting.draftMode.eyebrow': 'Start safely',
    'solutions-prospecting.draftMode.title': 'Try it in draft mode first',
    'solutions-prospecting.draftMode.desc':
      'Every goal begins in draft mode. See the companies Sofia finds and the messages she writes, and decide when you are ready to send.',
    'solutions-prospecting.draftMode.note':
      'Switching a goal to live sending is a deliberate step taken by an administrator. Until then, the worst outcome is a draft you discard.',

    'solutions-prospecting.next.eyebrow': 'Next step',
    'solutions-prospecting.next.title': 'Set your first goal',
    'solutions-prospecting.next.desc':
      'Sign in, describe who you want to reach and review the first drafts from your panel.',
  },
  es: {
    'solutions-prospecting.title': 'Prospección — Encuentra empresas que encajan, con cada mensaje aprobado por ti | One Platform',
    'solutions-prospecting.description':
      'Describe a quién quieres llegar. Sofia encuentra empresas que encajan, investiga sus sitios y prepara un mensaje para cada una. Tú revisas y apruebas antes de que se envíe algo.',
    'solutions-prospecting.jsonld.areaServed': 'Todo el mundo',

    'solutions-prospecting.hero.badge': 'Prospección',
    'solutions-prospecting.hero.headline': 'Encuentra a las empresas correctas. Tú decides qué se envía.',
    'solutions-prospecting.hero.subheadline':
      'Define un objetivo y Sofia encuentra empresas que encajan, investiga sus sitios y prepara un mensaje para cada una. Nada sale hasta que lo apruebes.',
    'solutions-prospecting.hero.cta.primary': 'Configurar prospección',
    'solutions-prospecting.hero.cta.secondary': 'Ver cómo funciona',

    'solutions-prospecting.whatYouGet.eyebrow': 'Qué obtienes',
    'solutions-prospecting.whatYouGet.lead':
      'Un embudo que hace la investigación y el primer borrador, y te deja las decisiones.',
    'solutions-prospecting.feature.diagnosis.title': 'Un motivo para escribir, con su fuente',
    'solutions-prospecting.feature.diagnosis.desc':
      'Sofia lee el sitio de cada empresa y anota qué le falta, citando la página donde lo encontró, así cada mensaje parte de algo real.',
    'solutions-prospecting.feature.review.title': 'Un mensaje listo para revisar',
    'solutions-prospecting.feature.review.desc':
      'Cada empresa recibe un borrador breve y personal. Las reglas que fijas, como largo, palabras prohibidas y enlaces permitidos, se comprueban antes de que lo veas.',
    'solutions-prospecting.feature.control.title': 'Tú apruebas cada mensaje',
    'solutions-prospecting.feature.control.desc':
      'Sofia prepara borradores; nunca aprueba, envía ni clasifica respuestas. Lo hace una persona de tu equipo, mensaje por mensaje.',

    'solutions-prospecting.howItWorks.eyebrow': 'Cómo funciona',
    'solutions-prospecting.howItWorks.lead': 'Cuatro pasos, y el último lo controlas tú.',
    'solutions-prospecting.howItWorks.aria': 'Flujo de prospección',
    'solutions-prospecting.step.goal': 'Describe a quién quieres llegar y qué ofreces',
    'solutions-prospecting.step.research': 'Sofia investiga empresas y prepara borradores',
    'solutions-prospecting.step.review': 'Tú revisas, corriges y apruebas cada mensaje',
    'solutions-prospecting.step.send': 'Los mensajes aprobados salen y se siguen las respuestas',

    'solutions-prospecting.guardrails.eyebrow': 'Salvaguardas incluidas',
    'solutions-prospecting.guardrails.title': 'El control se queda en tu equipo',
    'solutions-prospecting.guardrails.desc':
      'La prospección está hecha para que un error cueste un borrador rechazado, no un mensaje a la persona equivocada.',
    'solutions-prospecting.guardrails.includedLabel': 'Incluido',
    'solutions-prospecting.guardrails.draft': 'Modo borrador: un objetivo nuevo lo prepara todo y no envía nada',
    'solutions-prospecting.guardrails.approval': 'Aprobación humana de cada mensaje antes de enviarlo',
    'solutions-prospecting.guardrails.optout': 'Una línea para darse de baja en cada mensaje, respetada al instante',
    'solutions-prospecting.guardrails.excluded': 'Una lista de empresas excluidas que ningún objetivo puede contactar',

    'solutions-prospecting.draftMode.eyebrow': 'Empieza sin riesgo',
    'solutions-prospecting.draftMode.title': 'Pruébalo primero en modo borrador',
    'solutions-prospecting.draftMode.desc':
      'Todo objetivo empieza en modo borrador. Mira las empresas que encuentra Sofia y los mensajes que escribe, y decide cuándo estás listo para enviar.',
    'solutions-prospecting.draftMode.note':
      'Pasar un objetivo al envío real es un paso deliberado de un administrador. Hasta entonces, lo peor que puede pasar es un borrador que descartas.',

    'solutions-prospecting.next.eyebrow': 'Siguiente paso',
    'solutions-prospecting.next.title': 'Define tu primer objetivo',
    'solutions-prospecting.next.desc':
      'Inicia sesión, describe a quién quieres llegar y revisa los primeros borradores desde tu panel.',
  },
});
