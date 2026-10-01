# Banco real de infraestructura y Medipago

Alcance vigente: `1platform-infraestructura-branding`. El harness conserva los
controles de aislamiento y cálculo de la épica anterior, adaptados a las
composiciones aprobadas: infraestructura 1Platform EN/ES y cobros Medipago.
No verifica Dashboard, Consola como producto ni transacciones de pago reales.

La ejecución requiere autorización para **`/verify-epic-e2e
1platform-infraestructura-branding`**, usando **`.claude/commands/verify-epic-e2e.md`
DEL MONOREPO** y su flujo `/levantar`. Esta implementación no ejecutó el banco.
La suite general omite estos casos si falta `WEBSITE_E2E_PORT`; no sustituye
servicios por mocks, interceptores, fixtures HTTP ni contenido repo.

## Prerrequisitos y activación privada

1. Website en
   `/Users/staimer/Documents/1platform-worktrees/infraestructura-branding-website`
   y developer en
   `/Users/staimer/Documents/1platform-worktrees/infraestructura-branding-developer`,
   ambos en `feat/1platform-infraestructura-branding`. Preparar un worktree
   aislado del API desde su `origin/main` actualizado, más controles de main.
   Instalar Node/npm y pnpm desde los manifiestos actuales, Python/venv del API.
2. Levantar el banco mediante el comando canónico del monorepo con un slot no
   cero, Mongo local privado, DB exclusiva y APIs de rama/control. Los defaults
   del harness son website `4421` y control `4521`; se ajustan mediante
   `WEBSITE_E2E_PORT` y `WEBSITE_E2E_CONTROL_PORT` a los puertos asignados.
   No reutilizar QA, producción ni la DB compartida. Mantener el tercer tenant
   `aurora.example` y una ruta Medipago no publicada como controles de aislamiento.
3. Usar secretos locales aleatorios y aplicaciones/staff del banco. Las lecturas
   administrativas requieren JWT de la aplicación Consola y JWT `staff_access`
   en `x-user-token`; un token de usuario tenant no los sustituye. Nunca volcar
   tokens, claves o respuestas de autenticación al repositorio ni a los logs.
4. Obtener el snapshot administrativo completo de cada tenant, incluyendo
   documentos no publicados, y seguir
   [el runbook de activación](../../docs/infrastructure-branding-activation.md).
   Ese snapshot y el seed privado de aplicaciones/staff son prerrequisitos;
   el export público o las fixtures del preview no prueban completitud real.
   No imponer conteos históricos como 50/2 documentos: usar los del snapshot
   completo y el reporte del preparador offline.
5. Configurar ambos websites con `SITE_MANIFEST_SOURCE=api` y sus propias
   `SITE_API_BASE_URL` locales, sin `/api/v1` al final. Configurar en la rama
   `SITE_DESTINATION_ORIGINS` para el origen local del developer; en developer,
   `WEBSITE_URL` y `DEVELOPER_URL`. Las URLs públicas almacenadas se conservan.
   Los previews 4460/4461/4468 y developer4473 de implementación no constituyen
   por sí solos este banco de persistencia y autenticación.
6. Definir `WEBSITE_E2E_EVIDENCE` como carpeta absoluta y privada de esta corrida.
   **Antes de aplicar el overlay** en la DB privada, servir origin/main con su
   API de control y ejecutar `node tests/bench/capture-landings-control.mjs`.
   Captura las homes previas y los cuerpos de Precios/Soluciones. Que main ya
   admita `photographic-service` es válido: el cambio vigente es el overlay de
   infraestructura. No tocar los prototipos para construir estos controles.
7. Revisar el paquete offline, hacer `seed_site_pages.py --dry` con URI/DB locales
   explícitas y aplicar únicamente en ese banco autorizado **sin `--dry` y con
   `--verify`**. Aplicar el patch revisado de 1Platform por el mecanismo
   administrativo existente. El manifiesto Medipago se conserva. Verificar por
   lectura administrativa flags `published`, conteos y rutas; `--verify` no
   comprueba todos los flags. Repetir para probar idempotencia sin pérdida de
   documentos. Reiniciar únicamente los workers propios para vaciar cachés.
8. Registrar pruebas HTTP/DB de autenticación, aislamiento, rutas no publicadas,
   paridad, persistencia y segundo seed. El harness de navegador no reemplaza
   esas lecturas ni demuestra el backend mirando HTML. No efectuar cobros ni
   habilitar capacidades comerciales reales.

## Ejecución de navegador después de la autorización

Crear un config local temporal, sin `webServer` ni fallback:

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

Ejecutar `WEBSITE_E2E_PORT=<puerto-rama> WEBSITE_E2E_CONTROL_PORT=<puerto-control> WEBSITE_E2E_API_PORT=<puerto-api-rama>
npx playwright test --config playwright.bank.config.ts`. Chromium resuelve
los hosts reales por loopback, sin cambiar `/etc/hosts`. La suite tiene 24 casos:
las tres homes en 1440, 360, 390, 430 y horizontal 844×390, más nueve controles
de interacción, contenido, animación, navegación y aislamiento.

La captura de cada home es evidencia para inspección, no una aprobación visual
automática. Comparar personalmente prototipo/producto a igual contenido, viewport
y estado, con tolerancia ±2 px. Precios y Soluciones conservan sus cuerpos
editoriales pero reciben el nuevo chrome; por eso se compara su texto y el
contrato de navegación. El tercer tenant se compara **bit a bit** contra su
control origin/main con la misma DB y las mismas fuentes.

El caso de blog/artículo verifica idiomas, recarga, Atrás/Adelante y el destino
de Primeros pasos. Completar además el recorrido real hasta guía → referencia
API → regreso, con búsqueda, autenticación documentada, esquemas, ejemplos y
enlaces profundos de Scalar nativo. Usar las pruebas actuales del proyecto
developer y revisión personal; la cantidad de operaciones procede del contrato
vigente, no del snapshot del prototipo. No enviar solicitudes mutantes desde
“Try it” ni copiar credenciales de ejemplos.

## Cierre y límites

Build, suite y gate visual se ejecutan secuencialmente porque comparten `dist/`.
Los 14 casos omitidos de la antigua épica en una corrida general no eran una
aprobación de esta nueva composición; el harness se actualizó sin ejecutarlo.
La evidencia histórica del 26/09 pertenece a aquella rama y no certifica esta.

Detener sólo los procesos/contenedores creados por esta corrida y retirar el
config temporal. Conservar las ramas y las evidencias sanitizadas. Los snapshots
privados no se versionan. No hacer merge, deploy, DNS, seeds remotos ni activar
producción dentro de esta preparación. Cada pendiente que la compuerta real
no pueda cerrar debe convertirse en issue según el comando del monorepo.
