# Banco real — servicios uniformes de Vende Fácil

Verificación autorizada por el usuario («sí ejecuta») el **2026-10-03**, con la
skill y `.claude/commands/verify-epic-e2e.md` del **monorepo**, y arranque conforme
a `/levantar website --e2e-local vendefacil-servicios-uniformes`.

**Resultado: banco aprobado.** 202 comprobaciones de HTTP/auth/Mongo/navegador,
control y reversión correctas; un hallazgo de reversión corregido en este PR.
No quedó ningún defecto o prerrequisito de esta verificación abierto: **0 issues**.
Merge, publicación y activación remota siguen sin ejecutar ni autorizar.

## Identidad y aislamiento

Website rama `52d9461`, control `origin/main=d67df796`; API rama/control
`origin/main=f020ba4753428e5824fb2f4bb008fd41a856dc1c`, actualizado en esta corrida.
El código del renderer no cambió durante el banco; el único cambio funcional
posterior está en la herramienta **offline** de reversión, ejercida antes del PUT.
Los demás cambios de este cierre son sondas, regresión y documentación.

Tabla ejecutada antes de ejercer los criterios (el `/` sin Host devuelve 404
correctamente; health API y páginas con Host dieron 200):

```text
SERVICIO   PUERTO PID     RAMA                             SHA       HTTP  WORKTREE
api-rama   8710   19202   HEAD                             f020ba47  404   /Users/staimer/Documents/1platform-worktrees/vendefacil-servicios-uniformes-api
web-rama   5021   20444   feat/vendefacil-servicios-uniformes 52d9461   404   /Users/staimer/Documents/1platform-worktrees/website-vendefacil-servicios-uniformes
api-control 8810   20443   HEAD                             f020ba47  404   /Users/staimer/Documents/1platform-worktrees/vendefacil-servicios-control-api
web-control 5121   20445   HEAD                             d67df79   404   /Users/staimer/Documents/1platform-worktrees/website-vendefacil-servicios-control
BANCO OK: todos los servicios salen de worktrees aislados

```

- Slots rama **7**, control **8**. Website `5021/5121`; API `8710/8810`.
- DB propia `e2e_vendefacil_servicios_uniformes`, contenedor
  `mongo-e2e-vendefacil-servicios-uniformes`, loopback `27107`, `mongo:7`,
  `nofile=64000`. Ambos binarios usan exactamente esta misma base.
- Perfil Colima exclusivo `vfs-bench`, Docker context `colima-vfs-bench`,
  creado con `--activate=false`. El perfil compartido estaba lleno; no se borró
  ni reinició ningún recurso ajeno. El contexto activo siguió siendo `colima`.
- Venvs propios Python 3.14 con todos los pines de `requirements.txt` del API;
  FastAPI 0.128.0/Pydantic 2.12.4. Node 24.18.0, builds Astro SSR productivos.
- Website: `SITE_MANIFEST_SOURCE=api`, `SITE_API_BASE_URL` a su API del mismo
  slot. Los logs del API prueban las lecturas reales de manifiesto, páginas y
  reseñas; sin servidor de fixtures, MSW, cambios de Host de tenant ni QA fallback.
- App JWT obtenido por `/api/v1/auth/token`; staff/owner JWT firmados sólo con la
  clave efímera local y validados por los guards reales y los sujetos de Mongo.
  Ninguna dependencia de auth se reemplazó. No se mintearon sesiones remotas.

## Datos reales y límites

Censo público de sólo lectura en PROD y QA: [formas y hashes](bank/census.json).
PROD publica `/` con 413 claves, `/access/` y `/request-access/` con 18 cada una,
y `@common` con 44. QA no tiene Vende Fácil ni Medipago (404); sí 1Platform.
La semilla usa las formas publicadas actuales de PROD para los tres tenants y
ambos idiomas de 1Platform. Añade un borrador privado local para probar preservación.

Las reseñas públicas de Vende Fácil son **0**, promedio `null`: el banco conservó
la ausencia de testimonios, sin copiar el demo del prototipo. No se ejerció la
administración de reseñas ni el login del Dashboard, que no cambian en esta épica.
Los enlaces de acceso apuntan al destino completo configurado (incluye `/app/`),
y los comerciales al WhatsApp del tenant; se verificaron sin enviar mensajes.
No se hicieron operaciones de tienda, correo, entrega o publicidad.

## Casos probados

