import { normalizeHost } from './resolve-tenant'

/**
 * Whether this request should be answered here or sent to the site's own domain.
 *
 * Lives in its own module, outside the middleware, because inside `onRequest`
 * nothing can reach it: the only way to exercise a decision embedded in a
 * request handler is to stand up a server and make a request, so the dangerous
 * inputs — the ones this function exists for — would never get a test. The
 * middleware keeps the wiring; the rule lives here where it can be asked
 * questions directly.
 */
export type RedirectDecision =
  | { outcome: 'serve' }
  | { outcome: 'redirect'; target: string }
  | { outcome: 'refused'; why: string }

/**
 * Decide from the manifest's `redirect_to` and the host the request arrived on.
 *
 * `redirect_to` is computed by the API from the stored manifest and is never an
 * echo of the requested host, so this is not a field a caller can steer. It is
 * validated anyway, and the reason is the blast radius rather than distrust:
 * `location` is the one header that sends a visitor somewhere else, so a
 * foreign value reaching it is an open redirect served under a customer's own
 * domain — a phishing primitive with that customer's branding around it.
 *
 * The test is a FIXED POINT: `normalizeHost(x) === x`. That is stronger than a
 * list of forbidden shapes, because it refuses everything canonicalisation
 * would have CHANGED rather than everything somebody thought to enumerate — a
 * scheme (`https://evil.com` collapses to `https`), a path
 * (`evil.example/x` to `evil.example`), a port, a trailing dot, upper case, and
 * any byte a hostname cannot hold, including the newline that would otherwise
 * let a stranger forge a log line. A dot is required on top of it, because the
 * empty string is its own fixed point and would otherwise sail through.
 */
export function decideRedirect(redirectTo: unknown, requestHost: string): RedirectDecision {
  // Absent and null both mean "serve it here". They are the normal case — every
  // site that has not moved sends one of the two — so neither is worth a word in
  // the log.
  if (redirectTo === undefined || redirectTo === null) return { outcome: 'serve' }

  if (typeof redirectTo !== 'string') {
    return { outcome: 'refused', why: 'not a string' }
  }

  const target = normalizeHost(redirectTo)
  if (target !== redirectTo) {
    return { outcome: 'refused', why: 'not a canonical host' }
  }
  if (!target.includes('.')) {
    return { outcome: 'refused', why: 'not a dotted host' }
  }
  // Refusing the self-redirect is what makes a loop impossible rather than
  // unlikely. A browser handed a 301 to the address it just asked for follows
  // it, and does so until it gives up — so the one comparison that has to be
  // right is this one, and it is made on the CANONICAL spelling of both sides
  // so that a difference in case or a trailing dot cannot be mistaken for a
  // difference in destination.
  if (target === normalizeHost(requestHost)) {
    return { outcome: 'refused', why: 'same host' }
  }

  return { outcome: 'redirect', target }
}

/** Seconds a browser may keep the 301. See the middleware for why it is bounded. */
export const REDIRECT_MAX_AGE_SECONDS = 3600
