/// <reference types="astro/client" />

import type { Locale } from './i18n/ui'
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

      /**
       * The language of THIS request, decided by the tenant and the path.
       *
       * Not derived from the path alone: the "English at the root, Spanish
       * under /es/" rule is 1Platform's topology, and a monolingual Spanish
       * tenant has neither half of it. See `src/lib/site-locale.ts`.
       */
      locale: Locale

      /**
       * The tenant's copy for `locale`: content key to string.
       *
       * Non-optional for the same reason `tenant` is. Making it optional would
       * push an `if (!messages)` branch into every component, and those
       * branches would be dead, untested, and free to drift into rendering the
       * platform's own words as a "fallback" — which is precisely the leak this
       * epic exists to close. A request that could not get its copy is answered
       * with a 503 by the middleware and never reaches a page.
       */
      messages: Record<string, string>

      /**
       * Localise an internal path for this tenant's topology.
       *
       * Carried per request rather than imported, because the answer depends on
       * which locale owns the tenant's root.
       */
      localizePath: (href: string, locale: Locale) => string
    }
  }
}

export {}
