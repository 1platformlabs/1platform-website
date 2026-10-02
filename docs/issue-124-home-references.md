# Issue #124: referencias de las homes aprobadas

Fecha: 2026-09-26. [Issue original](https://github.com/1platformlabs/1platform-website/issues/124).

El gate local premerge pasa después de reconciliar las referencias del rediseño
fotográfico aprobado. El usuario solicitó resolver este issue después de que
la corrida E2E dejara expresamente pendiente la autorización para cambiarlas.
Esta actualización declara las diferencias revisadas de las dos homes; no
modifica el producto, los comparadores ni sus tolerancias.

## Causa y alcance

La implementación de 1Platform (`79c6055`) usa la composición compartida
`photographic-service`, mientras las referencias seguían describiendo
`platform-commerce`. Antes del ajuste se reprodujeron exactamente los fallos
documentados: 98/100 rutas HTML idénticas y cuatro capturas de clínica correctas,
con diferencias sólo en las homes de 1Platform EN/ES, escritorio/móvil.

Se conservaron los worktrees existentes y se actualizó la referencia remota:
`origin/main` sigue en `1c1ab4955db2484b6715d9d1ed30d6c13b3f35a4`, ya contenido en
la rama `feat/medipago-hero-review`. El código verificado parte de `22d470b`.

Cambios de referencias:

- `tests/baseline/html/index.html` y `es/index.html`, servidos por el adaptador
  Node con `Host: 1platform.pro` y `SITE_MANIFEST_SOURCE=repo`.
- Sólo los campos `sha256` y `bytes` de `/` y `/es/` en `baseline.json`.
- Cuatro PNG Linux de `tests/visual/home.spec.ts-snapshots/`, inspeccionados:
  [EN escritorio](../tests/visual/home.spec.ts-snapshots/home-en-1440-chromium-linux.png),
  [ES escritorio](../tests/visual/home.spec.ts-snapshots/home-es-1440-chromium-linux.png),
  [EN móvil](../tests/visual/home.spec.ts-snapshots/home-en-390-chromium-linux.png) y
  [ES móvil](../tests/visual/home.spec.ts-snapshots/home-es-390-chromium-linux.png).

Las otras 98 entradas y sus cuerpos HTML, los cuatro PNG de clínica, los estados
HTTP y redirects, el inventario de ocho PNG, los normalizadores y el umbral visual
del 1 % permanecen intactos. También los 28 hashes del prototipo aprobado.
No se cambió código de producción, dependencias, API, configuración comercial,
seeds ni datos remotos. Las capturas Medipago generadas por la suite se guardaron
como evidencia aparte, sin sustituir sus archivos versionados.

## Procedimiento reproducible

1. Guardar hashes de referencias, specs, configuraciones y guards. Reproducir
   `npm run check:baseline` y `npm run test:visual` antes de editar.
2. Construir y servir el adaptador Node local, puerto libre `4433`, modo `repo`.
   Ejecutar `scripts/freeze-baseline.mjs` desde un directorio temporal que contenga
   una copia de `tests/baseline/baseline.json`. El script produce allí su candidato
   completo de 100 rutas. Incorporar únicamente los dos cuerpos indicados y sus
   campos `sha256`/`bytes`; detener ese servidor propio.
3. Regenerar exclusivamente `tests/visual/home.spec.ts`, proyecto `chromium`, con
   `--update-snapshots=all` dentro de `mcr.microsoft.com/playwright:v1.61.1-jammy`.
   No ejecutar el actualizador sobre las referencias de clínica. Los cuatro PNG
   resultantes coinciden byte por byte con las capturas independientes anteriores
   a la regeneración; se inspeccionaron las cuatro páginas completas y los
   recortes móviles legibles.
4. Ejecutar secuencialmente los comandos de la tabla. Las suites comparten `dist/`.
   Comprobar hashes y diff para demostrar que no cambiaron guards ni referencias
   ajenas al alcance.

## Resultados locales

| Comando | Resultado |
| --- | --- |
| `npm run check:baseline` (incluye build) | 100 idénticas; 0 distintas; 0 estados/destinos incorrectos |
| `npm run check` | Guards aprobados; 43 self-tests aprobados |
| `npm run typecheck` | 233 archivos; 0 errores; 0 warnings; 27 hints existentes |
| `npm test -- --workers=4` | 318 aprobadas; 12 del banco privado omitidas intencionalmente en esta suite |
| `npm run test:visual` | 8/8 aprobadas en el contenedor Linux fijado, sin actualización durante la comparación |

El banco real **ya ejecutado** para esta implementación aprobó por separado esos
12 casos de navegador y 42 verificaciones HTTP/DB con Mongo privado, API, auth y
control `origin/main`. No se presenta la suite de fixtures como sustituto de ese
banco, ni se repitieron sus escrituras locales para un cambio sólo de referencias.

El expediente de esta resolución está en el monorepo:
`artifacts/medipago-e2e-2026-09-25/issue-124-20260926/` (logs antes/después,
inventario y auditoría por hashes, capturas e informe). El banco anterior está en
`artifacts/medipago-e2e-2026-09-25/verify-real-20260926/RESULTADO.md`.

## Entrega

Website: `artifacts/landing-review-worktree`, rama `feat/medipago-hero-review`.
API conservada: `artifacts/api-landing-review-worktree`, rama
`feat/website-two-tenant-landing-api`, commit `9eff4bc8`; sin cambios en esta resolución.
No hubo push, PR, merge, despliegue ni escrituras remotas de configuración.
El gate local aprobado no representa CI remota ni activación en producción.
