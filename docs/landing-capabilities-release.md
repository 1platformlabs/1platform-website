# Landing: catálogo de capacidades

Integra el prototipo aprobado `epics/1platform-infraestructura-branding/prototipo`: 17 tarjetas, sin enlaces individuales de documentación, sin las etiquetas obsoletas de Agentes y Nube. Conserva las advertencias de suscripciones, publicidad y activación integral con un clic. ES y EN.

## Contenido publicado

El Website SSR lee SitePages; el catálogo del repositorio no sustituye contenido de producción. `docs/landing-capabilities-content.json` contiene el cambio revisable de 16 claves por idioma (12 nuevas, 4 actualizadas), sólo tenant `oneplatform`, ruta `@infrastructure-home`. No modifica otras rutas, tenants, IDs ni flags de publicación. Los estados antiguos pueden permanecer almacenados, pero ya no se renderizan.

`scripts/update-landing-capabilities.py` es dry-run por defecto. Se ejecuta con el intérprete/entorno del Core y su directorio en PYTHONPATH. `--apply` requiere autorización adicional para producción. Verifica tenant/domain/documentos publicados, compara valores anteriores, lee exclusivamente el patch versionado y guarda respaldo con modo0600 en un directorio temporal privado, avanza updated_at (token de concurrencia del Core), actualiza por compare-and-swap y revierte sus propias escrituras si una segunda operación falla. No importa snapshots completos sobre producción. Aplicado dos veces en el banco: 2 documentos actualizados y luego0.

El despliegue del código es compatible con contenido anterior: Cloud requiere nombre+descripción; cada nueva tarjeta requiere ambos textos publicados en el locale solicitado. Ausentes o vacíos no producen fallback ni503.

## Verificación E2E del monorepo

Flujo `.claude/commands/levantar.md --e2e-local landing-capabilities-refresh`, según `.claude/commands/verify-epic-e2e.md`. Node24.18.0. Core rama/control `d1648d657`, Website control `b676e9dc74e5c1f0881f4a32bd36248c5ec8cce4`. Banco privado Mongo27106 (`e2e_landing_capabilities_refresh`, caché0.5GB), MinIO9106, Core8610/8710, Website4921/5021; APIs completas, SSR de producción, sin MSW, interceptores, QA ni fallback a producción.

Worktrees en `/Users/staimer/Documents/1platform-worktrees/`: `landing-capabilities-website`, `landing-capabilities-control-website`, `landing-capabilities-api`, `landing-capabilities-control-api`. Identidad comprobada con `.claude/bin/e2e-banco-identidad.sh`: BANCO OK. El404 en la raíz loopback es esperado; health Core200 y homes bajo sus hosts reales200.

Casos: 4 lecturas previas ES/EN en rama/control reprodujeron11 tarjetas. Rama ya sin enlaces ni estados; control conserva11 enlaces y WhatsApp en preparación. Después del patch privado,14 casos reales: ES/EN por1440×900,360×800,390×844,430×932,844×390, selección por teclado, estados0/3/17, demo IA, menú/Escape, cero mutaciones del navegador, erroresJS y overflow. Control sigue11 tarjetas y11 enlaces con la misma DB: discrimina el código nuevo. Medipago y Vende Fácil mantienen body text idéntico al control. Capturas de los10 viewports inspeccionadas.

Harness: `tests/bench/landing-capabilities.real.mjs`. Preparación y evidencia local: `artifacts/landing-capabilities-refresh/` (BANK.md, censo público, scripts de arranque, legacy.json, real-results.json, banco-identidad.txt yPNG). Los snapshots públicos no son un export administrativo para reemplazar PROD.

## Gates

- Typecheck:0 errores,27 hints preexistentes; build SSR correcto.
- Guard de diseño y53 controles negativos: verdes.
- Suite navegador Node24:610 aprobados,25 omitidos externos preexistentes. La corrida inicial detectó expectativas antiguas de11 tarjetas/enlaces; se actualizaron. También tuvo timeouts tras una discontinuidad larga del reloj de la Mac; la corrida final completa terminó en1.1min sin retries.
- Banco real:14/14 y4 lecturas de compatibilidad previa. Prueba del actualizador contra Mongo real: dry-run sin escrituras, alcance exacto, metadatos conservados, rechazo de escritor Core obsoleto e idempotencia.
- Baseline HTML: sólo cambian las2 homes; tras inspeccionar y congelar,102/102 rutas iguales.
- Visual Linux: las4 homes cambiaron como se esperaba;7 renders de otros tenants idénticos. Se inspeccionaron y aceptaron únicamente las4 homes. Comparación final11/11 verde.

## Publicación y reversión

PR ejecuta CI sin despliegue QA. Merge a main ejecuta prod.yml al dedicado, health con GIT_SHA, served-claims y notificación automática del pipeline. Sin nuevas dependencias/variables/migraciones. No hay cambios de Core ni Developer para desplegar.

Rollback de código: revert por PR/pipeline; base `b676e9dc74e5c1f0881f4a32bd36248c5ec8cce4`. Ante incidente, reconstruir ese SHA mediante el helper existente del dedicado preservando `.env.prod`. El patch de contenido es compatible con código anterior, que ignora las tarjetas nuevas. Reversión de datos sólo desde respaldo, comparando los valores actuales para conservar cambios concurrentes.

La autorización de textos PROD se pidió separadamente y sigue pendiente; no se ejecutó `--apply` en producción. AGENTS.md y CLAUDE.md no se modificaron.
