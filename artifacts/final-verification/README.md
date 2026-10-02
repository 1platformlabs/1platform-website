# Verificación local de infraestructura y Medipago

Fecha operativa: 30 de septiembre de 2026, America/Guatemala. Worktree
`infraestructura-branding-website`, rama `feat/1platform-infraestructura-branding`,
base `08c0a61e2daad4670a2462c01ba168a81feb7240`; `origin/main` se volvió a
consultar antes de preparar el PR y seguía en ese commit.

## Implementación y alcance

- Landing de infraestructura, navegación compartida, blog/artículos y Tienda
  online ES/EN implementados en Astro desde las referencias aprobadas
- Los 16 Markdown editoriales permanecen idénticos a `origin/main`: cuerpos,
  slugs, fechas y traducciones no se reescribieron
- Identidad, destinos, composición y contenido siguen viniendo del tenant.
  API mode no usa el repositorio como fallback; los nuevos catálogos necesitan
  una activación de datos revisada mediante el paquete offline
- Medipago mantiene marca, GTQ, comisión configurada y contacto propio. Q480 es
  cobro bruto ilustrativo; Q0 disponible para retiro es otro dato del ejemplo.
  No se dedujo una liquidación ni se habilitó un servicio real
- Selector de capacidades y ejemplo de IA son demostraciones sin mutaciones.
  Se mantienen estados en preparación, autoplay con pausa por visibilidad y
  alternativa de movimiento reducido

## Resultados locales

| Comprobación | Resultado |
|---|---|
| `npm run build` | PASS, incluyendo color y ajuste de líneas final Medipago |
| `npm run typecheck` | 259 archivos, 0 errores, 0 warnings, 27 hints existentes |
| `npm run check` | PASS, incluidos los 43 selftests negativos del guard |
| `npm test` con `PLAYWRIGHT_PORT=4468` | 371 PASS, 24 SKIP del banco real que requiere autorización |
| `npm run test:branding-content` | 12/12 PASS |
| `npm run test:preview-landings` | 4/4 PASS |
| `npm run test:landing-ssr` | 4/4 PASS; doubles HTTP en memoria, no API/DB real |
| Comparación visual Linux con config vigente | 8/8 PASS, sin modificar tolerancias |
| `npm run check:baseline` | 100 idénticas, 0 diferencias, 0 respuestas incorrectas |
| Focal posterior a los últimos ajustes CSS | 10/10 PASS: 8 páginas/tamaños con Axe de idiomas, controles blancos/hover y Panel Medipago |
| `git diff --check` | PASS |

La suite completa precedió al ajuste final de color de `#method-title`,
`text-wrap` de los párrafos del Panel y la herencia de color de los controles
del navbar. Después se repitieron build, diez casos focales, SSR y el comparador
HTML con 100/100 idénticas. La auditoría de CI también llevó a expresar la
comparación exacta de un enlace sin ambigüedad, declarar comparadores de orden
en el preparador y reemplazar el recorte de títulos por un recorrido lineal.
Los 12 casos del preparador y los 15 casos focales de títulos pasaron.
El CI del PR vuelve a ejecutar los gates sobre su SHA; este documento registra
pruebas locales y no declara CI, E2E, merge ni producción aprobados.

Las cuatro referencias Linux de 1Platform se regeneraron por el diseño aprobado.
Las cuatro de la clínica se conservaron **bit a bit iguales a `origin/main`**
y pasaron la comparación. Los 100 registros HTML preservan sus rutas: 51 páginas
200, 48 redirecciones y un 404 intencional. Las únicas respuestas modificadas son
`/for-developers/` y `/es/para-desarrolladores/`, ahora 301 a Primeros pasos.

## Fidelidad visual

El coordinador abrió personalmente pares de prototipo/producto y corrigió
discrepancias, además de la automatización. Los prototipos permanecieron intactos.
El informe compacto de interiores está en `artifacts/interior-fidelity/`.

Para Retiros Medipago se midieron 15 elementos contra el inicio de `#su-panel`,
en 1440×900, 360×800, 390×844, 430×932 y 844×390: los **75 comparables tuvieron
delta máximo 0 px** en x/y/ancho/alto y ninguna diferencia en tamaño, interlineado,
color, fondo o display. Se amplió la comprobación mediante Range del DOM a
todos los párrafos visibles en las tres pestañas y los cinco tamaños:
**105 observaciones** con texto, líneas, dimensiones y estilos coincidentes.
Se corrigieron la etiqueta
inline heredada, el SVG block heredado, el color global de la cuenta y el ajuste
`pretty` heredado de todos los párrafos de esta sección; las fuentes usadas son
Manrope/PanelInter, aunque el fallback de sistema difiere en el CSS.

La ausencia de la ceja comercial del hero Medipago conserva la decisión posterior
documentada, aunque aparezca en una referencia anterior. La tabla conserva sus
encabezados semánticos accesibles. Estas decisiones no se ocultaron ajustando
los prototipos ni los umbrales.

Evidencia local no versionada: logs y resultados bajo `artifacts/final-verification/`,
10 capturas finales, `medipago-panels/geometry.json` y `medipago-panels/paragraphs.json`, y los pares completos de
interiores. Se excluyen del PR los PNG de evidencia y los directorios de resultados;
los únicos PNG modificados/versionados son las cuatro referencias Linux aprobadas.

## Reproducibilidad y límites

Host Node 26.4.0; comparación Linux en la imagen oficial
`mcr.microsoft.com/playwright:v1.61.1-jammy`, Node 24.17.0. El volumen Docker
habitual estaba lleno (ENOSPC). Se usaron dependencias/cache temporales del host
y tmpfs para configuración/cache del contenedor, sin borrar otros recursos ni
cambiar scripts, navegador, assertions o tolerancias del gate.

Hubo reintentos de orquestación al ejecutar un guard/SSR mientras otro build
recreaba `dist/`; las ejecuciones exitosas usaron el artefacto ya construido.
También se actualizó una expectativa obsoleta del título Medipago, retirando
el punto final para igualar el copy aprobado. Los fallos y reintentos quedaron
en los logs locales, separados de los resultados finales.

Previews conservados: 4460 con fixture HTTP en 4461 (ambas marcas), 4468 en modo
repo; destino de documentación mapeado a 4473. No prueban persistencia, staff auth
ni servicios reales. El preparador de contenido sólo escribe archivos offline;
no se ejecutó ningún seed, PATCH remoto ni mutación de API/DB.

La siguiente compuerta es **`/verify-epic-e2e 1platform-infraestructura-branding`**,
con **`.claude/commands/verify-epic-e2e.md` DEL MONOREPO**, antes del merge y con
autorización humana. Sus worktrees, puertos, API/DB privada, seeds y snapshot
administrativo completo requerido se detallan en
[`docs/infrastructure-branding-activation.md`](../../docs/infrastructure-branding-activation.md)
y [`tests/bench/README.md`](../../tests/bench/README.md). El harness real contiene
24 casos actualizados; sólo se comprobó su colección y tipado, no se ejecutó el banco.
