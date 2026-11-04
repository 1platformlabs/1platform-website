# Nube: verificación y release

Alcance autorizado el 2026-11-04: preparar las ramas de Website y Developer y mergear cuando estén listas para producción. Sólo Nube; la épica histórica de infraestructura es contexto, no alcance de merge.

## Verificación E2E del monorepo

Candidatos runtime: Website `f7f4f3038a3c8469c816b6303ceaad169eb52778`; Developer `d4b1107840102c5d41cabeefe478493857ce98e9`. Core rama/control `66dbe13f8694b83ea0a24c7fef1384874436ed3a` sin cambios de producto. Los commits posteriores sólo añaden pruebas y evidencia.

Banco por el flujo `.claude/commands/levantar.md --e2e-local nube-disponible`: slots 6/7, Mongo privado 27106 (`e2e_nube_disponible`), almacenamiento real privado 9106, API completa sin reload, SSR de producción, Docusaurus build, sin MSW, interceptores ni fallback a QA. Se usaron secretos nuevos locales; los logos públicos se verificaron por SHA y se guardaron en el almacenamiento privado. Debido al disco interno de Docker lleno, los datos se montaron en carpetas propias del banco en la Mac. No se limpió almacenamiento ajeno.

```text
SERVICIO   PUERTO PID     RAMA                             SHA       HTTP  WORKTREE
api        8610   94802   HEAD                             66dbe13f  404   /Users/staimer/Documents/1platform-worktrees/nube-disponible-api
website    4921   51890   feat/nube-disponible             f7f4f30   404   /Users/staimer/Documents/1platform-worktrees/nube-disponible-website
docs       3601   89473   docs/nube-disponible             d4b1107   200   /Users/staimer/Documents/1platform-worktrees/nube-disponible-developer
control-api 8710   94858   HEAD                             66dbe13f  404   /Users/staimer/Documents/1platform-worktrees/nube-control-api
control-web 5021   52549   HEAD                             f2e9d4d   404   /Users/staimer/Documents/1platform-worktrees/nube-control-website
control-doc 3701   76099   HEAD                             214118b   200   /Users/staimer/Documents/1platform-worktrees/nube-control-developer
BANCO OK: todos los servicios salen de worktrees aislados
```

Los 404 de la raíz del API y del website con Host loopback son correctos. Health de ambos Core 200; homes bajo Host real 200. Las APIs del website son las de su mismo slot, comprobadas por el censo inicial, la modificación de los datos privados y los logs de acceso. El flujo es público y no requiere autenticación; no se verificó aprovisionamiento de servidores ni operaciones autenticadas ajenas al cambio.

Casos probados: 2 lecturas iniciales de ES/EN reprodujeron los estados antiguos desde los datos públicos. Luego 15/15 casos: home y guía en ES/EN con 1440×900, 360×800, 390×844, 430×932 y 844×390; selección ilustrativa y estado del mapa; foco y Enter en el enlace; guía 200, H1 y disponibilidad; tarjeta de Inicio de docs en escritorio/móvil; comparación con main sin enlace y guía404; Medipago/Vende Fácil con cuerpos idénticos a main.

El control usa la misma DB que la rama. La disponibilidad es contenido y por ello se ve en ambas al cambiar la DB; lo que discrimina el código es el enlace ausente en main y la guía404 en el portal control. El seed corrió dos veces y mantuvo los 68 IDs y sus flags de publicación: sólo cambió `infrastructure.capabilities.cloud.status` de oneplatform en ES/EN. El website conserva su caché stale-while-revalidate de 60s; la prueba espera la versión publicada sin reiniciar servidores ni borrar almacenamiento del navegador.

Se abrieron e inspeccionaron las capturas de todas las dimensiones: la tarjeta y sus textos/enlace están completos; la guía y su tarjeta de Inicio mantienen el diseño nativo y la lectura móvil. Las capturas de home están desplazadas a Nube; la cabecera y el botón flotante conservan su comportamiento previo.

Harness reproducible: `tests/bench/seed_nube.py` desde el worktree API con su venv, el entorno privado y `--census <directorio> [--available] [--brand-assets]`; `NUBE_EVIDENCE=<directorio> node tests/bench/nube.real.mjs`. `NUBE_PHASE=legacy` comprueba los valores previos. El censo se obtiene mediante `tests/bench/census_vendefacil_services.py`; se validan únicamente los documentos públicos porque son los que lee este flujo. Los snapshots no sirven como export administrativo completo ni como paquete de reemplazo de PROD.

Evidencia local: `artifacts/nube-disponible/{banco-identidad.txt,db-preservation.json,available-results.json,legacy-results.json,*.png}`. Banco apagado después de revisar las capturas; sólo se detuvieron los seis procesos y dos contenedores propios.

## Publicación y reversión

Orden: Developer publicado y comprobado vivo antes de Website. Developer PR publica QA automáticamente; al preparar el PR no había corrida QA activa. Website PR valida sin publicar QA. Ambos merges disparan prod.yml y publicación al dedicado; los jobs cPanel de PROD están deshabilitados. No hay dependencias nuevas, variables nuevas ni migraciones.

Bases de reversión: Website `f2e9d4d8721c26cdba40adfed52ec32e5f4be528`, Developer `214118bce5890313f7eeb2d61ded5192b67505de`. Recuperación normal: revert de los commits del incremento mediante PR y pipeline normal. Para degradación activa: en el checkout de despliegue propio del host, preservar .env.prod, verificar el SHA previo, reconstruir ese SHA y ejecutar el helper existente `./deploy.sh prod build`, `stop`, `start`, comprobando Host y health. No usar un dispatch desde tag como supuesto rollback: los jobs de versión/release también se ejecutarían. Website usa /home/apps/1platform-website y3040; Developer /home/apps/1platform-api-developer y3042. No tocar otros contenedores.

La escritura de los dos valores publicados de SitePages tiene autorización separada pendiente. Sin ella, el código puede publicarse pero la etiqueta actual de producción permanece. Nunca reemplazar los documentos con el censo público; reconciliar y modificar sólo esas dos claves sobre documentos actuales.

## Gates locales finales

Website: typecheck, build SSR, guard de diseño/proveedores con53 controles negativos, preparación de contenido, 597 tests aprobados/25 casos externos omitidos preexistentes; banco real separado 15/15 y2 comprobaciones de estado previo. Las dos expectativas obsoletas de10 enlaces fallaron y se corrigieron a11. Comparador byte a byte: rojo sólo en las2 homes por el estado/enlace; tras revisar y congelar esos dos cuerpos,100/100 rutas idénticas. Visual Linux: rojo en las4 homes, revisadas actual/diff/expected; cambios limitados al estado/enlace de Nube y desplazamiento posterior. Se aceptaron sólo esas4 referencias; comparador final11/11, incluyendo7 capturas de otros tenants intactas.

Developer: types/build, guards y controles negativos, servicios, tono, referencias, assets de agentes, export Markdown, search/docs/prompt runtime y serving correctos. Build final con orígenes públicos predeterminados. Avisos de anclas Scalar preexistentes, sin nuevos avisos de Nube.

PR Developer: https://github.com/1platformlabs/1platform-api-developer/pull/91 . Sin merge aún.
