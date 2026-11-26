import { defineMessages } from '@i18n/ui';

/**
 * Growth solution page (epic vertical-crecimiento, VCR-10 · issue #205).
 *
 * The page template carries NO literal copy: every string below is read by key,
 * because a tenant (and the platform itself in API mode) renders this page with
 * its own copy loaded through the API, and `t()` throws on a missing key.
 *
 * Wording rules: never name a provider or a vendor; no prices, no figures and no
 * claims about results (networks can remove followers or interactions, and the
 * page says so); describe only what the panel's Growth section does today.
 */
export default defineMessages({
  en: {
    'solutions-growth.title': 'Growth — Reach for your profiles and sites, paid from your balance | One Platform',
    'solutions-growth.description':
      'Order followers, views and comments for your social profiles, or links, press articles and voice-overs made by our team, for profiles and sites you have verified.',
    'solutions-growth.jsonld.areaServed': 'Worldwide',

    'solutions-growth.hero.badge': 'Growth',
    'solutions-growth.hero.headline': 'Order reach for your profiles and sites from the same panel.',
    'solutions-growth.hero.subheadline':
      'Social services for the networks you already use, and made-to-order work by our team: links, press articles and voice-overs. You see the total before paying, and only profiles and sites you have verified can receive an order.',
    'solutions-growth.hero.cta.primary': 'Place an order',
    'solutions-growth.hero.cta.secondary': 'See how it works',

    'solutions-growth.whatYouGet.eyebrow': 'What you get',
    'solutions-growth.whatYouGet.lead':
      'One catalog, one balance and one place to follow every order, instead of separate sellers for each network.',
    'solutions-growth.feature.social.title': 'Social services',
    'solutions-growth.feature.social.desc':
      'Pick a network and a service, choose the quantity and see the total. They are paid when you order, and whatever is not delivered goes back to your balance.',
    'solutions-growth.feature.custom.title': 'Made to order',
    'solutions-growth.feature.custom.desc':
      'Links on your site, press articles and voice-overs made by our team. The amount is reserved and charged only when you accept the delivery.',
    'solutions-growth.feature.destinations.title': 'Verified profiles and sites',
    'solutions-growth.feature.destinations.desc':
      'Accounts you connected in Social and your own sites are ready to use. Any other profile is verified with a code you paste in its bio.',

    'solutions-growth.howItWorks.eyebrow': 'How it works',
    'solutions-growth.howItWorks.lead': 'Four steps, from the catalog to the accepted delivery.',
    'solutions-growth.howItWorks.aria': 'Order flow',
    'solutions-growth.step.choose': 'Choose a service from the catalog',
    'solutions-growth.step.destination': 'Pick a verified profile or site',
    'solutions-growth.step.pay': 'Review the total and pay from your balance',
    'solutions-growth.step.follow': 'Follow the order and accept the delivery',

    'solutions-growth.guardrails.eyebrow': 'What protects you',
    'solutions-growth.guardrails.title': 'Every order follows clear rules',
    'solutions-growth.guardrails.desc':
      'You know what you pay before confirming, and made-to-order work is not charged until you accept it or the review window ends.',
    'solutions-growth.guardrails.includedLabel': 'Included',
    'solutions-growth.guardrails.total': 'The total before paying, with nothing charged until you confirm',
    'solutions-growth.guardrails.comments': 'Comments reviewed by our team before they are posted',
    'solutions-growth.guardrails.sponsored': 'Press and guest articles always marked as sponsored',
    'solutions-growth.guardrails.changes': 'Change requests and problem reports on made-to-order work',

    'solutions-growth.honest.eyebrow': 'Good to know',
    'solutions-growth.honest.title': 'Clear about what each service includes',
    'solutions-growth.honest.desc':
      'Each service shows its delivery time, the quantity you can order and whether it includes a refill window. You can cancel an order before it starts and get your balance back.',
    'solutions-growth.honest.note':
      'Networks can remove followers or interactions over time. Services with a refill window let you ask for a free refill while the window is open.',

    'solutions-growth.next.eyebrow': 'Next step',
    'solutions-growth.next.title': 'Place your first order',
    'solutions-growth.next.desc':
      'Sign in, open Growth in your panel and pick a service. Integrators can also place and follow orders through the API.',
  },
  es: {
    'solutions-growth.title': 'Crecimiento — Alcance para tus perfiles y sitios, pagado con tu saldo | One Platform',
    'solutions-growth.description':
      'Pide seguidores, reproducciones y comentarios para tus perfiles en redes, o enlaces, notas de prensa y locuciones hechos por nuestro equipo, para perfiles y sitios que verificaste.',
    'solutions-growth.jsonld.areaServed': 'Todo el mundo',

    'solutions-growth.hero.badge': 'Crecimiento',
    'solutions-growth.hero.headline': 'Pide alcance para tus perfiles y sitios desde el mismo panel.',
    'solutions-growth.hero.subheadline':
      'Servicios para las redes que ya usas y encargos hechos por nuestro equipo: enlaces, notas de prensa y locuciones. Ves el total antes de pagar, y sólo los perfiles y sitios que verificaste pueden recibir un pedido.',
    'solutions-growth.hero.cta.primary': 'Hacer un pedido',
    'solutions-growth.hero.cta.secondary': 'Ver cómo funciona',

    'solutions-growth.whatYouGet.eyebrow': 'Qué obtienes',
    'solutions-growth.whatYouGet.lead':
      'Un catálogo, un saldo y un solo lugar para seguir cada pedido, en vez de un proveedor distinto para cada red.',
    'solutions-growth.feature.social.title': 'Servicios de redes',
    'solutions-growth.feature.social.desc':
      'Elige la red y el servicio, define la cantidad y mira el total. Se pagan al pedir, y lo que no se entrega vuelve a tu saldo.',
    'solutions-growth.feature.custom.title': 'Por encargo',
    'solutions-growth.feature.custom.desc':
      'Enlaces en tu sitio, notas de prensa y locuciones hechos por nuestro equipo. El monto se reserva y se cobra sólo cuando aceptas la entrega.',
    'solutions-growth.feature.destinations.title': 'Perfiles y sitios verificados',
    'solutions-growth.feature.destinations.desc':
      'Las cuentas que conectaste en Redes y tus propios sitios ya están listos. Cualquier otro perfil se verifica con un código que pegas en su biografía.',

    'solutions-growth.howItWorks.eyebrow': 'Cómo funciona',
    'solutions-growth.howItWorks.lead': 'Cuatro pasos, del catálogo a la entrega aceptada.',
    'solutions-growth.howItWorks.aria': 'Flujo de un pedido',
    'solutions-growth.step.choose': 'Elige un servicio del catálogo',
    'solutions-growth.step.destination': 'Elige un perfil o sitio verificado',
    'solutions-growth.step.pay': 'Revisa el total y paga con tu saldo',
    'solutions-growth.step.follow': 'Sigue el pedido y acepta la entrega',

    'solutions-growth.guardrails.eyebrow': 'Qué te protege',
    'solutions-growth.guardrails.title': 'Cada pedido sigue reglas claras',
    'solutions-growth.guardrails.desc':
      'Sabes cuánto pagas antes de confirmar, y un encargo no se cobra hasta que lo aceptas o termina el plazo de revisión.',
    'solutions-growth.guardrails.includedLabel': 'Incluido',
    'solutions-growth.guardrails.total': 'El total antes de pagar, sin cobrar nada hasta que confirmas',
    'solutions-growth.guardrails.comments': 'Comentarios revisados por nuestro equipo antes de publicarse',
    'solutions-growth.guardrails.sponsored': 'Notas de prensa y artículos invitados siempre identificados como patrocinados',
    'solutions-growth.guardrails.changes': 'Pedidos de cambios y reportes de problemas en los encargos',

    'solutions-growth.honest.eyebrow': 'Bueno saber',
    'solutions-growth.honest.title': 'Claro sobre lo que incluye cada servicio',
    'solutions-growth.honest.desc':
      'Cada servicio muestra su tiempo de entrega, la cantidad que puedes pedir y si incluye un plazo de reposición. Puedes cancelar un pedido antes de que empiece y recuperar tu saldo.',
    'solutions-growth.honest.note':
      'Las redes pueden retirar seguidores o interacciones con el tiempo. Los servicios con plazo de reposición te dejan pedir una reposición sin costo mientras el plazo está abierto.',

    'solutions-growth.next.eyebrow': 'Siguiente paso',
    'solutions-growth.next.title': 'Haz tu primer pedido',
    'solutions-growth.next.desc':
      'Inicia sesión, abre Crecimiento en tu panel y elige un servicio. Los integradores también pueden hacer y seguir pedidos por la API.',
  },
});
