# Nube en la landing de 1Platform

Cambio de presentación preparado el 2026-10-15, en `feat/landing-vertical-nube`,
desde `origin/main` (`1ba29ce`). No implementa aprovisionamiento, cobro ni consola.
El merge y las escrituras de contenido en PROD requieren la aprobación del dueño.

## Comportamiento

- Capacidad 11: **Nube** / **Cloud**, con las descripciones solicitadas y estado
  **EN PREPARACIÓN** / **IN DEVELOPMENT**. Conserva la tarjeta numerada y el
  indicador de selección existentes; no agrega iconos ni estilos.
- No tiene enlace a documentación ni alta. El contacto continúa por el CTA
  existente, configurado por el tenant.
- La selección es ilustrativa: Tab alcanza el botón; Espacio y Enter actualizan
  `aria-pressed`, el mapa y su contador. Nube conserva el estado de preparación
  también en el mapa. Las tres selecciones iniciales permanecen iguales.
- «Una API, su ecosistema» conserva sus ejemplos actuales: no anuncia una API
  de Nube que todavía no existe.
- La tarjeta requiere sus tres textos no vacíos en el idioma del tenant.
  Un SitePage anterior o incompleto mantiene las diez capacidades, sin recurrir
  al catálogo de otro tenant ni provocar un error de render.

## Fuente del contenido y activación pendiente

PROD usa **SitePages del API**, no el catálogo i18n del repositorio. Se comprobó
por lecturas públicas de `sites/by-host?host=1platform.pro` y
`sites/oneplatform/pages?locale=es|en`: tenant `oneplatform`, plantilla
`photographic-service`, perfil y composición `infrastructure`. Cada documento
`@infrastructure-home` tiene 142 claves y ninguna de Nube. El registro de esas
lecturas está en [content-source.json](evidence/content-source.json).

`useI18n` toma `Astro.locals.messages`; en modo API no fusiona el catálogo local.
`scripts/export-site-content.mjs` exporta el catálogo de infraestructura a
`@infrastructure-home`, y `scripts/prepare-branding-content.mjs` lo usa como
overlay. El export de esta rama incluye las seis claves nuevas. Las pruebas
generales y capturas locales usan explícitamente `SITE_MANIFEST_SOURCE=repo`;
la prueba de compatibilidad usa el adaptador Node real con un doble HTTP del
contrato de SitePages. No constituyen un banco con DB/API/auth reales.

[site-pages-additions.json](site-pages-additions.json) contiene **exactamente
las seis adiciones propuestas**, derivadas del export de esta rama. No es una
fixture completa ni un body para `PUT`. No se escribió en PROD.

Tras aprobación explícita de esas adiciones:

1. Leer mediante la sesión de staff de Console
   `GET /api/v1/platform/sites/oneplatform/pages`. Guardar privadamente los dos
   documentos actuales de `@infrastructure-home`, con sus flags `published`.
2. Verificar que siguen publicados y que las seis claves no existen o ya
   coinciden con la propuesta. Resolver cualquier diferencia antes de escribir.
3. Fusionar sólo las tres adiciones en los `blocks` actuales de cada idioma,
   conservando todas las otras claves y `published`. Volver a leer y comparar
   los documentos antes de escribir para detectar cambios concurrentes.
4. Enviar dos `PUT /api/v1/platform/sites/oneplatform/pages`, con query
   `route=@infrastructure-home&locale=es|en` y body `{blocks, published}`.
   El contrato reemplaza el documento completo: enviar sólo las adiciones
   borraría su contenido restante. No aplicar un seed global ni modificar el
   manifiesto, otros documentos o tenants.
5. Leer de nuevo, comprobar las seis claves y que el resto coincide con el
   snapshot inmediato. Después del merge autorizado y de la renovación de caché,
   verificar `/es/` y `/`: once tarjetas, estado honesto y ningún enlace de
   documentación en Nube.

Contenido y código pueden desplegarse en cualquier orden: el código anterior
ignora estas claves; el nuevo oculta la tarjeta hasta que estén completas.
Para revertir el contenido, leer los documentos vigentes y retirar sólo estas
seis claves si aún coinciden con lo aprobado, preservando las demás ediciones.

## Verificación

Runtime del repo: Node 24, Astro 7.2.10 SSR (el manifiesto vigente sustituye la
referencia anterior a Astro 5). No se cambió la versión del paquete.

