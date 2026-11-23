## Problema
Con `prefers-reduced-motion: no-preference`, Tab → Enter en «Saltar al contenido principal» conserva el foco en el enlace. El siguiente Tab enfoca el logo del encabezado: el usuario debe recorrer la navegación que pidió saltar.

## Reproducción (2026-11-22)
Banco SSR real, API local y SitePages persistidas. Chromium 375×812, `/about/`: abrir página, Tab (skip link visible) → Enter, esperar 1,5 s, Tab.
Actual: foco en `.brand-lockup`, hash vacío. Esperado: foco/navegación secuencial dentro de `#main-content`.
Control con `prefers-reduced-motion: reduce`: hash `#main-content`, siguiente Tab en breadcrumb Home dentro de main; ese camino sí funciona.

Reproducido en `origin/main` **861e270f0436840ced8606c36b6a9373385e8fbf** (:5021, worktree `vertical-prospeccion-website-control`) y PR #194 **bf0a8bef6a5ed2bd764c562a27a663e420ffd651** (:4921). Preexistente y compartido, queda fuera de #194.

## Causa localizada
`src/scripts/lenis-init.ts` intercepta `href^="#"`, hace `preventDefault()` y sólo `lenis.scrollTo(href)`, sin transferir foco ni navegación secuencial. `BaseLayout.astro` proporciona el skip link global.

## Cierre esperado
Regresión por teclado en movimiento normal/reducido y tras navegación Astro; fallo antes del arreglo. Preservar foco visible y navegación de anchors.

Evidencia: `docs/verification/vertical-prospeccion-refinement/check-shared.mjs` y `shared-results.json` en worktree de #194. Axe 0 no detectó el fallo funcional.
