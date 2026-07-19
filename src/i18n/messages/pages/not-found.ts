import { defineMessages } from '@i18n/ui';

/**
 * 404 page copy.
 *
 * Only an English shell exists (`src/pages/404.astro`) — the origin never
 * serves `dist/404.html` as its error document, so `/es/404/` would be a page
 * nobody can reach. The Spanish half of this catalogue is still filled in
 * (required by `defineMessages`'s type, and consistent with every other
 * module), it simply never renders through a route.
 *
 * The four destination labels reuse the shell's own words for "Home",
 * "Solutions", "Docs" and "Blog" (`breadcrumb.home`, `nav.solutions`,
 * `nav.docs`, `nav.blog`) — this page names the same four things the header
 * nav does, so it names them with the same key.
 */
export default defineMessages({
  en: {
    'notFound.title': 'Page Not Found | 1Platform',
    'notFound.description':
      'The page you are looking for could not be found. Navigate back to the 1Platform homepage or explore our solutions and documentation.',

    'notFound.status': 'HTTP 404 — Not found',
    'notFound.headline': "This page isn't here.",
    'notFound.message':
      'The address may have changed, the page may have been retired, or the link that brought you here may have a typo. Everything below still works.',
    'notFound.cta': 'Back to homepage',
    'notFound.tryTheseHeading': 'Try one of these',

    'notFound.destination.home.detail': 'What the platform does, start to finish.',
    'notFound.destination.solutions.detail': 'Stores, websites, payments, whitelabel.',
    'notFound.destination.docs.detail': 'API reference and integration guides.',
    'notFound.destination.blog.detail': 'Product notes and how-to articles.',
  },
  es: {
    'notFound.title': 'Página no encontrada | 1Platform',
    'notFound.description':
      'No pudimos encontrar la página que buscas. Vuelve al inicio de 1Platform o explora nuestras soluciones y documentación.',

    'notFound.status': 'HTTP 404 — Página no encontrada',
    'notFound.headline': 'Esta página no existe.',
    'notFound.message':
      'La dirección pudo haber cambiado, la página pudo haberse retirado, o el enlace que te trajo aquí puede tener un error de tipeo. Todo lo de abajo sigue funcionando.',
    'notFound.cta': 'Volver al inicio',
    'notFound.tryTheseHeading': 'Prueba con alguna de estas',

    'notFound.destination.home.detail': 'Qué hace la plataforma, de principio a fin.',
    'notFound.destination.solutions.detail': 'Tiendas, sitios web, pagos, marca blanca.',
    'notFound.destination.docs.detail': 'Referencia de la API y guías de integración.',
    'notFound.destination.blog.detail': 'Notas de producto y guías prácticas.',
  },
});
