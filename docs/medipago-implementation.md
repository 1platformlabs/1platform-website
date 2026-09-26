# Medipago: entrega de la landing aprobada

Fecha: 2026-09-25. Alcance: migración del prototipo aprobado a la home real de
Medipago mediante la arquitectura multitenant existente. No implementa toda
`website-multitenant`, ni modifica el dashboard autenticado, cobros efectivos,
comisiones del motor, retiros o emisión de facturas.

## Fuentes y decisiones

Se leyeron directamente los archivos no rastreados del prototipo en
`/Users/staimer/Documents/1platform-worktrees/medipago-landing-prototype/epics/website-multitenant/prototipo/`.
`evidence/REVISION-AJUSTES.md` prevalece sobre las revisiones anteriores. Los
28 archivos conservan exactamente sus hashes SHA-256 anteriores al trabajo.

Los antecedentes `website-medipago-home-fidelity` y
`api-medipago-home-fidelity` se inspeccionaron y preservaron. Sus cambios ya
integrados no sustituyen el prototipo aprobado. Los nuevos worktrees parten
de `origin/main` actualizado, bases website `1c1ab49` y API `6d4364b0`.

El manifiesto vigente del website es 3.5.17, Astro 7.2.10 con adaptador Node
11.1.5; las referencias antiguas a Astro 5/salida estática están desactualizadas.
No se modificaron dependencias, lockfile, guards ni baselines visuales.

## Integración y archivos

- `src/lib/site-routes.ts` y `src/pages/render/photographic-service.astro`:
  la composición cerrada `photographic-service` entra por el resolver/routing
  actual. `resolve-tenant.ts`, `Home.astro` y `ServiceLeadHome.astro` conservan
  su comportamiento; no hay selección por nombre de tenant en el renderer.
- `src/page-content/PhotographicServiceHome.astro`: composición SSR fiel,
  metadata/FAQ JSON-LD, marca y contacto del tenant, fallback sin JavaScript.
- `src/lib/photographic-content.ts`: mapa `photographic.*` validado,
  destinos HTTPS, iconos/anclas cerrados, cantidades enteras y JSON seguro.
- `src/scripts/photographic-service.ts`: navegación, foco, animaciones,
  pestañas/filtros y calculadora con mejora progresiva, sin escrituras remotas.
- `src/lib/landing-calculator.ts`: redondeo entero en centavos, comisión
  configurable en puntos básicos; fixture Medipago = 490, sin cargo fijo.
- `src/styles/photographic-{service,panel}.css`: estilos aprobados aislados
  por composición, Manrope/Inter, panel y notas a 16 px, navbar fijo móvil,
  movimiento reducido, pausas y footer oscuro.
- `src/lib/{site-api,tenant-theme,brand-fonts.generated}.ts`,
  `scripts/generate-brand-fonts.mjs` y `src/layouts/BaseLayout.astro`:
  catálogo Manrope y activos de marca coherentes; la carga en BaseLayout es
  condicional, sin modificar el HTML de los tenants existentes.
- Assets y licencias: [medipago-assets.md](medipago-assets.md). Fotografía
  original 1.922.281 bytes → WebP 149.170 bytes, sin pérdida de dimensiones.
- Pruebas: `tests/photographic-{content,landing}.spec.ts`,
  `tests/landing-calculator.spec.ts` y fixture contractual de sitio. El test
  de catálogo existente sólo agrega la composición; sus guards se conservan.

La API cambia únicamente enums de composición/fuente, contenido/configuración
inicial de Medipago, guard de publicación y pruebas. La fixture no actualiza
documentos persistidos. El contacto público se obtuvo del manifest real en
lectura: `https://wa.me/50244866448`; los CTA lo reciben por configuración.
No se inventaron redes, páginas legales ni teléfonos.

## Validación local

