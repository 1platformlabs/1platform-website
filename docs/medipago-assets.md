# Activos de la landing de Medipago

La implementación reutiliza los activos del diseño aprobado el 25/09/2026. No se generó otra fotografía ni se alteró el prototipo. Su fuente canónica local es:

`/Users/staimer/Documents/1platform-worktrees/medipago-landing-prototype/epics/website-multitenant/prototipo/`

El contrato visual está en `README.md` y `evidence/REVISION-AJUSTES.md` de esa carpeta. La procedencia original está en `ASSETS.md`.

## Fotografía

- Fuente aprobada: `assets/consultorio-hero.png`, PNG, 1672 × 941, 1.922.281 bytes.
- SHA-256 original: `f5bd0c5ae36e984349334085fa73030000709cb9bcebcf5e171ceab5ccaf1c88`.
- Archivo optimizado: `src/assets/photographic/consultorio-hero.webp`, 1672 × 941, 149.170 bytes; reducción del 92,2%.
- SHA-256 WebP: `811daeb4c2d9462788b2df7e5dc9360ccbb416a52ac7eebf15a3a46f9c8af401`.
- Conversión: Sharp, `webp({ quality: 90, effort: 6 })`, sin recorte ni reducción de dimensiones. El hero conserva los 1672 px también en móvil: su recorte `cover` sobre una superficie vertical necesita ese ancho fuente para mantener nitidez. La fotografía secundaria sí usa variantes responsivas de Astro.
- Generación original con la herramienta integrada `imagegen` (`photorealistic-natural`), sin imágenes de referencia. No usa una fotografía licenciada de terceros.
- Original de la generación conservado en `/Users/staimer/.codex/generated_images/01a0d659-600d-7ab2-8e0e-b7228e8dae30/exec-ce3a556d-bb66-44af-8c84-d5444495d6d9.png`.
- La escena es ficticia e ilustrativa; no representa una clínica ni pacientes reales identificados y no es un testimonio.
- La fotografía estática conserva el recorte, la capa de contraste y el movimiento de cámara del diseño aprobado mediante CSS. No es video.

Prompt utilizado:

```text
Use case: photorealistic-natural
Asset type: immersive website hero photograph, landscape 16:9
Primary request: original premium editorial photography for Medipago, a Guatemalan service that helps medical specialists accept card payments in their consulting rooms.
Scene/backdrop: a contemporary independent medical consulting room in Guatemala City, warm natural daylight from a generous window, subtle tropical foliage outside, ivory plaster walls, light oak desk, a few subdued deep teal details. Authentic and welcoming, not a hospital or luxury hotel.
Subject: on the right-hand third of the frame a Latin American female medical specialist around age 40 in an ivory lab coat over muted teal scrubs, naturally speaking with an adult female patient on the far left side of the desk. Both look relaxed and professional, not posing toward the camera. A plain black Android-shaped smartphone resting on the desk near the specialist, screen dark and not readable. Natural hands, believable anatomy, genuine fabric and skin texture.
Composition/framing: cinematic wide photo, eye-level 35mm lens, environmental framing. Keep the central third calm and softly out of focus, with no faces in that central third, because a large centered headline will be placed in HTML over this area. Both people visible toward outer thirds. Leave ample headroom. Include the warmth of a real daylight consulting room.
Lighting/mood: diffused afternoon window light, nuanced natural shadows, understated premium commercial photography, true photographic realism.
Color palette: warm off-white, light oak, restrained deep teal, natural skin tones.
Constraints: no text, no lettering, no captions, no logos, no trademarks, no numbers, no documents with patient data, no watermarks, no payment terminal, no screen UI. This is a staged fictional scene, not a testimonial. Do not make a website or graphic layout, deliver the photograph only.
```

## Manrope

