## Diferencia medida
`CLAUDE.md` exige 48 px mínimos para objetivos táctiles móviles, pero `.btn` y `.btn--sm` en `src/styles/components.css` declaran `min-height: 44px`.

Chromium 375×812: CTA de `/about/` miden **44 px** tanto en `origin/main` **861e270f0436840ced8606c36b6a9373385e8fbf** como en PR #194 **bf0a8bef6a5ed2bd764c562a27a663e420ffd651**. Los CTA de Prospección ES/EN también miden 44 px.

Es discrepancia de la regla de diseño del proyecto, **no un fallo WCAG AA demostrado**: axe no reporta violaciones; 44 px supera el mínimo de tamaño de objetivo WCAG 2.2 AA. Resolver en estilo compartido con revisión de consumidores/líneas base; no introducir override sólo en Prospección.

## Validación esperada
Medir CTA primarios/secundarios/pequeños a 375 px: 48 px mínimos, sin cortes ni desborde ES/EN. Regresión que falle con la regla antigua y renovar baselines afectadas.

Banco SSR real con API local y SitePages persistidas, 2026-11-22. Evidencia: `docs/verification/vertical-prospeccion-refinement/{results.json,shared-results.json,check-shared.mjs}` en worktree `vertical-prospeccion-1platform-website`. Fuera de alcance #194.
