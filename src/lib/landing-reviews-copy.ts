/**
 * The FIXED words of the reviews block (landing-reviews-tenant D-10).
 *
 * Why here and not in a tenant's content: in production a page's dictionary is
 * ONLY that tenant's published copy (`middleware.ts` → `copyFor`), so a key
 * added to the repo catalogue does not exist on the live site and `t()` would
 * throw — and putting it in every tenant's content would mean writing
 * production data for a button label. The words that ARE the tenant's — the
 * section's title and description — come from the tenant's own settings, which
 * its owner edits in the panel; the section is on from the start, so a site whose
 * owner never wrote a title gets `defaultTitle` in the page's language. These
 * are the controls around them, the same for every tenant, in the formal
 * register the three landings share.
 */

import type { ReviewSource } from './site-reviews'

export interface ReviewsCopy {
  eyebrow: string
  defaultTitle: string
  summaryLabel: string
  histogramLabel: string
  outOf: string
  published: (count: number) => string
  stars: (count: number) => string
  starsOf: (rating: number) => string
  bar: (rating: number, count: number) => string
  showing: (shown: number, total: number, rating: number) => string
  filterLabel: string
  allRatings: string
  more: string
  moreAdded: string
  filterUpdated: string
  allShown: string
  emptyFilteredTitle: string
  emptyFilteredBody: string
  clear: string
  reviewBy: (author: string) => string
  source: Record<ReviewSource, string>
}

const ES: ReviewsCopy = {
  eyebrow: 'EN SUS PALABRAS',
  defaultTitle: 'Lo que dicen nuestros clientes',
  summaryLabel: 'Resumen de reseñas',
  histogramLabel: 'Distribución de valoraciones',
  outOf: '/ 5',
  published: (n) => (n === 1 ? '1 reseña publicada' : `${n} reseñas publicadas`),
  stars: (n) => (n === 1 ? '1 estrella' : `${n} estrellas`),
  starsOf: (n) => `${n} de 5 estrellas`,
  bar: (rating, count) =>
    `${rating} ${rating === 1 ? 'estrella' : 'estrellas'}: ${count} ${count === 1 ? 'reseña' : 'reseñas'}`,
  showing: (shown, total, rating) =>
    `${shown} de ${total} ${total === 1 ? 'reseña' : 'reseñas'}${rating ? ` · ${rating} ${rating === 1 ? 'estrella' : 'estrellas'}` : ''}`,
  filterLabel: 'Valoración',
  allRatings: 'Todas las valoraciones',
  more: 'Ver más reseñas',
  moreAdded: 'Se han añadido más reseñas',
  filterUpdated: 'Filtro de valoración actualizado',
  allShown: 'Se muestran todas las valoraciones',
  emptyFilteredTitle: 'Todavía no hay reseñas con esta valoración',
  emptyFilteredBody: 'Elija otra valoración para seguir leyendo',
  clear: 'Ver todas las reseñas',
  reviewBy: (author) => `Reseña de ${author}`,
  source: {
    direct: 'Opinión directa',
    whatsapp: 'Recibida por WhatsApp',
    manual: 'Añadida por el equipo',
  },
}

const EN: ReviewsCopy = {
  eyebrow: 'IN THEIR WORDS',
  defaultTitle: 'What our customers say',
  summaryLabel: 'Reviews summary',
  histogramLabel: 'Rating distribution',
  outOf: '/ 5',
  published: (n) => (n === 1 ? '1 published review' : `${n} published reviews`),
  stars: (n) => (n === 1 ? '1 star' : `${n} stars`),
  starsOf: (n) => `${n} out of 5 stars`,
  bar: (rating, count) =>
    `${rating} ${rating === 1 ? 'star' : 'stars'}: ${count} ${count === 1 ? 'review' : 'reviews'}`,
  showing: (shown, total, rating) =>
    `${shown} of ${total} ${total === 1 ? 'review' : 'reviews'}${rating ? ` · ${rating} ${rating === 1 ? 'star' : 'stars'}` : ''}`,
  filterLabel: 'Rating',
  allRatings: 'All ratings',
  more: 'Show more reviews',
  moreAdded: 'More reviews were added',
  filterUpdated: 'Rating filter updated',
  allShown: 'All ratings are shown',
  emptyFilteredTitle: 'There are no reviews with this rating yet',
  emptyFilteredBody: 'Choose another rating to keep reading',
  clear: 'See all reviews',
  reviewBy: (author) => `Review by ${author}`,
  source: {
    direct: 'Shared directly',
    whatsapp: 'Received by WhatsApp',
    manual: 'Added by the team',
  },
}

export function reviewsCopy(locale: string): ReviewsCopy {
  return locale === 'en' ? EN : ES
}
