# Activación pendiente: servicios uniformes de Vende Fácil

**No aplicado.** Esta continuación sólo prepara contenido. Requiere autorización
posterior, verificación real del monorepo y publicación del renderer antes de
cualquier escritura remota. El PR anterior #136 está mergeado y su contenido ya
está activo; no reutilizar su parche ni su snapshot de 327 claves.

## Alcance y diff

`patch-root.es.json` es la fuente única del cambio: **45 claves**, sólo en `/`,
locale `es`, tenant `vendefacil`. La lectura pública del 2026-10-03 da
**413 → 456 claves: 43 nuevas, 2 cambiadas, 0 eliminadas**. El diff exacto está en
`public-diff-2026-10-03.json`. Esa lectura pública omite borradores y metadatos de
staff: **no sirve como punto de reversión**.

- Tienda en línea y Correo profesional, con sus textos e ilustraciones del prototipo.
- `photographic.solutions.mode=uniform` activa la cuadrícula común de seis tarjetas.
- Accesos directos: cobros, enlaces, facturación, Delivery, tienda, correo, anuncios.
- Mensajes comerciales nuevos `contact.messages.store` y `.email`.

El destino se sigue leyendo del manifiesto: `https://wa.me/50236532841`. No se
modifica ningún destino, identidad, tarifa, reseña, otra página ni `@common`.
`verticals.ads.mode=meta`, todos sus marcadores y su protección se conservan.
Los campos `.mode`, `.href`, `.icon` y `contact.messages.*` ya corresponden a
configuración de staff según el contrato del API. No hay migración de base de datos.

## Preparar desde un snapshot actual

Desde una sesión de staff autorizada, exportar **sólo los datos** de:

- `GET /api/v1/platform/sites/vendefacil` → `manifest`.
- `GET /api/v1/platform/sites/vendefacil/pages` → `documents` (todos, incluidos borradores).

Guardar `{ "manifest": ..., "documents": [...] }` como `before.json`, en una
carpeta privada duradera fuera del contenedor. No incluir headers, cookies ni
tokens. Cada documento conserva `published`, `updated_at` y los demás metadatos.
No emitir sesiones nuevas ni usar el script histórico de activación para esto:
su marca de renderer sólo acreditaba #136, y no estos servicios.

Desde el worktree del Website:

```bash
node scripts/prepare-vendefacil-services.mjs plan /ruta/privada/before.json /ruta/privada/plan-nuevo
```

El comando **no usa red ni credenciales**. Rechaza otro tenant/host/contacto,
contenido ya activado, conflictos de propiedad con otras páginas y cambios en
las claves que reemplaza. Preserva claves ajenas, estados de publicación y
manifiesto; no reemplaza carpetas ni puntos de reversión existentes. Produce:

- `plan.json`: precondiciones, diff por clave, hashes del manifiesto y otros documentos.
- `apply.body.json`: cuerpo completo del único PUT de `/` es.
- `rollback.body.json`: cuerpo exacto anterior, incluido `published`.
- `before.json`: copia del snapshot utilizado.

Revisar los 45 cambios. Si los conteos difieren del censo público, explicar la
edición concurrente y revisar el plan nuevo; no usar el fixture como sustituto.

## Aplicación futura autorizada

1. Verificar el PR/HEAD y publicar el Website por su flujo normal autorizado.
   Con el contenido anterior, la home debe responder 200 e incluir
   `<meta name="photographic-capabilities" content="uniform-services-v1">`.
   La marca existe **antes** de activar. El renderer antiguo ignora tienda/correo
   pero rechaza las anclas nuevas: activar primero podría dejar la home en 503.
2. Releer manifiesto y TODOS los documentos de staff inmediatamente antes de la
   escritura, como `fresh.json`, y ejecutar:
   ```bash
   node scripts/prepare-vendefacil-services.mjs check-apply /ruta/privada/plan-nuevo/plan.json /ruta/privada/fresh.json
   ```
   Compara también `updated_at` y detecta alteraciones del plan/parche. El API no
   ofrece compare-and-swap: coordinar una pausa de edición durante lectura + PUT;
   esta comprobación reduce la ventana, no constituye una transacción.
3. Usando la sesión de staff autorizada (app token + `x-user-token`), enviar
   **sólo** `apply.body.json` como JSON a
   `PUT /api/v1/platform/sites/vendefacil/pages?route=/&locale=es`.
   No actualizar el manifiesto ni enviar el parche parcial como documento completo.
4. Releer todo por staff. Comparar `/` contra `plan.apply` (bloques y `published`),
   otros documentos contra `otherDocuments`, y manifiesto contra `manifestHash`.
   `updated_at` de `/` cambia por la escritura; los otros documentos deben conservarse.
5. Verificar la home con contenido fresco (`x-site-content-age` ausente o <60).
   La caché puede servir contenido antiguo mientras refresca; no juzgar una copia
   stale. Comprobar siete anclas, seis tarjetas y CTA por WhatsApp con su mensaje,
   Meta Ads debajo, acceso/alta, calculadora/panel, reseñas y tres viewports.
   No enviar mensajes, comprar, crear cuentas ni publicar campañas como parte del smoke.

## Reversión futura autorizada

**Contenido antes que renderer.** Releer el snapshot actual y ejecutar:

```bash
node scripts/prepare-vendefacil-services.mjs check-rollback /ruta/privada/plan-nuevo/plan.json /ruta/privada/fresh.json
```

Sólo si `/` sigue siendo lo aplicado y el manifiesto/otras páginas no cambiaron,
enviar `rollback.body.json` por el mismo PUT. Comparar la relectura con
`plan.rollback`. Si hay edición posterior, el comando se niega: reconciliarla
manualmente; no hay `--force`. Conservar el punto de reversión fuera de `/tmp`.
Después de revertir se necesita un snapshot nuevo para volver a aplicar, porque
`updated_at` habrá cambiado. Nunca volver a tomar como «before» el contenido ya activado.

## Evidencia y límites

Las pruebas automatizadas ejercen preparación, rechazo de drift/planes alterados,
preservación y reversión con snapshots sintéticos. Los navegadores prueban el
Astro SSR real contra respuestas HTTP de fixtures. El diff público es lectura
actual; **no se ha ensayado el PUT contra API/auth/DB reales para esta continuación**.
Ese ensayo corresponde a `/verify-epic-e2e vendefacil-servicios-uniformes` del
monorepo, antes del merge y sin activar producción.
