import { expect, test } from '@playwright/test'

import { resolveContent, __testing } from '../src/lib/site-content'

/**
 * A published site whose copy has not been written yet (issue #117).
 *
 * `GET /sites/<slug>/pages` answers `200 {"pages": [], "messages": {}}` for a
 * site that exists and has no content documents. The shape is valid, so the
 * structural check passed it, `resolveContent` reported `resolved`, and the
 * empty dictionary went to the renderer — where the first `t()` throws by
 * design. The visitor got a 200 whose body was the four words the adapter
 * writes into a stream it can no longer take back.
 *
 * So the rule under test is a CONTRACT one and belongs here rather than in a
 * page: zero keys is the API saying "this site has no words", which is the
 * same thing its 404 says, and both must come out as `unavailable`.
 *
 * The two controls matter as much as the rule. A dictionary of ONE key must
 * still resolve — otherwise this is not "empty is no copy", it is "small is no
 * copy", and a legitimately short site would go dark. And the API being
 * unreachable must stay distinct from both: that is the difference between
 * "come back" and "there is nothing here".
 *
 * Runs in Node without a browser — the property is about the resolver, not the
 * page. The end-to-end half (that the server really answers 5xx, and what the
 * visitor is handed) is `tests/site-without-copy-is-not-a-200.spec.ts`.
 */

const SLUG = 'nocopy-probe'

function pagesResponse(messages: Record<string, string>, locale = 'es'): Response {
  return new Response(
    JSON.stringify({ success: true, data: { slug: SLUG, locale, messages, pages: [] } }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

let originalFetch: typeof globalThis.fetch
let answer: () => Response | Promise<Response>
let calls = 0

test.beforeEach(() => {
  originalFetch = globalThis.fetch
  __testing.cache.reset()
  calls = 0
  globalThis.fetch = (async () => {
    calls++
    return answer()
  }) as typeof globalThis.fetch
})

test.afterEach(() => {
  globalThis.fetch = originalFetch
  __testing.cache.reset()
})

test('a 200 with an EMPTY dictionary is unavailable, not resolved', async () => {
  answer = () => pagesResponse({})

  const resolution = await resolveContent(SLUG, 'es')

  // The floor: if the stub never got asked, "unavailable" would be true for the
  // wrong reason and this would pass over a resolver that does not fetch.
  expect(calls, 'the resolver never asked the API — broken probe').toBe(1)
  expect(
    resolution.outcome,
    'an empty dictionary reaches the renderer, where t() throws AFTER the 200 is on the wire',
  ).toBe('unavailable')
})

test('an empty dictionary is not CACHED as if it were copy', async () => {
  // The quiet half of the same defect. If the empty answer were stored, the
  // site would keep answering from it for the whole TTL — so the moment the
  // copy actually lands, the site would still be dark and nothing would say
  // why.
  answer = () => pagesResponse({})
  await resolveContent(SLUG, 'es')

  answer = () => pagesResponse({ 'home.title': 'Ya hay copia' })
  const second = await resolveContent(SLUG, 'es')

  expect(calls, 'the second call was served from cache').toBe(2)
  expect(second.outcome).toBe('resolved')
})

test('ONE key still resolves — the rule is empty, not small', async () => {
  answer = () => pagesResponse({ 'home.title': 'Hola' })

  const resolution = await resolveContent(SLUG, 'es')

  expect(
    resolution.outcome,
    'a short dictionary is a short site, not an absent one — refusing it would take ' +
      'a working tenant offline',
  ).toBe('resolved')
  if (resolution.outcome === 'resolved') {
    expect(resolution.content.messages['home.title']).toBe('Hola')
  }
})

test('the API being unreachable stays a DIFFERENT answer from having no copy', async () => {
  answer = () => {
    throw new Error('connection refused')
  }

  const resolution = await resolveContent(SLUG, 'es')

  expect(resolution.outcome).toBe('unavailable')
  if (resolution.outcome === 'unavailable') {
    expect(
      resolution.reason,
      'collapsing "could not ask" into "has no copy" is how an API blip gets ' +
        'written down as a site that was never published',
    ).toContain('could not reach')
  }
})

test('a 404 is unavailable too, and says so in its own words', async () => {
  answer = () => new Response(JSON.stringify({ success: false }), { status: 404 })

  const resolution = await resolveContent(SLUG, 'es')

  expect(resolution.outcome).toBe('unavailable')
  if (resolution.outcome === 'unavailable') {
    expect(resolution.reason).toContain('no published content')
  }
})
