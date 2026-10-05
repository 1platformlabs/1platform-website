# Caché de imágenes de marca

Las rutas `/brand/` se resuelven por tenant en Node. Nginx usa un bloque
`location ^~ /brand/` que conserva el `Cache-Control` del upstream mediante
`$page_cache_control`; la regla genérica de imágenes estáticas ya no lo
reemplaza por un día de caché. Se conserva una sola cabecera y `nosniff`.

Para `/brand/favicon/{hash}.png`:

- Hash vigente y bytes disponibles: `200`, PNG, `public, max-age=31536000, immutable`.
- Sin favicon o hash distinto/malformado: `404`, `no-store`, sin consultar los bytes.
- Bytes temporalmente indisponibles: `503`, `no-store`, `Retry-After: 30`.

El fallo de transporte mantiene su caché interna de 30 segundos; no se extiende
a navegadores o al proxy. Los controladores de las otras rutas de marca no se
modificaron. La familia de imágenes estáticas sigue en `max-age=86400`.

## Verificación local

- `tests/serving-contract.spec.ts` y `tests/tenant-favicon-cache.spec.ts`:
  **17 pruebas pasaron**, ejecutadas con configuración temporal de Playwright
  sin `webServer`, navegador ni build. Comprueban precedencia del proxy,
  cabeceras, rechazo antes de consultar bytes y recuperación tras 30 segundos.
- `nginx -t` pasó usando la configuración del repositorio con rutas y puertos
  temporales. Una sonda HTTP con nginx real y upstream sintético confirmó
  `200/immutable`, `404/no-store`, `503/no-store/Retry-After: 30` y la política
  estática sin cambios. Ambos procesos temporales se cerraron al terminar.
- Arnés local de esta sonda: `/tmp/website-brand-cache.EWzcim/nginx-probe.mjs`;
  configuración de las pruebas: `/tmp/website-brand-cache.EWzcim/playwright.config.mjs`.
- No acredita API/DB reales ni despliegue. El coordinador realiza el build y
  reinicia el preview de Website después de integrar los cambios concurrentes.
