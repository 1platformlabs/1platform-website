# Nube disponible · implementación 2026-11-04

## Alcance

Decisión del usuario: presentar Nube como disponible y agregar documentación de 1Platform como proveedor de servidores y bases de datos. Fuente visual: `epics/1platform-infraestructura-branding/prototipo/` del workspace, iteración 2026-11-04.

- Website: `src/i18n/messages/pages/infrastructure-home.ts` conserva las claves de contenido y cambia sólo el estado de Nube a `DISPONIBLE` / `AVAILABLE`. `InfrastructureHome.astro` incorpora un enlace independiente de la selección, mediante el destino de documentación del tenant.
- Developer: nueva categoría `nube/` con guía, portada y sidebar autogenerados; se actualiza el alcance de `plataforma/index.mdx` y la regresión semántica de servicios. No se inventan endpoints, tarifas ni SLA.
- No se cambia CSS, autenticación, APIs, dependencias, perfiles de otros tenants ni estados de otros servicios. La disponibilidad procede de la decisión del usuario, no de una prueba de aprovisionamiento de nube.

## Checkouts persistentes

| Proyecto | Worktree | Rama | Base |
| --- | --- | --- | --- |
| Website | `/Users/staimer/Documents/1platform-worktrees/nube-disponible-website` | `feat/nube-disponible` | `f2e9d4d8721c26cdba40adfed52ec32e5f4be528` |
| Developer | `/Users/staimer/Documents/1platform-worktrees/nube-disponible-developer` | `docs/nube-disponible` | `214118bce5890313f7eeb2d61ded5192b67505de` |

Código local sin commit, push, PR, merge, publicación ni escrituras en producción. Los checkouts compartidos y los prototipos permanecen intactos durante esta implementación. `AGENTS.md` y `CLAUDE.md` no se editaron.

## Publicación futura: contenido separado del código

El website en producción toma las etiquetas de SitePages, no del catálogo del repositorio. Desplegar el código no sustituye el estado guardado del espacio. Para la futura publicación autorizada, aplicar únicamente al espacio `oneplatform`:

| Locale | Clave de contenido | Valor |
| --- | --- | --- |
| es | `infrastructure.capabilities.cloud.status` | `DISPONIBLE` |
| en | `infrastructure.capabilities.cloud.status` | `AVAILABLE` |

Preservar la identidad del documento existente, el resto de sus bloques y su publicación. Reconciliar el snapshot vigente antes de preparar la actualización; no sustituir todo el documento con el catálogo. No se ha ejecutado esa escritura. Publicar primero Developer para que `/docs/saas/1platform-api/nube/` exista antes de activar el vínculo del website. Las PR de Developer publican QA automáticamente; no abrirlas sin revisar ese efecto.

## Validación

- Rojo previo del website: las dos regresiones de Nube fallaron por recibir `EN PREPARACIÓN` / `IN DEVELOPMENT` en lugar de los estados nuevos.
- Rojo previo de Developer: el guard detectó la guía/categoría ausentes y el límite editorial obsoleto.
- Comandos con Node 24.18.0. Resultados finales al pie de este documento.

```bash
export PATH=/Users/staimer/.nvm/versions/node/v24.18.0/bin:$PATH
# Website, desde su worktree:
PLAYWRIGHT_PORT=4565 npx playwright test tests/infrastructure-home.spec.ts tests/infrastructure-cloud-content.spec.ts tests/services-documentation.spec.ts tests/chrome-navigation.spec.ts tests/a11y-home.spec.ts --workers=2
npm run typecheck
npm run check
# Developer, desde su worktree:
pnpm typecheck
pnpm build
pnpm check:service-docs
pnpm check:service-docs:self-test
pnpm check:editorial-tone
pnpm check:contract
pnpm check:tells
pnpm check:agent-assets
```

El preview local del website usa `SITE_MANIFEST_SOURCE=repo`: no certifica la lectura de SitePages desde un Core y una DB privados. La suite de compatibilidad usa un doble HTTP explícito; no se presenta como E2E canónico.

## Verificación canónica pendiente

El `CLAUDE.md` de Developer requiere cerrar con `/verify-epic-e2e 1platform-infraestructura-branding`, aplicando `.claude/commands/verify-epic-e2e.md` **del monorepo**. Limitar la continuación a Nube y estas ramas. Prerrequisitos: ambos worktrees, Node 24.18.0, puertos aislados, Core/DB privados y semillas de tenant/SitePages ES/EN si se verifica el modo API real. Este cambio no añade migraciones ni operaciones autenticadas. El banco debe mapear `WEBSITE_URL`, `DEVELOPER_URL` y `SITE_DESTINATION_ORIGINS` a sus orígenes locales. No usar QA ni producción como sustitutos del banco.

## Resultados finales

- Website: 32/32 casos dirigidos pasaron, sin reintentos; incluyen ES/EN, enlace y teclado, selección ilustrativa, ausencia de overflow y accesibilidad en 1440×900, 360×800, 390×844, 768×900, 430×932 y 844×390, más compatibilidad de contenido incompleto por tenant. `test-results/.last-run.json` conserva `status: passed`.
- Website: build SSR correcto; `npm run typecheck`: 0 errores, 0 warnings, 27 hints existentes; `npm run check` correcto, incluidos sus 53 controles negativos. Logs locales en `test-results/nube-typecheck.log` y `test-results/nube-check.log`.
- Developer: `pnpm typecheck` y `pnpm build` correctos. Build conserva avisos de anclas de Scalar en rutas existentes; no provienen de Nube. Log local en `.docusaurus/nube-build.log`.
- Developer: servicios y 21 controles negativos/2 corpus positivos, tono editorial, contrato, diseño, assets de agentes y exportación Markdown correctos. `check:agent-docs` valida 65 páginas Markdown.
- HTML generado y HTTP: guía 200, un H1 «Nube», disponibilidad correcta, enlace en sidebar, una tarjeta en Inicio y exportación `/docs/saas/1platform-api/nube.md` registrada en `llms.txt`.
- Chrome: revisión visual de la tarjeta y la guía en escritorio. Selección comprobada de 3 a 4 capacidades, con `Nube · DISPONIBLE` en el mapa; el vínculo del website abrió la guía del build local. La guía hereda el diseño nativo actual de Docusaurus; no se copió el HTML estático del prototipo. No se afirma revisión visual móvil completa del portal en esta implementación.
- La sesión de ejecución se reinició durante las compilaciones; se conservaron los worktrees y el resultado terminado de las 32 pruebas, y se repitieron los checks de tipos/build cuyo resultado final no quedó disponible.

Previews de revisión (procesos locales de esta sesión):

- Website: <http://127.0.0.1:4566/es/#capacidades>
- Nube: <http://127.0.0.1:4567/docs/saas/1platform-api/nube/>

Sin ejecución del E2E canónico, CI remota, PR, merge ni publicación. Ninguna API de aprovisionamiento fue ejercida: se implementó la presentación y documentación solicitadas.