- Fuente aprobada: `assets/fonts/manrope-variable.ttf`, 164.700 bytes.
- SHA-256 TTF: `3ae11c49db0455a3cc33e37d380f20fdb8c7f8b41dc07625c177e3d87a9d6ae6`.
- Origen: [Google Fonts, Manrope](https://github.com/google/fonts/tree/main/ofl/manrope), archivo `Manrope[wght].ttf`.
- Archivo servido: `public/fonts/manrope-variable.woff2`, 53.928 bytes; reducción del 67,3%.
- SHA-256 WOFF2: `fd35d73a80b0ce13b72935f947f4f6af16d514fa925dcfbcd2a46f2593ac9067`.
- Conversión con FontTools/Brotli, sin subsetting. Se verificó igualdad del orden de los 742 glifos, las 678 asignaciones Unicode y el eje variable `wght` 200–800.
- Licencia SIL OFL 1.1 copiada íntegra en `public/fonts/LICENSE-manrope.txt`.
- La familia procede de la configuración validada del tenant a través de `--tenant-font-family`. No hay solicitudes de fuentes externas en runtime.

### Derivación de la marca fuera de la página

El monograma del navbar usa peso 700. Para conservarlo en favicon, icono de inicio y tarjeta social se creó una instancia estática de ese mismo eje, `public/fonts/manrope-700-normal.woff2` (31.304 bytes, SHA-256 `553daebf0ef395c3b8c6aaaf86600c304515c5dc3bccfd24873e19843d896378`). Mantiene los 742 glifos y las 678 asignaciones Unicode. El generador existente `scripts/generate-brand-fonts.mjs` la incorpora al mapa server-side de contornos; la landing sigue cargando la fuente variable.

Esta instancia evita depender del peso por defecto 200 del archivo variable. Se generó con `fontTools.varLib.instancer.instantiateVariableFont(font, {"wght": 700})` y se verificó el contorno resultante con el rasterizador del sitio. Comparte la licencia OFL indicada arriba.

## Inter del panel demostrativo

Se reutilizan `public/fonts/inter-latin-400-normal.woff2` y `public/fonts/inter-latin-500-normal.woff2`, existentes en el sitio y byte a byte idénticos a los del prototipo. La familia CSS `PanelInter` mantiene la tipografía del panel aprobado; la licencia existente es `public/fonts/LICENSE-inter.txt`.

## Ilustraciones y estilos

Los paneles de cobro, enlace y facturación automática, el flujo y los iconos son HTML/CSS/SVG originales del prototipo. Los textos e importes del panel son ficticios y no contienen datos de pacientes. Sus estilos se conservan en `src/styles/photographic-service.css` y `src/styles/photographic-panel.css`, cargados sólo por la composición de servicio fotográfica.

Se eliminó únicamente el CSS del contacto simulado, el aviso que bloqueaba el sitio sin JavaScript y el footer anterior que ya no tenía markup. Se conservan navbar fijo, jerarquía tipográfica, panel, footer oscuro y animaciones; la marca y la tipografía se reciben desde la configuración del tenant. La versión de producción presenta contenido SSR y mejora progresiva.

No se copiaron el arnés de auditoría, Axe, capturas del prototipo, su `noindex` ni su PNG de 1,92 MB al bundle del sitio.

## Reutilización para 1Platform

La ampliación al segundo tenant usa `src/assets/product/showcase-store-bg.webp`,
2880 × 1800, ya presente en el repositorio. La procedencia sigue en
`src/assets/product/showcase-editorial-provenance.json` (revisión 2026-08-29-v2,
generación `43d402ce-ead9-4e5c-a7c9-f8f41f39b2d5`). Es una escena original
ilustrativa de un comerciante preparando un paquete, no un testimonio. No se
crearon imágenes nuevas ni se incorporó material de terceros. La imagen fue
inspeccionada en disco para confirmar escena y texto alternativo.

El renderer permite únicamente claves de fotografía registradas (`consultorio`
y `commerce`). Astro sirve WebP hasta 1672 px conservando proporción y respetando
el límite del endpoint de imágenes; la imagen secundaria usa variantes y lazy
loading. Los dos tenants comparten fuentes locales y licencias ya documentadas.
