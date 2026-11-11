# Tap to Phone y Suscripciones disponibles

Decisión del dueño (2026-11-11): presentar Tap to Phone y Suscripciones como disponibles, sin matices. Publicidad digital no cambia en este incremento.

## Código

- Tarjetas de cobros: `02 / ACTIVO` · `03 / ACTIVO` (en: `AVAILABLE`), mismo término que la tarjeta 01, con textos sin advertencias.
- Catálogo de capacidades: Suscripciones deja de llevar estado, como el resto de los módulos disponibles. Se retira la clave `infrastructure.capabilities.subscriptions.status` del catálogo; el valor que siga almacenado en SitePages ya no se renderiza (cubierto en `tests/infrastructure-cloud-content.spec.ts`).
- Se conservan el estado de Publicidad digital y la nota de activación con un clic.

## Contenido publicado

El website en producción lee SitePages. `docs/payment-availability-content.json` es el cambio revisable: 4 claves por idioma (`infrastructure.payments.{phone,subscriptions}.{status,description}`), sólo tenant `oneplatform`, ruta `@infrastructure-home`. Se aplica con el actualizador existente, que valida tenant/dominio, compara valores anteriores, respalda (modo 0600), escribe por compare-and-swap y verifica re-leyendo:

```bash
docker exec -i -u appuser -w /usr/app -e PYTHONPATH=/usr/app 1platform-api-prod \
  python /tmp/<dir>/scripts/update-landing-capabilities.py --patch payment-availability-content.json [--apply]
```

Reversión de datos: restaurar desde el respaldo, comparando los valores actuales. Reversión de código: revert por PR.

## Gates locales

Typecheck, build, guard de diseño/proveedores, suite de navegador completa, baseline byte a byte re-congelada (sólo cambian las 2 homes) y visual Linux (sólo cambian `home-{en,es}-390`, revisadas).
