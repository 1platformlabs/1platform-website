import type { APIRoute } from 'astro'
import { healthResponse } from '../../lib/served-health'

/**
 * `GET /api/health` — the served-version contract (see `lib/served-health.ts`).
 *
 * Rendered per request: a prerendered file would freeze the build-time value
 * and be served from `dist/client/` before any code runs.
 */
export const prerender = false

export const GET: APIRoute = () => healthResponse()
