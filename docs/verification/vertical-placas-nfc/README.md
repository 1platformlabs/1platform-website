# Refinamiento visual — sitio de Placas NFC

Fecha: 2026-11-03. PR #168, rama `feat/vertical-placas-nfc`.
Base: `1c05e7f6eb5a4f242588c96350338fb5a660c5c0`.
Código corregido: `b99ca16`; línea base completa: `8a65cab`.
Las capturas finales y pruebas corresponden a esos mismos archivos de producto;
los commits siguientes de evidencia no cambian el producto.

## Resultado

1. Los cuatro pasos de Placas ocupaban cuatro de seis columnas en escritorio:
   quedaban **389 px vacíos** a la derecha en 1440 px. El CSS de esta página
   ahora declara cuatro columnas; margen sobrante **0 px**. La disposición
   vertical de 390 y 768 px permanece igual. Otros usos de `ProcessSpine` no
   cambian.
2. Con movimiento reducido, el script compartido suspendía el bucle de
   animación pero interceptaba los enlaces internos. «Ver cómo funciona» no
   desplazaba la página. El handler conserva ahora la navegación nativa del
   navegador en ese modo: teclado Enter, fragmento y sección visibles.

Ambos defectos tienen regresión roja y verde en ES/EN. Los logs
`regression-red.log` y `anchor-red.log` registran dos fallos cada uno antes de
sus arreglos; `regression-green.log` registra los diez casos focales aprobados.

## Banco y revisión personal

- Worktree: `/Users/staimer/Documents/1platform-worktrees/vertical-placas-nfc-website`.
- Build de producción Astro/Node, `SITE_MANIFEST_SOURCE=api`,
  `SITE_API_BASE_URL=http://127.0.0.1:8110`.
- Sitio: `http://1platform.pro:4421`, resolución del navegador limitada a
  loopback por `--host-resolver-rules`. PID al terminar: `80793`.
- Backend de la rama de la épica en slot 1; Mongo privado con manifest
  `oneplatform` y 62 documentos de contenido persistidos del export actual.
- El export del manifest contiene `brand_assets.apple_touch_icon`, que este
  contrato API todavía no admite: la semilla privada omite sólo ese opcional.
  Colores, Manrope, destinos, rutas y contenido siguen siendo los del sitio.
- No hay fallback al manifest de repositorio ni a API remota en este banco.
  Los tests focales, amplios y el comparador de HTML sí usan sus dobles y modos
  de contrato habituales; se reportan por separado de esta revisión real.

Se abrieron personalmente las páginas completas EN/ES en 390×844, 768×900 y
1440×900 y sus secciones de pasos. Se revisaron lectura, ajuste de titulares,
tarjetas, secuencia, destinos, servicio opcional, ambos CTA y footer. Las
preferencias clara y oscura producen PNG idénticos byte a byte: el sitio declara
`color-scheme: light`, no ofrece un tema oscuro alternativo.

| Idioma | Anchos | Preferencias del sistema | Overflow | Axe WCAG A/AA | CTA de pedido | Teclado, movimiento reducido |
|---|---|---|---|---|---|---|
| EN | 390 / 768 / 1440 | Clara y oscura | 0 | 0 infracciones | 2 correctos por página | Aprobado |
| ES | 390 / 768 / 1440 | Clara y oscura | 0 | 0 infracciones | 2 correctos por página | Aprobado |

Los CTA conservan exactamente:
`https://app.1platform.pro/app/auth/login?next=%2Fmain%2Fplates%2Forders%3Fnew%3D1`.
No se navegó al panel remoto para verificarlo; se midieron los enlaces servidos.

La [galería lado a lado](review.html) enlaza las páginas completas. `before/`
y `after/` conservan capturas originales y `review.json` con mediciones,
URLs, viewport, foco y Axe. `screenshots.sha256.json` fija su integridad.
`review.mjs` reproduce las doce combinaciones contra el banco real:

```bash
node docs/verification/vertical-placas-nfc/review.mjs after
```

## Verificación final

Node `24.18.0`, dependencias propias instaladas por `npm ci`.

| Control | Resultado | Evidencia |
|---|---|---|
| Build de producción | Aprobado, sin errores | `build-initial.log`, builds de Playwright |
| `npm run typecheck` | 0 errores, 0 warnings, 27 hints | `typecheck.log` |
| `npm run check` | Guard y 53 self-tests aprobados | `design-check.log` |
| Export de contenido `--check` | Aprobado | `content-export-check.log` |
| Playwright focal | 10 aprobados | `regression-green.log` |
| Playwright completo | 603 aprobados, 25 omitidos, 0 fallos | `full-suite.log` |
| Comparación de HTML | 102 idénticos, 0 diferencias, 0 respuestas incorrectas | `baseline-check.log` |
| Visual Linux, imagen Playwright 1.61.1 Jammy | 11 aprobados | `visual-linux.log` |
| Banco real local | 12 combinaciones, 0 overflow, 0 Axe, 0 errores JS | `after/review.json` |

Suite amplia: `PLAYWRIGHT_PORT=14421 npx playwright test --workers=4`.
Carga antes de ejecutar: 15,84 / 18 CPU. Una ejecución amplia inicial se
interrumpió mientras todavía terminaba el guard; no se contó como evidencia.
La corrida completa reportada se inició después de terminar el guard.

La suite Linux usó volúmenes propios para `node_modules`, `dist` y `.astro`
(`pnf_website_visual_*_20261103`), así que su instalación y build no sustituyeron
los artefactos ni dependencias del banco macOS.

La línea base se re-congeló con `scripts/freeze-baseline.mjs`. Primero se
actualizaron sólo las dos rutas de Placas; el comparador detectó que el arreglo
del enlace compartido cambió también el nombre del bundle en otras 51 páginas.
En esas 51, se comprobó que **la única diferencia de bytes es el hash del
archivo `BaseLayout.astro_astro_type_script_index_0_lang.*.js`**. Se actualizaron
también esas referencias, sin cambiar el comparador ni sus normalizadores.

## Estado y límites

Código y evidencia locales terminados. PR permanece borrador. No se hizo push,
merge, dispatch, publicación ni deploy desde esta tarea. El CI remoto previo no
certifica estos nuevos commits.

Workflows leídos: `ci.yml` corre en `pull_request`, sin jobs de publicación;
`prod.yml` despliega en `push` a `main` o `workflow_dispatch`. No hay dependencias
de publicación en el workflow de PR.

Esta revisión cubre las dos páginas del sitio. El flujo autenticado del panel,
operación de Console, fabricación física y gate formal
`/verify-epic-e2e vertical-placas-nfc` pertenecen al coordinador de la épica.
No se modificaron `AGENTS.md` ni `CLAUDE.md`.
