# Verificación local de identidad por tenant

Ejecutada el 2026-10-04 en el worktree `landing-logos-digital-website`, sobre
`0637ae03a7884701fcfc23925c4129ad3198bfb2` más los cambios locales. El árbol final
de fuentes tiene SHA-256
`464f9921303578e00790c6ea90cec4020d4e6a3208ba3fafe868cd59e5837882`.
El [inventario final](evidence/source-snapshot-final.json) registra los hashes de
los archivos cambiados; excluye este informe y su evidencia para evitar una
referencia circular.

| Gate | Resultado |
| --- | --- |
| Build SSR mediante el `webServer` de Playwright | PASS; proceso nuevo, sin reutilizar el servidor anterior |
| `PLAYWRIGHT_PORT=4502 npm test -- --workers=2` | **525 aprobadas, 24 omitidas, 0 fallos y 0 flaky**; 55,2 s de suite |
| Marca cargada en navegador | **9/9**: tres tenants en 360, 390 y 1440 px |
| Comparación visual Linux | **8/8**, sin omisiones ni cambios de baseline |
| `npm run typecheck` | **0 errores, 0 advertencias, 27 hints** |
| `npm run check` | PASS, incluidos los **53 self-tests** del guard |
| `git diff --check` | PASS |

## Alcance de la regresión de marca

`tests/tenant-brand-chrome.spec.ts` levanta el SSR compilado y la API HTTP de
fixtures de `scripts/preview-brand-assets.mjs` en puertos propios 4510/4511.
El navegador visita `1platform.localhost`, `medipago.localhost` y
`vendefacil.localhost`; el primer tenant se revisa en `/es/` y los otros en `/`.
Las expectativas comprueban:

- La imagen del logo vigente se descarga y decodifica, y su URL coincide con
  `brand_logo.sha256` del manifiesto del tenant.
- El marco visible cabe en el enlace de marca y no se cruza con controles
  visibles de la cabecera. El CTA se comprueba cuando el perfil lo muestra;
  los perfiles que lo ocultan en móvil mantienen la comprobación del menú.
- No hay desbordamiento horizontal en los tres anchos.
- `rel=icon` apunta a `brand_favicon`, diferente del logo, y el navegador
  recibe un PNG cuyos bytes corresponden a su SHA-256.

Las [nueve medidas](evidence/brand-chrome-measurements.json) incluyen las cajas
del enlace, logo y CTA. Medipago a 360 px limita el marco a 130,531 px y conserva
6 px entre su extremo y el CTA. Esa aserción cubre el ajuste `max-width: 100%`
que evita que la imagen conserve 150 px cuando su enlace se comprime.

Para repetir sólo esta regresión después de cambios en `src/`, asegúrese de que
4502 esté libre para que Playwright vuelva a compilar:

```sh
PLAYWRIGHT_PORT=4502 npm test -- tests/tenant-brand-chrome.spec.ts --workers=2
```

El preview manual conserva sus puertos 4490/4491 por defecto. Puede aislarse con
`BRAND_PREVIEW_PORT` y `BRAND_PREVIEW_API_PORT`; la prueba usa
`BRAND_TEST_PORT` y `BRAND_TEST_API_PORT` para sustituir 4510/4511. Los procesos
propios de la suite terminaron y dejaron libres sus puertos.

## Visual Linux y evidencia

La comparación usa el flujo de `npm run test:visual`: `npm ci` y Playwright en
`mcr.microsoft.com/playwright:v1.61.1-jammy`, con 2 CPU, 4 GiB y 2 workers. Se
ejecutó sobre una copia de las fuentes finales para aislar `dist/` y
`node_modules` de otros trabajos. No se utilizó macOS para comparar las
referencias Linux ni se ejecutó `--update-snapshots`. Los ocho PNG de referencia
mantienen su hash original.

- [Suite funcional final](evidence/functional-final.json).
- [Comparación visual Linux](evidence/visual-linux.json), con imagen Docker,
  casos y comprobación de integridad de las referencias.
- [Intento inicial del nuevo arnés](evidence/host-probe-attempt.json): el probe
  de arranque usaba `fetch` de Node, que descartaba `Host`; produjo un fallo
  de `beforeAll` y dejó ocho casos sin ejecutar. Se corrigió usando el helper
  existente `getWithHost`; el favicon se verifica desde el propio navegador.
  No exigió cambios del renderer. Se conserva la evidencia del fallo y el
  [inventario de ese intento](evidence/source-snapshot-host-probe-attempt.json).
- `source-snapshot.json` corresponde a la suite anterior de 516 aprobadas y
  24 omitidas, previa al ajuste móvil y a los nueve casos nuevos. El gate que
  certifica el estado final es `source-snapshot-final.json`.

Los JSON completos y logs originales permanecen en
`/tmp/website-brand-final.LYjV9c/`; sus hashes y ubicaciones están en los
informes compactos. La evidencia durable ocupa aproximadamente 40 KiB.

## Límites

Las 24 omisiones son exclusivamente `tests/bench/landings.real.spec.ts`, que
requiere el banco privado autorizado. Estas pruebas ejercitan SSR y navegador
reales con una API de fixtures; no verifican autenticación, permisos,
persistencia de uploads ni configuración real en API/DB. Los ocho snapshots
visuales existentes cubren los perfiles de plataforma y clínica; los nuevos
logos se cubren con la regresión de geometría/carga y la revisión visual manual
del coordinador, no con nuevas referencias visuales.

Esta verificación local precede al commit y PR de integración. No incluye
merge, despliegue ni configuración de tenants remotos.
`AGENTS.md`, `CLAUDE.md`, dependencias y lockfile permanecen sin cambios.
