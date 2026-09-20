import { expect, test } from '@playwright/test'

import { isTenant } from '../src/lib/site-api'
import { normalizeHost } from '../src/lib/resolve-tenant'
import { REDIRECT_MAX_AGE_SECONDS, decideRedirect } from '../src/lib/site-redirect'

/**
 * The rule behind the 301, asked directly.
 *
 * The middleware keeps only the wiring, so these are the inputs that decide
 * whether a visitor under a customer's domain can be sent somewhere the API
 * never named. The server-side half — that the wiring is actually there, and
 * that the response really is a 301 with the path and query carried over — is
 * in `redirect-serves.spec.ts`, because a rule nobody calls is as broken as a
 * rule that is wrong.
 */

const HOST = 'medipago.1platform.pro'

test.describe('decideRedirect', () => {
  test('sends the visitor on when the manifest names another host', () => {
    expect(decideRedirect('medipago.gt', HOST)).toEqual({
      outcome: 'redirect',
      target: 'medipago.gt',
    })
  })

  test('absent and null both mean "serve it here"', () => {
    // The normal case for every site that has not moved. Worth pinning because
    // the two arrive by different routes — an older API omits the key, a
    // current one sends null — and a check written against only one of them
    // would turn the other into a refusal with a warning on every request.
    expect(decideRedirect(undefined, HOST)).toEqual({ outcome: 'serve' })
    expect(decideRedirect(null, HOST)).toEqual({ outcome: 'serve' })
  })

  // Each of these is a destination that must never reach `location`. They are
  // parameterised together because the interesting property is that ONE rule
  // catches all of them: the fixed point. A blocklist would need a line each,
  // and would still be missing whichever one nobody thought of.
  const refused: ReadonlyArray<readonly [unknown, string, string]> = [
    ['evil.example/x', 'not a canonical host', 'a path — the open redirect this rule exists for'],
    ['https://evil.example', 'not a canonical host', 'a scheme collapses under normalisation'],
    ['//evil.example', 'not a canonical host', 'protocol-relative'],
    ['evil.example:8080', 'not a canonical host', 'a port'],
    ['EVIL.example', 'not a canonical host', 'upper case'],
    ['evil.example.', 'not a canonical host', 'a trailing root dot'],
    ['evil.example\nSet-Cookie: x', 'not a canonical host', 'a newline would forge a log line'],
    [' evil.example', 'not a canonical host', 'leading space'],
    ['sin-punto', 'not a dotted host', 'a bare label is not a host'],
    ['', 'not a dotted host', 'the empty string is its own fixed point'],
    [42, 'not a string', 'a number'],
    [{ host: 'evil.example' }, 'not a string', 'an object'],
  ]

  for (const [value, why, description] of refused) {
    test(`refuses ${description}`, () => {
      const decision = decideRedirect(value, HOST)
      expect(decision).toEqual({ outcome: 'refused', why })
    })
  }

  test('refuses the self-redirect, which is what makes a loop impossible', () => {
    expect(decideRedirect(HOST, HOST)).toEqual({ outcome: 'refused', why: 'same host' })
  })

  test('compares the CANONICAL spelling of both sides', () => {
    // The request host arrives from a `Host` header and is not canonical by
    // construction: a browser may send a port, and a resolver may send the
    // root dot. Comparing raw strings would read those as a different
    // destination and answer a 301 to the address the visitor is already on.
    expect(decideRedirect('medipago.gt', 'MEDIPAGO.GT:443')).toEqual({
      outcome: 'refused',
      why: 'same host',
    })
    expect(decideRedirect('medipago.gt', 'medipago.gt.')).toEqual({
      outcome: 'refused',
      why: 'same host',
    })
  })

  test('every refused value really is one normalisation away from itself', () => {
    // The property the rule rests on, asserted rather than assumed: for each
    // rejected canonical-form case, `normalizeHost` does change it. If that
    // ever stopped being true the fixed point would stop discriminating, and
    // the parameterised cases above would keep passing for the wrong reason.
    for (const [value, why] of refused) {
      if (why !== 'not a canonical host') continue
      expect(normalizeHost(value as string)).not.toBe(value)
    }
  })

  test('the cache window is bounded', () => {
    // A 301 with no bound is cacheable indefinitely, so this number is what
    // stops a disconnected domain from pinning visitors to a dead host forever.
    expect(REDIRECT_MAX_AGE_SECONDS).toBeGreaterThan(0)
    expect(REDIRECT_MAX_AGE_SECONDS).toBeLessThanOrEqual(86_400)
  })
})

test.describe('the manifest contract', () => {
  test('a manifest from before this field still validates', () => {
    // Compatibility in the direction that matters during a rolling deploy: the
    // site ships before or after the API, and a structural check that had
    // started REQUIRING `redirect_to` would take every tenant offline for the
    // length of the window.
    const old = {
      slug: 'oneplatform',
      brand_name: '1Platform',
      brand_mark: null,
      brand_wordmark: null,
      domain: '1platform.pro',
      locales: ['es'],
      default_locale: 'es',
      home_template: 'platform-commerce',
      theme: { accent: '#2f6df6', accent_contrast: '#ffffff', display_font: 'space-grotesk' },
      destinations: { docs: null, app: null, support: null, status: null },
      pages: ['/'],
      google_site_verification: null,
      indexable: true,
    }
    expect(isTenant(old)).toBe(true)
    expect(isTenant({ ...old, redirect_to: null })).toBe(true)
    expect(isTenant({ ...old, redirect_to: 'medipago.gt' })).toBe(true)
  })
})
