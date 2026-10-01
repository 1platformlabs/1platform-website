# Paquete offline de activación

Estado: **preparación implementada; ningún seed, PATCH, API ni DB ejecutado**.

Los JSON de esta carpeta son los overlays derivados de los catálogos y fixture
aprobados para revisar contenido. **No son snapshots administrativos ni fixtures
para sembrar**: omiten deliberadamente los campos que exige `seed_site_pages.py`.
No contienen las páginas/editoriales/drafts actuales de un entorno real.

- `oneplatform-overlay-reference.json`: sólo infraestructura, interiores y chrome
- `medipago-overlay-reference.json`: sólo `photographic.*` de Medipago

El preparador lee siempre las fuentes actuales; no toma estos overlays como
entrada. El resultado destinado a un seed se obtiene únicamente fusionando un
snapshot administrativo completo del tenant mediante
`scripts/prepare-branding-content.mjs`. Cada operación se documenta en un reporte
con hashes; el PATCH del manifiesto viaja separado.

Selftest: `node --test scripts/prepare-branding-content.selftest.mjs`.
Runbook y prerrequisitos: `docs/infrastructure-branding-activation.md`.
No guardar aquí snapshots administrativos, credenciales ni paquetes de un entorno.
