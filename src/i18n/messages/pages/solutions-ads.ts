import { defineMessages } from '@i18n/ui';

/**
 * Advertising solution page.
 *
 * Two things this copy must not do, both measured against production:
 *
 *  - Name the advertising network. The persisted config value is neutral on
 *    purpose because `App.config` is served verbatim to tenant admins, so the
 *    brand would leak through the admin API. The site says "the brand your ads
 *    are published as", which is the register the server already uses.
 *  - Promise an instant refund. Closing "stops delivery and lowers the account
 *    spend cap, then waits: the remainder is returned once the network's spend
 *    figure stops moving (its metrics keep updating for days). Nothing is
 *    credited here."
 *
 * And the distinction from Ad Revenue Tracking is drawn on PREREQUISITES, not
 * on "spend versus earn". Both are "connect an account, watch the numbers";
 * what actually separates them is that revenue tracking needs a registered
 * site, and campaigns need balance plus the vertical switched on for the
 * workspace by platform staff.
 */
export default defineMessages({
  en: {
    'solutions-ads.title': 'Advertising Campaigns — Run Paid Ads From Your Balance | 1Platform',
    'solutions-ads.description':
      'Connect the brand your ads publish as, build a campaign, fund it from your workspace balance, and get back whatever was not spent when it closes.',
    'solutions-ads.jsonld.areaServed': 'Worldwide',

    'solutions-ads.hero.headline': 'Advertise from the balance you already have',
    'solutions-ads.hero.subheadline':
      'Build a campaign, fund it from your workspace balance, and read its results in the same dashboard you invoice from. What you do not spend comes back.',
    'solutions-ads.hero.badge': 'Advertising Campaigns',
    'solutions-ads.hero.cta.secondary': 'See Pricing',

    'solutions-ads.whatYouGet.eyebrow': 'What you get',
    'solutions-ads.whatYouGet.lead':
      'Four steps between deciding to advertise and seeing what it did.',

    'solutions-ads.feature.connect.title': 'Connect your brand',
    'solutions-ads.feature.connect.desc':
      'Authorise the brand your ads are published as. You choose which one, you grant the access, and you can disconnect it whenever you want.',
    'solutions-ads.feature.build.title': 'Build the campaign',
    'solutions-ads.feature.build.desc':
      'Pick an objective from the catalogue, write the campaign, and keep it as a draft until it reads the way you want.',
    'solutions-ads.feature.fund.title': 'Fund it from your balance',
    'solutions-ads.feature.fund.desc':
      'Add budget from the workspace balance. Funding is protected against double charges, so a retry on a slow connection cannot debit you twice.',
    'solutions-ads.feature.results.title': 'Read the results',
    'solutions-ads.feature.results.desc':
      'Spend and results come back with the age of the data attached, so you know how fresh the figure you are looking at actually is.',

    'solutions-ads.balance.eyebrow': 'Where the money comes from',
    'solutions-ads.balance.title': 'Your balance, not a second card',
    'solutions-ads.balance.desc':
      'A campaign is funded from the same workspace balance you use for the rest of the platform. There is no separate billing relationship to set up and no second invoice to reconcile.',
    'solutions-ads.balance.settlement':
      'When you close a campaign, delivery stops and the spend ceiling comes down straight away. The unspent remainder is returned once the reported spend settles, which is not the same instant: those figures keep moving for days after a campaign ends, and paying the difference back early would mean paying it twice.',
    'solutions-ads.balance.limits':
      'The funding range, the campaign quota and the settlement window that apply are the ones set for your workspace, and the platform reports them to you rather than hiding them in a form.',

    'solutions-ads.vsRevenue.eyebrow': 'Not the same thing',
    'solutions-ads.vsRevenue.title': 'This is not ad revenue tracking',
    'solutions-ads.vsRevenue.desc':
      'The platform already offers ad revenue tracking, and the two look alike from a distance: both connect an account and show you numbers. The difference is what each one needs before it can do anything at all.',
    'solutions-ads.vsRevenue.thisOne':
      'Campaigns need a balance to spend and the capability switched on for your workspace by our team. It is opt-in, and money leaves.',
    'solutions-ads.vsRevenue.otherOne':
      'Revenue tracking needs a site you have already registered on the platform, and reports what that site earned. Nothing is spent and nothing is opted into.',
    'solutions-ads.vsRevenue.linkCue': 'See ad revenue tracking',

    'solutions-ads.availability.eyebrow': 'Availability',
    'solutions-ads.availability.title': 'Switched on per workspace',
    'solutions-ads.availability.desc':
      'Advertising does not arrive turned on with a new account. Our team enables it for a workspace, which is why you will not find it in the dashboard until it has been. If you want it, ask and we will turn it on.',

    'solutions-ads.whatItReplaces.eyebrow': 'What it replaces',
    'solutions-ads.whatItReplaces.lead': 'The detour advertising usually takes.',
    'solutions-ads.compare.billing.without': 'A second billing relationship, with its own card and invoice',
    'solutions-ads.compare.billing.with': 'Budget taken from the balance you already fund',
    'solutions-ads.compare.retry.without': 'A retry on a slow connection charging the budget twice',
    'solutions-ads.compare.retry.with': 'Funding that recognises the same intent and charges once',
    'solutions-ads.compare.leftover.without': 'Whatever you did not spend left sitting somewhere else',
    'solutions-ads.compare.leftover.with': 'The remainder returned to your balance after settlement',
    'solutions-ads.compare.reporting.without': 'Numbers copied between one console and your books',
    'solutions-ads.compare.reporting.with': 'Spend and results beside the rest of your account',

    'solutions-ads.howItWorks.eyebrow': 'How it works',
    'solutions-ads.howItWorks.lead': 'Draft, publish, pause, close.',
    'solutions-ads.howItWorks.aria': 'Campaign lifecycle',
    'solutions-ads.step.connect': 'Connect the brand',
    'solutions-ads.step.draft': 'Draft the campaign',
    'solutions-ads.step.fund': 'Fund it',
    'solutions-ads.step.publish': 'Publish it',
    'solutions-ads.step.close': 'Close and settle',

    'solutions-ads.related.eyebrow': 'Related',
    'solutions-ads.related.lead': 'What advertising usually sits next to.',
    'solutions-ads.related.content.title': 'AI Content',
    'solutions-ads.related.content.desc':
      'Write what the campaign points at before you pay to send people to it.',
    'solutions-ads.related.payments.desc':
      'Fund the balance a campaign spends from, and invoice what the campaign sells.',
    'solutions-ads.related.developers.title': 'For developers',
    'solutions-ads.related.developers.desc':
      'The advertising reference, plus ad revenue tracking, in the API documentation.',

    'solutions-ads.next.eyebrow': 'Next step',
    'solutions-ads.next.title': 'Ask us to switch it on',
    'solutions-ads.next.desc':
      'Advertising is enabled per workspace. Tell us which one, and it appears in your dashboard alongside everything else.',
    'solutions-ads.next.linkCue': 'Read the advertising reference',
    'solutions-ads.next.actions.contact': 'Contact us',
  },

  es: {
    'solutions-ads.title': 'Campañas publicitarias — Anúnciate con tu saldo | 1Platform',
    'solutions-ads.description':
      'Conecta la marca con la que se publican tus anuncios, arma una campaña, fondéala con el saldo de tu espacio de trabajo y recupera lo que no se gastó cuando cierra.',
    'solutions-ads.jsonld.areaServed': 'Global',

    'solutions-ads.hero.headline': 'Anúnciate con el saldo que ya tienes',
    'solutions-ads.hero.subheadline':
      'Arma una campaña, fondéala con el saldo de tu espacio de trabajo y lee sus resultados en el mismo panel desde el que facturas. Lo que no gastas vuelve.',
    'solutions-ads.hero.badge': 'Campañas publicitarias',
    'solutions-ads.hero.cta.secondary': 'Ver precios',

    'solutions-ads.whatYouGet.eyebrow': 'Qué obtienes',
    'solutions-ads.whatYouGet.lead':
      'Cuatro pasos entre decidir anunciarte y ver qué resultó.',

    'solutions-ads.feature.connect.title': 'Conecta tu marca',
    'solutions-ads.feature.connect.desc':
      'Autoriza la marca con la que se publican tus anuncios. Tú eliges cuál, tú otorgas el acceso, y puedes desconectarla cuando quieras.',
    'solutions-ads.feature.build.title': 'Arma la campaña',
    'solutions-ads.feature.build.desc':
      'Elige un objetivo del catálogo, escribe la campaña y déjala como borrador hasta que diga lo que quieres decir.',
    'solutions-ads.feature.fund.title': 'Fondéala con tu saldo',
    'solutions-ads.feature.fund.desc':
      'Agrega presupuesto desde el saldo del espacio de trabajo. El fondeo está protegido contra cobros dobles, así que un reintento en una conexión lenta no puede debitarte dos veces.',
    'solutions-ads.feature.results.title': 'Lee los resultados',
    'solutions-ads.feature.results.desc':
      'El gasto y los resultados vuelven con la antigüedad del dato incluida, para que sepas qué tan fresca es la cifra que estás mirando.',

    'solutions-ads.balance.eyebrow': 'De dónde sale el dinero',
    'solutions-ads.balance.title': 'Tu saldo, no una segunda tarjeta',
    'solutions-ads.balance.desc':
      'Una campaña se fondea con el mismo saldo del espacio de trabajo que usas para el resto de la plataforma. No hay una relación de cobro aparte que dar de alta ni una segunda factura que conciliar.',
    'solutions-ads.balance.settlement':
      'Cuando cierras una campaña, la entrega se detiene y el tope de gasto baja de inmediato. El remanente no gastado se devuelve una vez que el gasto reportado se concilia, que no es el mismo instante: esas cifras se siguen moviendo durante días después de que una campaña termina, y devolver la diferencia antes significaría devolverla dos veces.',
    'solutions-ads.balance.limits':
      'El rango de fondeo, el cupo de campañas y la ventana de conciliación que aplican son los definidos para tu espacio de trabajo, y la plataforma te los informa en vez de esconderlos dentro de un formulario.',

    'solutions-ads.vsRevenue.eyebrow': 'No es lo mismo',
    'solutions-ads.vsRevenue.title': 'Esto no es seguimiento de ingresos publicitarios',
    'solutions-ads.vsRevenue.desc':
      'La plataforma ya ofrece seguimiento de ingresos publicitarios, y de lejos los dos se parecen: los dos conectan una cuenta y te muestran números. La diferencia es qué necesita cada uno antes de poder hacer nada.',
    'solutions-ads.vsRevenue.thisOne':
      'Las campañas necesitan saldo para gastar y que nuestro equipo habilite la capacidad para tu espacio de trabajo. Se contrata, y el dinero sale.',
    'solutions-ads.vsRevenue.otherOne':
      'El seguimiento de ingresos necesita un sitio que ya diste de alta en la plataforma, e informa lo que ese sitio ganó. No se gasta nada y no hay nada que contratar.',
    'solutions-ads.vsRevenue.linkCue': 'Ver seguimiento de ingresos publicitarios',

    'solutions-ads.availability.eyebrow': 'Disponibilidad',
    'solutions-ads.availability.title': 'Se habilita por espacio de trabajo',
    'solutions-ads.availability.desc':
      'La publicidad no llega encendida con una cuenta nueva. Nuestro equipo la habilita para un espacio de trabajo, y por eso no la encontrarás en el panel hasta que lo haya hecho. Si la quieres, pídela y la encendemos.',

    'solutions-ads.whatItReplaces.eyebrow': 'Qué reemplaza',
    'solutions-ads.whatItReplaces.lead': 'El rodeo que suele dar la publicidad.',
    'solutions-ads.compare.billing.without': 'Una segunda relación de cobro, con su tarjeta y su factura',
    'solutions-ads.compare.billing.with': 'Presupuesto tomado del saldo que ya fondeas',
    'solutions-ads.compare.retry.without': 'Un reintento en una conexión lenta cobrando el presupuesto dos veces',
    'solutions-ads.compare.retry.with': 'Un fondeo que reconoce la misma intención y cobra una vez',
    'solutions-ads.compare.leftover.without': 'Lo que no gastaste quedando parado en otro lado',
    'solutions-ads.compare.leftover.with': 'El remanente devuelto a tu saldo tras la conciliación',
    'solutions-ads.compare.reporting.without': 'Números copiados entre una consola ajena y tus libros',
    'solutions-ads.compare.reporting.with': 'Gasto y resultados junto al resto de tu cuenta',

    'solutions-ads.howItWorks.eyebrow': 'Cómo funciona',
    'solutions-ads.howItWorks.lead': 'Borrador, publicación, pausa, cierre.',
    'solutions-ads.howItWorks.aria': 'Ciclo de vida de una campaña',
    'solutions-ads.step.connect': 'Conecta la marca',
    'solutions-ads.step.draft': 'Arma el borrador',
    'solutions-ads.step.fund': 'Fondéala',
    'solutions-ads.step.publish': 'Publícala',
    'solutions-ads.step.close': 'Cierra y concilia',

    'solutions-ads.related.eyebrow': 'Relacionado',
    'solutions-ads.related.lead': 'Junto a qué suele ir la publicidad.',
    'solutions-ads.related.content.title': 'Contenido con IA',
    'solutions-ads.related.content.desc':
      'Escribe aquello a lo que apunta la campaña antes de pagar por mandarle gente.',
    'solutions-ads.related.payments.desc':
      'Fondea el saldo del que gasta una campaña, y factura lo que esa campaña vende.',
    'solutions-ads.related.developers.title': 'Para desarrolladores',
    'solutions-ads.related.developers.desc':
      'La referencia de publicidad, y también la de ingresos publicitarios, en la documentación de la API.',

    'solutions-ads.next.eyebrow': 'Siguiente paso',
    'solutions-ads.next.title': 'Pídenos que la encendamos',
    'solutions-ads.next.desc':
      'La publicidad se habilita por espacio de trabajo. Dinos cuál, y aparece en tu panel junto a todo lo demás.',
    'solutions-ads.next.linkCue': 'Leer la referencia de publicidad',
    'solutions-ads.next.actions.contact': 'Contáctanos',
  },
});
