/// <reference types="astro/client" />

import type { SiteTenant } from './lib/site-api'

declare global {
  namespace App {
    /**
     * Per-request state.
     *
     * `tenant` is populated by `src/middleware.ts` on every request that gets
     * past the host check, so a page reading it can rely on it being there. It
     * is typed non-optional on purpose: making it `SiteTenant | undefined` would
     * push an `if (!tenant)` branch into every layout and component, and those
     * branches would be dead — unreachable, untested, and free to drift into
     * rendering the platform's brand as a "fallback", which is exactly the leak
     * this epic exists to prevent.
     *
     * The one place it is genuinely absent is a request the middleware already
     * answered (404 or 503), which never reaches a page.
     */
    interface Locals {
      tenant: SiteTenant
    }
  }
}

export {}
