import type { APIRoute } from 'astro'

/**
 * Search Console ownership verification — served ONLY to the tenant that
 * declares the token.
 *
 * WHY THIS ROUTE EXISTS, AND WHY IT IS THE MOST IMPORTANT ONE IN D-17
 * -------------------------------------------------------------------
 * `public/google1dd96c2b1cc5f482.html` was 1Platform's Search Console ownership
 * proof, and `public/` is copied into `dist/client/`, which the Node adapter
 * serves BEFORE the application runs. So no middleware could gate it. Probed
 * against the real server build:
 *
 *   Host: 1platform.pro           -> 200, 53 bytes
 *   Host: clinicas.1platform.dev  -> 200, 53 bytes
 *   Host: inventado.example       -> 200, 53 bytes    ← resolves to NO tenant
 *
 * That is not a cosmetic leak. Anyone who points a domain they control at this
 * container gets the platform's verification token served under THEIR hostname,
 * and Search Console's file method verifies ownership of a property by fetching
 * exactly that path from exactly that host. The consequence runs the other way
 * from the usual one: it is not our data escaping, it is our identity being
 * lent out — whoever holds the 1Platform Search Console property could then be
 * granted ownership of a customer's domain, and a customer could have their own
 * domain verified into a property they do not control.
 *
 * WHY A ROUTE AND NOT A META TAG
 * ------------------------------
 * A `<meta name="google-site-verification">` would also work and would be less
 * code. It was rejected because it is a DIFFERENT verification method: swapping
 * it in means re-verifying the live property in Search Console, by hand, at
 * deploy time, with a window in which `1platform.pro` is unverified and its
 * Search Console data stops. Keeping the file method and making it per-tenant
 * changes who gets served, not how the proof works, so the existing property
 * keeps verifying with no console action at all.
 *
 * WHY THE ROUTE IS SAFE TO MAKE THIS BROAD
 * ----------------------------------------
 * `[token].html` matches any single-segment `*.html` at the root, and the site
 * publishes no other `.html` address: every page is extensionless with a
 * trailing slash. A request for any other `*.html` therefore falls here and is
 * answered 404 — which is what it was before, and what it should be.
 */
export const prerender = false

export const GET: APIRoute = ({ params, locals }) => {
  const declared = locals.tenant.google_site_verification

  // A tenant with no token has nothing to prove and serves nothing. Absent is
  // NOT "fall back to the platform's token": that fallback is precisely the
  // defect this route replaces.
  if (!declared || params.token !== declared) {
    return new Response('Not Found\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' },
    })
  }

  // The body Google expects: the token line, and nothing else. Byte-identical
  // to the file this replaces, so the existing property keeps verifying.
  return new Response(`google-site-verification: ${declared}.html`, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-content-type-options': 'nosniff',
    },
  })
}