| Criterio / recorrido real | Resultado |
|---|---|
| `/` antes de activar: Vende Fácil, Medipago, 1Platform `/` y `/es/`, tres tamaños | 12 pares PNG idénticos rama/main; 36 comprobaciones |
| Exportar todas las páginas con staff; ocultar borrador al público; preparar diff | 4/4; 413→456, +43/2 cambios/0 borradas |
| Activar por PUT real; releer Mongo; preservar manifiesto, otras páginas y borrador | 13/13, incluye drift real y plan alterado rechazados |
| Dueño edita texto; no puede cambiar modo/icono/ancla/contacto; guards de proveedores | 28/28, rechazos 422; dueño no entra a staff, anónimo no escribe |
| `/` activo: seis tarjetas, siete anclas, CTA, teclado, foco, movimiento reducido, Axe | 76/76 con los recorridos siguientes |
| `/acceso/` y `/solicitar-acceso/`: destinos correctos, contenido completo | Incluido en los tres tamaños, sin navegar al servicio externo |
| `/#su-panel` y `/#calculadora`: Q480/Q0, filtros, 250 al 3,50%, error -1 | Incluido; saldo/porcentaje sólo ilustrativos |
| Control `main` con el mismo contenido activo | 2/2: 503, falla la misma premisa de seis tarjetas |
| Medipago y 1Platform después de activar Vende Fácil | 9 pares PNG idénticos; 27 comprobaciones |
| Reversión real con precondiciones; BSON y páginas no tocadas | 7/7; 456→413, nuevo snapshot obligatorio para reaplicar |
| `/` después de revertir | 3 pares PNG idénticos rama/main; 9 comprobaciones |

Los contadores son comprobaciones, no historias nuevas. JSON por fase en `bank/`.
Después de la pausa, la VM y los servicios estaban detenidos. Se repitió la
semilla en una base privada nueva para comprobar idempotencia: conservó los
identificadores de 3 Apps, 2 usuarios, 1 Website, 3 tenants y 63 páginas, además
del contenido de las páginas. Archivo de credenciales con permisos 0600.
[Resultado separado de las 202 comprobaciones](bank/seed-idempotence.json).
El [censo final](bank/census-final.json) repitió 20 GET públicos: PROD 10/10 en
200, QA conserva los mismos tenants presentes/ausentes. No hubo escrituras remotas.

## Hallazgo corregido durante el banco

**Técnico:** `assertCurrent(plan, current, 'rollback')` reconstruía el payload de
aplicación mezclando `plan.rollback.blocks` con el parche. Esa mezcla ocultaba
una alteración en el valor anterior de una clave reemplazada: por ejemplo,
`photographic.solutions.links.4.label`. La sonda sobre el snapshot real aceptó
el plan alterado; **no se envió ese PUT**. Evidencia:
[reproducción](bank/rollback-tampered-repro.json).

Se validan ahora las precondiciones originales de **cada una de las 45 claves**
del parche antes de aceptar reversión. La regresión recorre las 45; la sonda
real rechazó el plan alterado y aceptó el original, y entonces revirtió por API.

**Negocio:** la **reversión de servicios** podía restaurar un texto alterado en su
archivo de recuperación después de la revisión. Problema: se habría perdido el
texto anterior; ahora la comprobación detiene esa reversión antes de escribir.

## Revisión visual personal

Se abrieron las capturas del banco y sus referencias equivalentes; no se dedujo
fidelidad de un test verde. Seis tarjetas iguales, en el orden solicitado:

| Viewport | Cada tarjeta (CSS px, contenido natural) |
|---|---|
| 1440×900 | 413.33×697.70 (subpíxel 413.34 en una columna) |
| 390×844 | 350×686.19 |
| 844×390 | 772×381.45 |

Los 18 textos normalizados coinciden con el prototipo, sin recortes internos ni
overflow horizontal. En escritorio se ven dos filas alineadas; en móvil,
tarjetas verticales con CTA completo; en horizontal, texto e ilustración lado a
lado y CTA alcanzable desplazándose. Meta Ads continúa debajo a todo el ancho.
El encabezado conserva el espaciado de `main`, ya documentado como diferencia
anterior frente al prototipo. Acceso/alta y calculadora en error son legibles.

Capturas seleccionadas del banco real:
[escritorio](bank/bank-1440-3.png), [tienda móvil](bank/bank-390-4.png),
[correo móvil](bank/bank-390-5.png), [horizontal arriba](bank/bank-844-4.png),
[horizontal CTA](bank/bank-844-tienda-online-bottom.png),
[anuncios](bank/bank-1440-anuncios-bottom.png), [acceso](bank/access-390.png),
[alta](bank/request-access-390.png), [error](bank/calculator-error-390.png).
El juego completo, incluidas referencias, controles y fallos de andamiaje,
queda en `epics/vendefacil-servicios-uniformes/evidence/bank/` del monorepo.

