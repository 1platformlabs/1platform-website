# Cobros remotos a terminal: landing

Épica `cobros-remotos-a-terminal` (CRT-06, D-11). En PROD el website lee SitePages: la copia de `/payments-invoicing/` y `/solutions/` del tenant `oneplatform` NO sale del repo. El repo aporta la estructura (sección nueva en `PaymentsInvoicing.astro`) y el catálogo de modo `repo`; los textos se publican con parches CAS.

## Orden (pasos del dueño: escriben en PROD)

1. **Aplicar el parche de preparación** (antes de mergear: `t()` lanza ante una clave ausente, así que el código nuevo sin sus claves daría 503 en `/payments-invoicing/`).
2. **Mergear el PR de repo** (publica la estructura; la sección sale con estado «en preparación»).
3. **Encendido** (con `remote_charges_enabled` encendido en PROD y la regresión pasada): aplicar el parche de encendido. No hay cambio de código en este paso.

Cada parche es dry-run por defecto; `--apply` escribe. Se ejecuta con el intérprete y entorno del Core, como en `payment-availability-release.md`:

```bash
# 1. Preparación (dry-run primero; agregar --apply para escribir)
docker exec -i -u appuser -w /usr/app -e PYTHONPATH=/usr/app 1platform-api-prod \
  python /tmp/<dir>/scripts/update-landing-capabilities.py \
  --patch content-patches/cobros-remotos-a-terminal-preparacion.json [--apply]

# 3. Encendido
docker exec -i -u appuser -w /usr/app -e PYTHONPATH=/usr/app 1platform-api-prod \
  python /tmp/<dir>/scripts/update-landing-capabilities.py \
  --patch content-patches/cobros-remotos-a-terminal-encendido.json [--apply]
```

(`/tmp/<dir>` contiene `scripts/update-landing-capabilities.py` y `docs/content-patches/` copiados al contenedor.)

## Qué hace cada parche

Ambos: tenant `oneplatform`, `1platform.pro`, 4 documentos (`/payments-invoicing/` y `/solutions/`, en y es). Validan alcance exacto de claves, comparan `before` (null = clave nueva), respaldan (modo 0600), escriben por compare-and-swap sobre `updated_at` y verifican releyendo. Son idempotentes (una segunda corrida da 0 cambios).

- **Preparación:** corrige `paymentsInvoicing.charge.terminal.prerequisite` (ya no exige facturación), crea `paymentsInvoicing.remote.{eyebrow,status,title,description,currency,warning,guideCta}` con `status` = «En preparación»/«In preparation», y amplía `solutions.group.intelligence.item.cardPresent.desc` con «…está en preparación». Los `before` son los valores públicos medidos el 2026-11-13 (`GET /api/v1/sites/oneplatform/pages?locale=en|es`).
- **Encendido:** CAS sobre los valores del anterior. Cambia `paymentsInvoicing.remote.status` a «Disponible»/«Available» y `cardPresent.desc` a «…Después, cobra en ella desde tu sistema.». Sobre un sitio sin preparar se rechaza (`Content changed concurrently`).

Las claves del repo (`payments-invoicing.ts`, `solutions.ts`) son idénticas a los `after` de preparación. Si el parche cambia, el repo debe cambiar con él.

## Alcance y límites

- Moneda: «en la moneda de la terminal»; sin nombres de proveedor ni de marca de terminal. Aviso RA-4 en la sección.
- El enlace a la guía apunta a `/docs/saas/1platform-api/terminal-de-tarjetas/cobros-remotos` (`REMOTE_GUIDE_PATH` en `PaymentsInvoicing.astro`). La página la crea el PR de `1platform-api-developer` y no estaba confirmada al escribir esto: confirmar la ruta final antes del merge.
- `docs/payment-availability-content.json` no se toca.
- Reversión de datos: restaurar desde el respaldo comparando valores actuales; de código: revert por PR.

## Gates locales (2026-11-13, Node 24.18.0)

`npm run build`, `npm run check` (guard + 55 autotests), `npm run typecheck` (0 errores), suite de navegador con 2 workers y puerto propio (684 pasan, 25 omitidos preexistentes). `check:baseline`: antes de re-congelar sólo diferían `/payments-invoicing/`, `/es/pagos-y-facturacion/`, `/solutions/`, `/es/soluciones/` (el cambio normalizado es la copia de la épica más el hash del CSS de la página); tras congelar, 102/102.

**Pendiente:** las líneas base visuales son de Linux y no se regeneraron en macOS. Regenerarlas por el workflow/artefacto de CI y revisar sólo `payments-invoicing` y `solutions` en en/es.
