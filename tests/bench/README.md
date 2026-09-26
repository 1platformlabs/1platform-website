# Banco real de las landings

Alcance: WMT-05/06/11, Medipago y ampliación autorizada a 1Platform EN/ES.
No modifica/verifica el dashboard autenticado ni el motor de pagos. Aplican
**`.claude/commands/verify-epic-e2e.md` y `levantar.md` DEL MONOREPO**.
La suite general omite `landings.real.spec.ts` sin `WEBSITE_E2E_PORT`; no lo
reemplaza con mocks. Los 12 casos se ejecutan separadamente en el banco real.

## Preparación y orden

1. Worktree website `feat/medipago-hero-review`, API
   `feat/website-two-tenant-landing-api` y controles independientes de
   `origin/main` actualizado. Node 24 con cada lock, Python 3.14 con un venv
   privado por API instalado desde `requirements.txt`.
2. Banco canónico `/levantar website --e2e-local website-multitenant --slot 1
   --api-worktree <worktree-api>`; control slot 2. Mongo propio
   `127.0.0.1:27101`, DB `e2e_website_multitenant`; APIs 8110/8210;
   website 4421/4521. Cada website usa `SITE_MANIFEST_SOURCE=api` y
   `SITE_API_BASE_URL=http://127.0.0.1:<su-api>` (sin `/api/v1`).
   Ejecutar `npm run build` y `HOST=127.0.0.1 PORT=<puerto> node dist/server/entry.mjs`.
3. Entorno privado, sin importar el `.env` compartido: `MONGODB_URL`,
   `MONGODB_DB_NAME`, secretos locales aleatorios para JWT/app/admin y Fernet
   válido. No cargar credenciales de proveedores ni apuntar a QA/PROD.
4. Desde el API de la rama con ese entorno:
   `python -m tests.bench.seed_website_landings --out <privado>/auth.json`.
   Es idempotente; usa modelos reales y reproduce las formas del censo:
   plantillas anteriores, 24 documentos por lengua de 1Platform, región
   ausente y aprovisionamiento separado. Incluye otro tenant, un borrador y
   dos apps para los rechazos de auth. Arrancar primero la API de la rama y
   esperar health antes del control para evitar carreras de bootstrap.
5. Definir `WEBSITE_E2E_EVIDENCE` como directorio absoluto de esta corrida.
   **Antes de activar**, desde el website:
   `node tests/bench/capture-landings-control.mjs`.
6. Desde API: `python -m tests.bench.seed_website_landings --content`.
   Aplica los seeds de operador y verifica 50/2 documentos y 26/1 rutas.
   Después: `python -m tests.bench.probe_website_landings
   --auth <privado>/auth.json --out <evidencia>/http-db-results.json`.
   Intercambia app JWT por HTTP real, firma sólo al staff del banco y ejerce
   las dependencias reales. Mismo PATCH/control 422 y rama 200. No efectúa pagos.
7. Reiniciar sólo los workers propios del website tras la activación para
   vaciar cachés. Crear temporalmente `playwright.bank.config.ts`:

```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/bench', testMatch: 'landings.real.spec.ts',
  workers: 1, timeout: 45000, expect: { timeout: 8000 },
  reporter: [['list'], ['json', {
    outputFile: process.env.WEBSITE_E2E_EVIDENCE + '/browser-results.json',
  }]],
});
```

Ejecutar `WEBSITE_E2E_PORT=4421 npx playwright test --config playwright.bank.config.ts`.
Los hosts reales se resuelven en Chromium, sin cambiar `/etc/hosts`. Abrir las
capturas desktop/mobile, panel y prototipo intacto. Los controles de páginas
secundarias se capturan antes de activar: main no puede leer el enum nuevo.
El tercer tenant se compara simultáneamente con ambas APIs y la misma DB.

## Cierre

Ejecutar build/suite/gate visual **secuencialmente**: escriben el mismo `dist/`.
No actualizar baselines. El 26/09/2026 pasaron 12 casos reales, 42 controles
HTTP/DB y 318 pruebas generales, además de build/check/typecheck. Pendiente:
[website#124](https://github.com/1platformlabs/1platform-website/issues/124),
referencias históricas de la home, sin tolerancias ampliadas ni guards omitidos.

Detener los cuatro PIDs propios; ejecutar
`python -m tests.bench.seed_website_landings --teardown`; retirar sólo el
contenedor `mongo-e2e-website-multitenant` y los controles de esta corrida.
Borrar el config Playwright temporal antes del commit. Conservar las ramas de
implementación y sus dependencias. Los secretos locales no van al repositorio.
No hacer merge, deploy ni escrituras remotas.