| Comprobación | Resultado |
| --- | --- |
| `npm ci --no-audit --no-fund` | Instalación aislada |
| `npm run typecheck` | 0 errores, 0 warnings; 27 hints existentes |
| `npm run build` | Correcto; adaptador Node SSR |
| `npm run check` | Guard de diseño/proveedores y 53 controles negativos correctos |
| `npm run test:branding-content` | 12 pruebas correctas |
| `PLAYWRIGHT_PORT=4421 npm test -- --workers=4` | 573 correctas; 25 omisiones condicionadas por requisitos externos |
| `tests/a11y-home.spec.ts` | Incluido en la suite; axe sin violaciones, también con Nube seleccionada |
| Comparación visual Linux | 11 correctas después de revisar y actualizar sólo 4 imágenes del home |
| Comparación HTML | 100 rutas idénticas, 0 diferencias, 0 respuestas incorrectas tras actualizar sólo `/` y `/es/` |
| `MEDIA_REQUIRED=1 node scripts/capture-product-media.mjs --check` | 78 recursos producidos, 0 placeholders; salida correcta |

Los nuevos tests de teclado fallaron en el build de `origin/main` por ausencia
de Nube. El comparador HTML previo detectó sólo las dos portadas (98 idénticas,
2 distintas). El visual previo detectó sólo las cuatro portadas de 1Platform;
las siete imágenes de otros tenants pasaron sin actualizarse.

La comparación y actualización visual se ejecutaron en
`mcr.microsoft.com/playwright:v1.61.1-jammy`, con volumen de dependencias propio
`landing_nube_visual_nm`, usando `playwright.visual.config.ts`. Se inspeccionó
cada imagen distinta antes de incorporarla. No se incorporaron imágenes Darwin
como líneas base.

La revisión local siguió `/levantar website` desde el worktree registrado, slot 1,
puerto 4421: `HOST=127.0.0.1 PORT=4421 SITE_MANIFEST_SOURCE=repo node dist/server/entry.mjs`.
ES/EN, 390/768/1440 px, foco visible, Tab/Espacio/Enter, `aria-pressed`, selección
de once, reduced motion, ausencia de overflow y de errores de navegador. El
perfil define `color-scheme: light`; ambas preferencias del navegador dieron
imágenes idénticas en los doce pares revisados. Véanse
[matriz](evidence/matrix.json) y [comparación de temas](evidence/theme-comparison.json).

## Capturas antes y después

Son capturas del adaptador local: antes = `origin/main`, después = esta rama,
con el mismo catálogo y configuración del tenant en modo repo. Las capturas de
sección provienen del PNG de página completa, sin ocultar elementos del producto.

| Idioma / ancho | Antes | Después | Once seleccionadas |
| --- | --- | --- | --- |
| ES · 390 | [Imagen](evidence/before-es-390.png) | [Imagen](evidence/after-es-390.png) | [Imagen](evidence/selected-es-390.png) |
| ES · 768 | [Imagen](evidence/before-es-768.png) | [Imagen](evidence/after-es-768.png) | [Imagen](evidence/selected-es-768.png) |
| ES · 1440 | [Imagen](evidence/before-es-1440.png) | [Imagen](evidence/after-es-1440.png) | [Imagen](evidence/selected-es-1440.png) |
| EN · 390 | [Imagen](evidence/before-en-390.png) | [Imagen](evidence/after-en-390.png) | [Imagen](evidence/selected-en-390.png) |
| EN · 768 | [Imagen](evidence/before-en-768.png) | [Imagen](evidence/after-en-768.png) | [Imagen](evidence/selected-en-768.png) |
| EN · 1440 | [Imagen](evidence/before-en-1440.png) | [Imagen](evidence/after-en-1440.png) | [Imagen](evidence/selected-en-1440.png) |

## Archivos y límites de entrega

- `InfrastructureHome.astro`: tarjeta y condición de contenido completo.
- `infrastructure-home.ts` de i18n: seis textos ES/EN; script de la página:
  mantiene el estado de disponibilidad en el mapa.
- Tests: selección, teclado, accesibilidad, nombres, idioma sin JS,
  documentación y contenido API anterior/completo. Las diez documentaciones
  existentes siguen siendo diez.
- Líneas base: cuatro PNG Linux del home, dos HTML y su manifiesto.
- `CHANGELOG.md`, esta documentación, propuesta de contenido y evidencias.

Workflows revisados antes de publicar la rama: `ci.yml` corre comprobaciones
en PR, sin jobs de despliegue; `prod.yml` publica sólo en push a `main` o dispatch;
`served-claims.yml` es una lectura programada o llamada después de un despliegue.
El push de esta rama y la apertura del PR no disparan PROD. No se ejecutó merge,
dispatch, publicación ni escritura en el API.

El brief `output/pdf/1platform-inversores-v2/source/claims-y-fuentes.md:9`
**queda contradicho por esta nueva propuesta de landing**: antes descartaba esta
oferta. Se conserva sin cambios, según la instrucción del dueño. La futura
épica de producto Nube (aprovisionamiento, cobro y consola) queda fuera de este
cambio; no se creó ni se implementó.

`AGENTS.md` y `CLAUDE.md` no se modificaron; no hay cambios de reglas compartidas
que sincronizar. El checkout compartido y las ramas ajenas permanecen intactos.
