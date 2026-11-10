/**
 * Interface copy of the editorial preset (blog-sitio-de-marca-generado §23 E-1).
 *
 * PRODUCT microcopy only — labels of controls and states that every site using
 * the preset shares ("Buscar", "1 artículo"). Nothing here names a customer, a
 * domain, a product or a topic: the brand, the home copy, the categories, the
 * call to action, the byline and the legal notice come from the site's
 * editorial block in the Core. Spanish uses tuteo.
 *
 * Kept apart from the tenant dictionaries on purpose: a site that uses this
 * preset does not have to author forty interface strings to be renderable, and
 * a renamed label here cannot break any tenant's copy.
 */
export type EditorialLocale = 'es' | 'en'

const ES = {
  skip: 'Saltar al contenido',
  menu: 'Menú',
  nav: 'Secciones del blog',
  home: 'Inicio',
  library: 'Biblioteca',
  allPosts: 'Todas',
  exploreLibrary: 'Explorar la biblioteca',
  findReading: 'Encuentra tu lectura',
  featured: 'Lectura destacada',
  pathsKicker: 'Empieza por tu pregunta',
  pathsTitle: '¿Qué quieres entender hoy?',
  pathsOpen: 'Abrir la lectura',
  recentKicker: 'El blog',
  recentTitle: 'Lecturas recientes',
  viewArchive: 'Ver el archivo',
  readingMinutes: (n: number) => `${n} min de lectura`,
  count: (n: number) => (n === 1 ? '1 artículo' : `${n} artículos`),
  searchLabel: 'Buscar en la biblioteca',
  searchPlaceholder: 'Título, tema o palabra clave',
  searchButton: 'Buscar',
  searching: 'Buscando…',
  searchHint: 'No distingue tildes ni mayúsculas.',
  clearSearch: 'Quitar la búsqueda',
  resultsFor: (q: string) => `Resultados para «${q}»`,
  noMatchTitle: 'No encontramos lecturas con esa búsqueda.',
  noMatchBody: 'Prueba con otra palabra o revisa todas las lecturas.',
  seeAll: 'Ver todas las lecturas',
  emptyCategoryTitle: 'Todavía no hay lecturas en esta categoría.',
  emptyCategoryBody: 'Mientras tanto, puedes revisar el resto de la biblioteca.',
  emptyArchiveTitle: 'Todavía no hay lecturas publicadas.',
  errorTitle: 'No pudimos cargar la biblioteca.',
  errorBody: 'Es un problema temporal. Vuelve a intentarlo en unos segundos.',
  retry: 'Reintentar',
  pagination: 'Páginas de resultados',
  previous: 'Anterior',
  next: 'Siguiente',
  pageN: (n: number) => `Página ${n}`,
  breadcrumbs: 'Ruta de navegación',
  toc: 'En esta lectura',
  legalKicker: 'Aviso legal',
  legalPending: 'Pendiente de aprobación',
  endOfReading: 'Fin de la lectura',
  backToTop: 'Volver al inicio',
  related: 'Sigue leyendo',
  ctaContinue: (host: string) => `Continuarás en ${host}`,
  nextStep: 'Tu siguiente paso',
  emailLabel: 'Tu correo electrónico',
  consentLabel: 'Acepto',
  subscribed: 'Listo. Recibimos tu suscripción.',
  subscribeError: 'No pudimos registrar tu suscripción. Inténtalo de nuevo.',
  notFoundTitle: 'Esta lectura no existe.',
  notFoundBody: 'Puede que haya cambiado de dirección. La biblioteca tiene todas las lecturas.',
  updated: 'Actualizado',
}

type Strings = typeof ES

const EN: Strings = {
  skip: 'Skip to content',
  menu: 'Menu',
  nav: 'Blog sections',
  home: 'Home',
  library: 'Library',
  allPosts: 'All',
  exploreLibrary: 'Explore the library',
  findReading: 'Find your reading',
  featured: 'Featured reading',
  pathsKicker: 'Start with your question',
  pathsTitle: 'What do you want to understand today?',
  pathsOpen: 'Open the reading',
  recentKicker: 'The blog',
  recentTitle: 'Recent readings',
  viewArchive: 'View the archive',
  readingMinutes: (n: number) => `${n} min read`,
  count: (n: number) => (n === 1 ? '1 article' : `${n} articles`),
  searchLabel: 'Search the library',
  searchPlaceholder: 'Title, topic or keyword',
  searchButton: 'Search',
  searching: 'Searching…',
  searchHint: 'Accents and capitals do not matter.',
  clearSearch: 'Clear the search',
  resultsFor: (q: string) => `Results for “${q}”`,
  noMatchTitle: 'No reading matches that search.',
  noMatchBody: 'Try another word or browse every reading.',
  seeAll: 'See every reading',
  emptyCategoryTitle: 'No readings in this category yet.',
  emptyCategoryBody: 'Meanwhile, browse the rest of the library.',
  emptyArchiveTitle: 'No readings have been published yet.',
  errorTitle: 'We could not load the library.',
  errorBody: 'This is temporary. Try again in a few seconds.',
  retry: 'Try again',
  pagination: 'Result pages',
  previous: 'Previous',
  next: 'Next',
  pageN: (n: number) => `Page ${n}`,
  breadcrumbs: 'Breadcrumbs',
  toc: 'In this reading',
  legalKicker: 'Legal notice',
  legalPending: 'Pending approval',
  endOfReading: 'End of the reading',
  backToTop: 'Back to the top',
  related: 'Keep reading',
  ctaContinue: (host: string) => `You will continue on ${host}`,
  nextStep: 'Your next step',
  emailLabel: 'Your email address',
  consentLabel: 'I agree',
  subscribed: 'Done. We received your subscription.',
  subscribeError: 'We could not register your subscription. Please try again.',
  notFoundTitle: 'This reading does not exist.',
  notFoundBody: 'It may have moved. The library has every reading.',
  updated: 'Updated',
}

export function editorialStrings(locale: string): Strings {
  return locale === 'en' ? EN : ES
}

export function formatEditorialDate(iso: string | null, locale: string): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso))
}