## Gates y desviaciones

Después del arreglo: typecheck **0 errores/0 warnings/27 hints**; build correcto;
guard y **53 self-tests**; suite completa **502 pass/24 skips**; Linux visual
**8/8** en el Docker aislado. Ninguna baseline cambiada. Los 24 skips pertenecen
al carril de pruebas que ya exigía un banco aparte; no se contabilizan como éxito.
CI se consulta en el HEAD final del PR, separado de estos resultados locales.

Limpieza: la semilla ejecutó su teardown sobre la DB de nombre exacto; el
contenedor propio ya no existe y el perfil `vfs-bench` quedó detenido. Los cuatro
puertos de servicio están libres. Se retiraron los dos worktrees de control
limpios; permanecen los worktrees candidato Website/API y la evidencia privada.
El checkout compartido, el worktree de la landing anterior y los otros perfiles
Colima no se modificaron.

La sonda inicial vio contenido stale tras el PUT: se añadió espera por la
generación persistida (máximo 75 s, cache real de 60 s), sin reiniciar el servidor.
También se corrigieron dos supuestos del andamiaje: Axe requiere contexto
explícito y acceso conserva el destino completo, no reconstruye `/auth/login`.
Los logs iniciales se preservaron; no se cambiaron expectativas de producto.
El control también tarda en recuperar su copia previa tras rollback: se espera
200 + calculadora + ausencia de tienda, nunca una pantalla de error como éxito.

## Reproducción

1. Revalidar PR/head y worktrees. API rama/control desde el SHA de arriba (o
   main fresco, declarando la diferencia), con venv propio y pines instalados.
2. Crear una Mongo privada conforme al comando del monorepo, slots 7/8 libres
   o recalculados. Generar secretos locales aleatorios en `env.sh` (0600), fuera
   del repo; nunca copiar un `.env` remoto. Configurar DB exacta indicada arriba,
   `ENVIRONMENT=development`, `AGENT_SCHEDULER_ENABLED=false`, claves JWT/Fernet
   válidas y `DEFAULT_ADMIN_API_KEY`/`DEFAULT_APP_API_KEY` locales.
3. Desde Website: `python3 tests/bench/census_vendefacil_services.py <banco>/censo`.
4. Desde API, con su venv/env: `python <website>/tests/bench/seed_vendefacil_services.py
   --census <banco>/censo --out <banco>/seed.json`. La semilla exige DB local con
   nombre exacto y menos de 50 Apps; credenciales sólo en archivo 0600.
5. Ejecutar `/levantar website --e2e-local vendefacil-servicios-uniformes --slot 7
   --api-worktree <api-rama>` y control en 8, misma DB. El API puede usar su
   `tests/bench/run_bench_api.py` con `BENCH_SELF_API_BASE_URL` de su slot para
   mantener incluso el crédito interno apuntado al banco. Website usa el Node
   SSR productivo con `SITE_MANIFEST_SOURCE=api`/`SITE_API_BASE_URL` locales.
6. Ejecutar el guard del monorepo con los cuatro procesos: exigir `BANCO OK`.
7. Desde API: `python <website>/tests/bench/probe_vendefacil_services.py <fase>
   --bench <banco> --website <website>` con fases `snapshot`, `apply`, `security`,
   `rollback`. Defaults API/Website 8710/5021; adaptarlos si cambian slots.
8. Entre snapshot y apply, desde Website: `node tests/bench/browser_vendefacil_services.mjs
   before <capturas>`. Después de apply/security: `active`, `control`, `regression`.
   Después de rollback: `rollback`. URLs/slots están declarados al inicio del
   script; adaptarlos juntos si los slots libres son otros.
   `VFS_REFERENCE_URL=http://127.0.0.1:4466/` añade comparación al prototipo vivo.
9. Abrir las capturas. Guardar sólo resultados sin credenciales. Teardown de
   semilla con los mismos argumentos + `--teardown`, detener los cuatro procesos
   propios y el contenedor/perfil propio; retirar controles limpios.

Los snapshots de staff, planes, tokens y entorno privados no se commitean ni se
usan para activar producción. La activación futura necesita un snapshot nuevo,
autorización separada y el orden del [runbook](../../content-patches/vendefacil-servicios-uniformes/ACTIVACION.md).
