# Prospección — revisión visual local (2026-11-22)

## Identidad

- Worktree: `/Users/staimer/Documents/1platform-worktrees/vertical-prospeccion-1platform-website`.
- Rama: `feat/vertical-prospeccion`; fuente revisada: `bf0a8bef6a5ed2bd764c562a27a663e420ffd651`.
- PR: <https://github.com/1platformlabs/1platform-website/pull/194>, abierto y borrador, no mergeado.
- `origin/main`: `861e270f0436840ced8606c36b6a9373385e8fbf`; 0 commits detrás, simulación de merge limpia.
- Único workflow versionado: `prod.yml`, `push` a `main` o despacho manual. Un push a esta rama no publica ni ejecuta ese workflow.
- Manifest actual: Astro 7.4.2, Node adapter 11.1.5, versión 3.5.17.

## Banco

Slot 6: website SSR `http://1platform.pro:4921`, API `http://127.0.0.1:8610`.
El navegador resuelve sólo `1platform.pro` a loopback con `--host-resolver-rules`.
`SITE_MANIFEST_SOURCE=api`; el sitio consume SiteTenant/SitePage persistidos en la Mongo privada.
`site-manifest.json` y `site-content.json` se derivaron de los catálogos de esta rama para sembrar sólo el banco. No habilitan rutas en QA/PROD.

`capture.mjs` recorre las dos rutas con los idiomas ES/EN, 1360×900 y 375×812; captura ventana y cada sección, mide overflow, ejecuta axe y prueba salto al contenido y ancla.

## Resultado medido

La landing se revisó en navegador real, con sus dos traducciones y a 1360×900 / 375×812. Se abrieron individualmente **32 capturas de ventana** (hero, cinco secciones, última tarjeta y footer); las cuatro capturas fullPage son auxiliares, no la prueba del chrome fijo.

- 4/4 respuestas HTTP 200 con título/contenido del idioma correcto.
- Desborde horizontal: **0 px** en las cuatro combinaciones.
- Axe WCAG A/AA: **0 violaciones** en las cuatro combinaciones; **0 errores JavaScript**.
- Hero: título, explicación y dos CTA legibles; las tres tarjetas se distribuyen en una fila en escritorio y una columna en móvil.
- Proceso: cuatro pasos y numeración completos, horizontal/vertical según viewport.
- Salvaguardas, modo borrador, nota y CTA final: texto sin cortes; footer completo y legal legible.
- Cambio de idioma ES→EN y EN→ES navega a la ruta traducida y cambia `html[lang]`, en ambos tamaños (`navigation-results.json`).
- Menú móvil: Enter abre, Tab entra al primer enlace, Shift+Tab vuelve al botón, Escape cierra y devuelve foco. ES/EN aprobados.
- CTA primario de hero y cierre mantiene `https://app.1platform.pro/auth/login?next=%2Fmain%2Fprospecting`; se verificó el href sin navegar fuera del banco.
- Ancla «Cómo funciona» conduce a la sección visible bajo el encabezado fijo. Las capturas estables usan reduced-motion; el comportamiento de teclado también se sondeó con movimiento normal.
- Tema oscuro: N/A en esta landing; el sitio declara `color-scheme: light` por diseño.

No se cambió código de producto: no aparecieron defectos específicos de esta landing que justificaran otro diseño. Hay dos hallazgos compartidos, reproducidos además sobre `origin/main`, que impiden presentar el chrome como completamente libre de pendientes:

1. [#197 — salto al contenido](https://github.com/1platformlabs/1platform-website/issues/197): con movimiento normal Lenis cancela el enlace y no transfiere foco; el siguiente Tab vuelve al logo. Con reduced-motion el comportamiento nativo sí salta al primer enlace dentro de main. `results.json.skipTarget` vacío por sí solo no prueba el fallo; lo demuestra el siguiente Tab en `shared-results.json`.
2. [#198 — tamaño táctil](https://github.com/1platformlabs/1platform-website/issues/198): `.btn` mide 44 px frente a la regla local de 48 px. Es discrepancia del diseño del proyecto, no una violación WCAG AA demostrada.

Control: worktree separado `/Users/staimer/Documents/1platform-worktrees/vertical-prospeccion-website-control`, HEAD `861e270f0436840ced8606c36b6a9373385e8fbf`, servidor SSR :5021, misma API/DB privada y `/about/`. Ambos hallazgos se reproducen en candidato y control; se mantuvieron fuera de #194.

## Verificaciones

- Build SSR API-mode: exit 0 (`build.log`).
- `npm run typecheck`: 364 archivos, 0 errores, 0 warnings, 18 hints (`typecheck.log`).
- `npm run check`: guardas aprobadas y **60/60 selftests** (`check.log`). Ejecutado secuencialmente antes de capturas; `git diff` de fuentes vacío al terminar.
- No se repitió suite completa ni comparación visual Linux: no hubo cambios de producto. Las pruebas históricas del PR no se atribuyen a esta revisión.
- Creación de issues por conector GitHub: 403 `Resource not accessible by integration`; fallback con `gh issue create --body-file`, ambos reconsultados OPEN.

## Semilla y diferencias de contrato

Se omitió `brand_assets.apple_touch_icon` del manifest derivado porque la proyección del catálogo website lo acepta pero el modelo API actual rechaza el campo extra. No se cambió ese contrato.

El seed de publicación detectó **65 claves legacy faltantes por idioma** del kit oficial `photographic-service`, aunque el renderer del sitio usa el perfil infrastructure. Se agregó `@bench-home-compatibility` sólo a la semilla `site-content-with-home-kit.json`, con esas claves del kit oficial sin reemplazar valores del catálogo. Tras la siembra, `seed_site_tenants.py --verify` publicó sólo el tenant local. Esto deja la compuerta intacta y documenta la diferencia; no habilita producción.

Reproducción: exportar catálogos, preparar manifest local, ejecutar en el API del banco `seed_site_tenants.py`, `seed_site_pages.py --fixture site-content-with-home-kit.json --verify`, repetir `seed_site_tenants.py --verify`; luego arrancar el SSR con las variables indicadas y ejecutar los tres scripts `.mjs` de esta carpeta.

## Límites y cierre

[Website #195](https://github.com/1platformlabs/1platform-website/issues/195) sigue pendiente para publicación y comprobación con la vertical encendida. Esta revisión sólo acredita el banco. No hubo push, merge, deploy, cambio de draft ni activación de tenants remotos.

AGENTS.md y CLAUDE.md no se modificaron. La documentación local del proyecto refleja Astro SSR 7.4.2; la tabla raíz entregada en el contexto menciona Astro 5 estático y está desactualizada para este repo.

Banco website apagado: **sí**. PID 9369 (:4921) y 12126 (:5021) detenidos tras verificar su cwd. Navegadores cerrados. La API/Mongo compartida del banco queda bajo el coordinador.