| Comprobación | Resultado |
| --- | --- |
| `npm run build` | PASS, adaptador Node/Astro real |
| `npm run check` | PASS, 15 reglas y 43 self-tests |
| `npm run typecheck` | PASS, 0 errores/0 warnings; 27 hints |
| `PLAYWRIGHT_PORT=4457 npm test -- --workers=4` | 305 PASS, incluida integración nueva |
| `PORT=4458 npm run check:baseline` | 100 rutas idénticas; 0 diferencias/0 respuestas incorrectas |
| Visual Linux, 1Platform EN/ES y Clínica Delta home/404, escritorio/móvil | 8 PASS, baselines intactos |
| API, pytest focalizado en siete archivos de sitio/contenido/seed/HTTP | 284 PASS; un warning preexistente de `TelemetryAlertIncident.count` |
| API, Ruff de archivos Python modificados | 121 hallazgos, los mismos 121 que la base `origin/main`; 0 nuevos |
| `git diff --check`, ambos repos | PASS |

El comando estándar `npm run test:visual` se intentó y terminó con exit 137
por falta de memoria durante el build dentro de Docker. La corrida equivalente
usó el build nativo ya generado, la misma imagen Linux Playwright 1.61.1 y los
mismos specs/config/baselines; sólo evitó reconstruir dentro del contenedor y
limitó la concurrencia a un worker. No se cambiaron umbrales ni snapshots.
No se atribuye PASS al comando estándar fallido ni a un lint API limpio.
La equivalencia de las rutas existentes también está respaldada por el gate
de 100 respuestas idénticas tras los cambios finales.

La prueba de integración levanta el build Astro y una API HTTP de fixture,
resuelve el Host real `medipago.gt` mediante el resolver existente y prueba
otro tenant con marca, acento, tarifa y contacto distintos. Esa prueba NO es
el banco de `/verify-epic-e2e`: todavía no ejercita API/DB/auth locales reales.

La calculadora verifica Q100.00 → Q4.90 → Q95.10, entradas inválidas,
fracciones y límites; no incorpora impuestos ni cargos. Se verifican enlaces,
anclas, foco/Escape/teclado, controles del panel, pausas reales por transformación,
reanudación, replay, `prefers-reduced-motion`, SSR sin scripts y sin JavaScript.
Axe cubre resumen/facturación/retiros a 1440, 390 y 360 px y el fallback SSR.

Capturas inspeccionadas en [evidence/medipago](../evidence/medipago/): páginas
completas y las tres vistas del panel a 1440/390/360. Las referencias obtenidas
del servidor del prototipo están en `reference/`, a 1440/390. Se compararon
hero, tarjetas, flujo, panel, calculadora y footer directamente. Se corrigieron
la nitidez móvil del hero y la apariencia del CTA real del footer; la diferencia
de altura móvil corresponde a retirar el aviso de prototipo/contacto simulado.
Estas imágenes son evidencia de revisión, no baselines nuevos ni assets servidos.

## Auditoría acotada

Arquitectura y multitenant: resolución y cachés existentes por tenant; contenido,
tema, comisión y destino configurables. Control alterno y regresión de 1Platform
y Clínica Delta. Sin acoplamiento a productos independientes.

Seguridad y datos: sin endpoints nuevos, secretos, HTML arbitrario ni formularios
de pacientes; JSON escapado y enlaces validados. Panel ficticio con créditos
Q480 y saldo retirable Q0 separados. No existen acciones de cobro/retiro reales.

Rendimiento/escalabilidad: SSR Astro, JS pequeño sin framework añadido, fuentes
locales, WebP, imagen secundaria lazy y animaciones pausadas fuera de pantalla.
No cambian consultas, cardinalidad de cachés ni escrituras de base de datos.

Diseño/a11y/SEO: composición aprobada, semántica y foco verificados, datos ficticios
visibles, metadata coherente con facturación automática, canonicals y marca por
tenant. `noindex` sólo depende de `tenant.indexable`, no del prototipo.

