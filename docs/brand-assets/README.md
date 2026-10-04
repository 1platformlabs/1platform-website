# Identidad compartida de los tenants

Website consume `brand_logo` y `brand_favicon` del manifiesto resuelto por host. La cabecera, el pie, los accesos y los símbolos de las demostraciones usan el asset correspondiente. Cada componente conserva su marcado anterior como fallback. No se codifican marcas ni URLs de imágenes de tenants en el renderer.

El favicon subido tiene prioridad sobre el icono declarado, el derivado del logo y el monograma. No cambia la imagen social, el icono táctil ni las preferencias de JSON-LD. Los assets se sirven desde el origen del sitio por rutas que validan tenant y hash vigente. Véase [política de caché](cache.md).

El marco visual se calcula sobre el PNG decodificado, después de la normalización de la API. Recorta sólo el espacio transparente mediante CSS, mantiene proporciones y se limita al ancho disponible. Los símbolos no cuadrados se contienen en su caja. En superficies oscuras, el arte transparente admite una silueta blanca; las imágenes opacas conservan sus colores sobre una placa clara.

## Kit de las tres marcas

`tenants.json` contiene `oneplatform`, `medipago` y `vendefacil`, con dominios, procedencia y SHA-256. Cada directorio guarda `logo-source.png` (original exacto del root), `logo.png` (canvas transparente encuadrado para upload) y `favicon.png` (original de 512 px). `node scripts/prepare-brand-assets.mjs` reproduce el encuadre; no regenera el arte ni usa la red.

El preparador no acepta argumentos: opera únicamente sobre el kit del repositorio,
independientemente del directorio actual. Preparación y preview validan que cada
ruta sea exactamente `<site_slug>/<archivo del rol>` y rechazan enlaces simbólicos.
El preparador valida todas las rutas antes de escribir; no admite destinos fuera
del kit ni duplicados de tenant.

La herramienta de configuración está en la rama API `feat/tenant-brand-assets`, `scripts/configure_tenant_brand_assets.py`. Valida pertenencia real antes de vincular el sitio mediante `App.config.branding.site_slug`. No debe deducirse un App de Vende Fácil por su nombre o por existir su landing. No se aplicó configuración remota en esta entrega.

## Revisión local

```sh
npm run build
node scripts/preview-brand-assets.mjs
```

- `http://1platform.localhost:4490/es/`
- `http://medipago.localhost:4490/`
- `http://vendefacil.localhost:4490/`

Es el SSR real con una API de fixtures local, no un banco autenticado. Las páginas y los datos comerciales proceden de fixtures existentes; no representan cambios de tarifa, contactos ni activación productiva. Los cambios de esta entrega son de identidad visual.

El coordinador revisó las tres cabeceras en escritorio, símbolos pequeños de Vende Fácil, fallback y tamaños móviles. Los checks y la evidencia final están en [verificación](verification.md). Las suites comprueban aislamiento, carga de imágenes, encuadre, fallbacks y política de caché. No hay cambios de `AGENTS.md`/`CLAUDE.md` ni dependencias.
