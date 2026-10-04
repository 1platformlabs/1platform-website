# Revisión de servicios uniformes — 2026-10-03

Referencia: `epics/website-multitenant/prototipo/vendefacil/` del monorepo,
servida por `./prototypes/abrir-landings.command vendefacil` en `127.0.0.1:4466`.
Implementación: Astro SSR construido, resolución real por Host y API HTTP de
fixtures. **No es el banco de API/auth/DB reales ni una publicación.**

## Comparación personal

Capturas equivalentes Chromium a 1440×900, 390×844 y 844×390, fuentes cargadas y
movimiento reducido. Se leyeron lado a lado la primera/segunda fila de escritorio,
tienda/correo móviles, Delivery/tienda/correo horizontales (incluido su tramo
inferior), y el bloque de anuncios. Las seis tarjetas conservan textos completos,
colores, bordes, Manrope y las ilustraciones compactas. Se corrigieron el wrapping
heredado de párrafos, el padding móvil y la posición del CTA del bloque ancho.

| Viewport | Cada tarjeta: implementación | Prototipo servido en el mismo navegador | Resultado |
|---|---|---|---|
| 1440×900 | 413.33×697.70 px | 413.33×697.70 px | seis alturas iguales, dos filas de tres |
| 390×844 | 350×686.19 px | 350×686.19 px | seis tarjetas verticales iguales |
| 844×390 | 772×381.45 px | 772×381.45 px | seis filas de texto + ilustración |

La fracción de ancho de la tercera columna es 413.34 px por reparto subpixel.
Las medidas difieren unas centésimas del informe histórico del prototipo; ambas
versiones coinciden al medirlas hoy con el mismo Chromium. No son alturas CSS.

Los JSON `measurements-*` incluyen las seis medidas de cada versión: textos
normalizados idénticos **18/18**, `scrollHeight == clientHeight` en todas y ancho
del documento sin overflow. La prueba también verifica ubicación de ilustración,
anuncio fuera de la cuadrícula y a todo el ancho, foco visible por teclado,
anclas y destino/mensaje de cada CTA nuevo. La suite existente recorre entrada y
reentrada de animaciones, pausa con pestaña oculta, `reduce`, panel/filtros,
calculadora, menú/Escape, acceso y alta; Axe cubre los tres tamaños.

Los CTA de producción son enlaces al contacto configurado, no el diálogo local.
Se conserva `#anuncios` por el contrato de protección de proveedores existente;
el prototipo lo llama `#meta-ads`. La cabecera mantiene los espaciados de la
landing de producto anterior: las diferencias menores frente al prototipo en
navegación/Acceder son previas a esta continuación. No se copiaron reseñas
ficticias, administración localStorage ni diálogos de demo al producto.

## Capturas revisables

| Vista | Prototipo | Implementación |
|---|---|---|
| Primera fila | [1440](prototype-1440-0.png) | [1440](implementation-1440-0.png) |
| Segunda fila | [1440](prototype-1440-3.png) | [1440](implementation-1440-3.png) |
| Anuncios ancho | [1440](prototype-1440-campaign.png) | [1440](implementation-1440-campaign.png) |
| Tienda móvil | [390](prototype-390-4.png) | [390](implementation-390-4.png) |
| Correo móvil | [390](prototype-390-5.png) | [390](implementation-390-5.png) |
| Tienda horizontal | [arriba](prototype-844-4.png), [abajo](prototype-844-4-bottom.png) | [arriba](implementation-844-4.png), [abajo](implementation-844-4-bottom.png) |
| Correo horizontal | [arriba](prototype-844-5.png), [abajo](prototype-844-5-bottom.png) | [arriba](implementation-844-5.png), [abajo](implementation-844-5-bottom.png) |

El viewport horizontal no contiene una tarjeta entera junto a la cabecera fija;
por eso se conservan dos capturas con scroll, sin reducir ni estirar la imagen.
Las demás capturas y páginas completas viven en `epics/vendefacil-servicios-uniformes/evidence/`.
`sources-sha256.json` identifica las fuentes exactas de implementación y referencia.

## No regresión

Control separado desde `origin/main` **d67df796a9c6e4113d71b8a6cc21170d7ee89a06**.
Los PNG de página completa de Medipago y Vende Fácil **con su contenido anterior**
son idénticos byte a byte en los tres tamaños: **6/6**, hashes en
`unchanged-tenants.json`. Script reproducible y capturas del control en la evidencia
del monorepo. No se infiere esta equivalencia de una comparación contra sí mismo.

El CSS nuevo se carga sólo cuando se publican sus capacidades. `check:baseline`
conserva **100 rutas idénticas de 1Platform, 0 diferencias, 0 respuestas erróneas**.
No se modificó ninguna baseline.

## Gates y límites

- `typecheck`: 0 errores, 0 warnings (27 hints preexistentes).
- `build`: correcto; `check`: guard correcto + 53 self-tests negativos.
- Suite completa con Node 24.18.0 (`.nvmrc`): 501 pass, 24 omitidas preexistentes.
- Suite afectada tras aislar CSS: 52 pass, incluidas comparaciones y preparación/reversión.
- `test:landing-ssr`: 4/4; `test:preview-landings`: 4/4; `test:branding-content`: 12/12.
- `check:baseline`: 100/100 sin reescritura de snapshots.
- `test:visual` Linux local: **no ejecutado**; Docker falla antes de crear el contenedor
  con `no space left on device` en su snapshotter. No se limpiaron recursos ajenos.
  El mismo gate se solicita al CI del PR, que usa el contenedor fijado por el repo.

Un primer intento de captura dentro de la suite completa falló porque el servidor
externo del prototipo dejó de escuchar; las pruebas funcionales no dependían de él.
Se conservó el fallo, se levantó con el lanzador canónico y se completó la captura.
Los fallos iniciales de expectativas antiguas (cinco servicios) y preparación del
fixture se corrigieron; no se relajaron assertions ni tolerancias visuales.

Pendiente del usuario: `/verify-epic-e2e vendefacil-servicios-uniformes` del monorepo,
con API/DB/auth locales y ensayo del PUT/reversión. Publicación y activación remota
requieren pasos posteriores autorizados.