Se resolvieron los hallazgos de esta revisión: fallback de pestañas sin semántica
incompleta, carga de las fuentes configuradas en ambas direcciones entre las
composiciones (incluido el control alterno con Space Grotesk),
allowlist de fotografía con claves propias, CSS huérfano y transición de caché
manifest/contenido documentada. No quedan hallazgos críticos/altos conocidos
dentro del alcance revisado. No se atribuye cobertura de código no medida.

## Estado de entrega y activación pendiente

Implementación local y pruebas no equivalen a CI, banco E2E, merge o despliegue.
No se hizo push, PR, merge, deploy ni escritura de datos remotos. Abrir incluso
un PR draft de API dispara `.github/workflows/qa.yml` (`pull_request`
opened/synchronize → job deploy tras tests); por eso no se abrió ese PR bajo
la instrucción de no desplegar. Los cambios quedan en commits locales.

Worktrees persistentes:

| Repositorio | Worktree | Rama |
| --- | --- | --- |
| Website | `/Users/staimer/Documents/1platform-worktrees/website-medipago-approved-landing` | `feat/medipago-approved-landing` |
| API | `/Users/staimer/Documents/1platform-worktrees/api-medipago-approved-landing` | `feat/medipago-approved-landing-api` |

El preview de implementación usa `http://medipago.localhost:4460/` y API fixture
en `127.0.0.1:4461`; no modifica el prototipo en `127.0.0.1:4347`.

## Gate solicitado: `/verify-epic-e2e website-multitenant`

Usar **`.claude/commands/verify-epic-e2e.md DEL MONOREPO`**, en
`/Users/staimer/Documents/1platform`, con alcance exclusivo de esta migración.
No se ejecutó automáticamente: el usuario pidió expresamente autorización
previa. Lo pendiente es el banco con API, Mongo privado, auth y navegador reales,
control negativo contra `origin/main` y activación persistida del tenant.

Prerrequisitos concretos:

1. Ambos worktrees/ramas anteriores; el gate crea además sus controles frescos.
2. Node 24/dependencias del lockfile; Python 3.14/requirements; Docker/Mongo;
   configuración de arranque y dos tokens de auth generados para el banco local.
3. Slot propuesto 1/control 2: API `8110`/`8210`, Mongo privado loopback `27101`,
   DB `e2e_website_multitenant`; Astro `4421`/`4521`, verificando disponibilidad.
4. Resolver primero que `/levantar --e2e-local` pueda registrar el website Astro:
   la versión de `.claude/commands/levantar.md` inspeccionada no tiene esa entrada.
   Si no se puede levantar el proyecto, el gate queda bloqueado con su issue;
   QA/producción no sustituyen este banco.
5. Website con `SITE_MANIFEST_SOURCE=api`, `SITE_API_BASE_URL=http://127.0.0.1:8110`
   (control `8210`), `HOST=127.0.0.1`, `PORT=4421` (control `4521`). Mapear en
   navegador el Host `medipago.gt` al proceso local; agregar controles de otros tenants.
6. Seeds idempotentes de manifest/páginas en URI/DB local explícitas: dominio
   `medipago.gt`, alias `www.medipago.gt`/`medipago.localhost`, soporte público
   confirmado, `home_template=photographic-service`, `display_font=manrope`,
   moneda GTQ/comisión 490 bps. Sin migración de esquema de DB. Primero contenido,
   después publicación; reiniciar workers propios para evitar cachés incompatibles.

Los comandos de seed/PATCH local, orden de activación y precaución contra cambiar
el dominio persistido están en
`/Users/staimer/Documents/1platform-worktrees/api-medipago-approved-landing/docs/medipago-approved-landing.md`.
No se ejecutó ninguno. El futuro paso remoto necesita su propia autorización.

`AGENTS.md` y `CLAUDE.md` del workspace no se modificaron; no se introdujeron
cambios de hechos globales que requieran sincronizarlos.
