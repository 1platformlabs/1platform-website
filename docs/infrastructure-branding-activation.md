# Activación de contenido de infraestructura

El código desplegado no activa por sí solo las nuevas pantallas: el website en
`SITE_MANIFEST_SOURCE=api` consume el manifiesto y los `SitePage` de cada tenant.
Este paquete **prepara archivos offline**. No contiene cliente HTTP/DB, no recibe
credenciales y no aplica cambios remotos. No sustituya el contenido vigente con
el export completo de los catálogos del repositorio.

## Contrato comprobado

Se revisó `origin/main` de `1platform-api`, commit
`09d79a5d4313b3a608a260d85afb88f4dc258d29`, mediante `git show`, sin editar el backend:

- `scripts/seed_site_pages.py::seed` reemplaza todo `blocks` de cada documento
  incluido y todo `SiteTenant.pages` con `published_routes`
- `load_fixture` exige unicidad por `(route, locale)`, una sola propiedad de cada
  clave por idioma y paridad global, **incluidos documentos no publicados**
- `--verify` exige que el número total de documentos almacenados del tenant sea
  exactamente el de la fixture; no elimina documentos ausentes
- El cuerpo HTTP `SitePageWriteRequest` también admite `published` booleano
  (por defecto false) junto a `blocks`; `route` y `locale` viajan como query del
  PUT administrativo. No enviar la fixture completa como body de una página.
  El preparador exige `published` explícito en cada documento para conservarlo
- El seed preserva los demás campos del manifiesto. Actualiza timestamps de los
  documentos que cambian; no constituye una transacción entre todos ellos
- `SiteTenantPatchRequest` fusiona hojas de theme/destinations. El paquete emite
  ambos objetos fusionados con el snapshot para que la conservación sea revisable

## Snapshot de entrada

Obtenga un snapshot administrativo completo y coherente del tenant. Debe incluir
**todos** sus `SitePage`, en todos los idiomas y estados, y el manifiesto actual.
El endpoint público sólo devuelve contenido publicado: **no sirve de backup ni
prueba de completitud**. No deduzca el inventario desde la lista de rutas públicas.

Las lecturas administrativas vigentes son:

- `GET /api/v1/platform/sites/{slug}` → manifiesto, en `data`
- `GET /api/v1/platform/sites/{slug}/pages` → todos los documentos, en `data`
- `GET /api/v1/platform/sites/{slug}/content-parity` → comprobación complementaria

Estas lecturas requieren la autenticación real de staff: JWT de aplicación de la
**Consola configurada** en `Authorization: Bearer $APP_TOKEN` y JWT
`staff_access` en `x-user-token: $STAFF_TOKEN`. Un JWT de usuario tenant, incluso
con `is_superadmin`, no satisface `get_current_staff`. Las claves API no son JWT.
No copie tokens, cabeceras, cookies, contraseñas ni respuestas de autenticación a
los snapshots, la terminal, el repositorio o un PR.

Construya el JSON local con esta forma, sin convertir `published:false` en true:

```js
{
  tenant_slug: manifest.slug,
  published_routes: manifest.pages,
  locales: manifest.locales,
  default_locale: manifest.default_locale,
  manifest,
  documents: allAdministrativePages
}
```

`manifest` es obligatorio para 1Platform, para conservar sus valores actuales de
`accent_contrast`, app, docs y status al preparar el parche. Para Medipago es
opcional; si se incluye, se valida y conserva íntegro. Cada documento declara
`route`, `locale`, `published` booleano y `blocks`; se conservan también sus otros
campos. No basta agregar un booleano “completo”: confronte el conteo contra la
fuente administrativa/base privada. El preparador no puede probar offline que
un documento omitido nunca existió.

Guarde snapshots reales y paquetes preparados en una carpeta privada **fuera del
repositorio**. Los artefactos versionados en `artifacts/activation/` son overlays
de referencia de las fuentes aprobadas; deliberadamente no tienen el formato de
fixture que acepta el seed.

## Preparación offline

Desde este worktree, con las dependencias del manifiesto instaladas:

```bash
node scripts/prepare-branding-content.mjs \
  --tenant oneplatform \
  --current /ruta/privada/oneplatform-current.json \
  --out /ruta/privada/oneplatform-prepared.json

node scripts/prepare-branding-content.mjs \
  --tenant medipago \
  --current /ruta/privada/medipago-current.json \
  --out /ruta/privada/medipago-prepared.json

node --test scripts/prepare-branding-content.selftest.mjs
```

No hay opciones `--apply`, `--token`, `--url` ni `--db`. Se generan tres archivos
con permisos `0600`, una vez validados todos los datos:

| Archivo | Uso |
|---|---|
| `*-prepared.json` | Fixture completa fusionada, compatible con `seed_site_pages.py` |
| `*-prepared.json.manifest-patch.json` | Body revisable del PATCH administrativo; `{}` para Medipago, no enviar una petición vacía |
| `*-prepared.json.report.json` | Hashes SHA-256 del JSON serializado, conteos, claves cambiadas y estados no publicados conservados |

1Platform deriva sus valores ejecutando el exportador vigente y seleccionando
únicamente `@infrastructure-home`, `@photographic-interiors` y
`@components/site-chrome` (incluye los siete tokens canónicos). Si una clave ya
existe en otro documento, se actualiza allí: no se duplica ni se mueve. Las
claves nuevas se agregan al documento del catálogo fuente. No se exportan sobre
el snapshot el contenido editorial ni las otras páginas del repositorio.

Medipago deriva exclusivamente claves `photographic.*` de su fixture aprobada.
No recibe los catálogos, navegación, contactos o tokens de 1Platform. La única
retirada autorizada corresponde a las dos claves `photographic.faq.items.3.*`
con los textos exactos históricos de cobertura por departamentos. El reporte
registra antes, después `null` y ambos hashes. Una cuarta FAQ distinta, parcial,
o índices posteriores se rechazan; no se elimina contenido personalizado.

Se mantienen todas las rutas, locales, documentos ajenos y flags de publicación.
Si una clave de la épica pertenece a un documento no publicado, sigue allí sin
publicarse: `retained_unpublished_overlay_documents` lo informa. Resuelva esa
condición con revisión explícita del contenido antes de declarar activación.
No replique claves en un nuevo documento publicado para eludirla.

El parche 1Platform propone únicamente:

- `home_template: photographic-service`
- `theme.accent: #2854a7`, `theme.display_font: manrope`
- `destinations.support: https://wa.me/50253946564`

El resto de theme/destinations conserva los valores del snapshot. No cambia
brand, dominio, aliases, rutas, estado de publicación ni indexabilidad. El
manifiesto Medipago no cambia. Repetir la preparación sobre el resultado deja el
contenido idéntico y produce cero cambios de claves.

## Compuerta E2E antes del merge

Solicitar **`/verify-epic-e2e 1platform-infraestructura-branding`** usando
**`.claude/commands/verify-epic-e2e.md` DEL MONOREPO**. Necesita autorización humana.
Este paquete y sus selftests no ejecutan esa compuerta.

Prerrequisitos conocidos:

- Website: `/Users/staimer/Documents/1platform-worktrees/infraestructura-branding-website`,
  rama `feat/1platform-infraestructura-branding`
- Developer: `/Users/staimer/Documents/1platform-worktrees/infraestructura-branding-developer`,
  rama `feat/1platform-infraestructura-branding`
- Worktree aislado de API alineado con su `origin/main` actual; no reutilizar
  silenciosamente el checkout principal ni una base de QA/producción
- Python/venv y dependencias actuales de API, Node y npm del website, pnpm del
  developer; puertos no cero asignados mediante `/levantar` del monorepo
- Mongo local privado, nombre exclusivo y conexión loopback comprobada; seeds de
  aplicación Consola/staff requeridos por la autenticación administrativa real
- Los tenants `oneplatform` y `medipago` deben existir en esa base privada. El
  backend dispone de `scripts/seed_site_tenants.py --fixture ...`; en una base
  nueva una home fotográfica queda draft hasta tener contenido raíz publicado.
  Preparar primero los manifiestos privados, luego las páginas y después
  comprobar/publicar sus estados dentro del banco autorizado. No tocar DNS,
  aprovisionamiento externo ni dominios reales
- Snapshots completos, fixtures preparadas y patch revisados. La disponibilidad
  de un snapshot administrativo real es un prerrequisito externo todavía abierto

Los previews 4460/4461 usan **fixtures HTTP**, 4468 usa contenido del repositorio
y 4473 sirve developer: ninguno demuestra persistencia ni autenticación real.
El banco autorizado debe apuntar `SITE_API_BASE_URL` a su API local y mantener
`SITE_MANIFEST_SOURCE=api`. Configure `SITE_DESTINATION_ORIGINS` en website y
`WEBSITE_URL`/`DEVELOPER_URL` en developer para enlaces cruzados locales; no cambie
los destinos públicos almacenados para conseguir enlaces de preview.

Dentro del banco autorizado, el procedimiento del backend para cada fixture es:

1. Validar que `--uri` y `--db` señalan exclusivamente la base local privada;
   **nunca ejecutar el seed con sus defaults**, que pueden señalar otro entorno
2. Ejecutar `python scripts/seed_site_pages.py --fixture <prepared.json>
   --uri <uri-local-privada> --db <base-local-privada> --dry`
3. Revisar que no se pierde ningún documento/ruta y volver a comprobar el
   snapshot contra la base. Detener ante ediciones concurrentes; regenerar el
   paquete con un snapshot fresco. Los hashes del reporte no son un bloqueo DB
4. Sólo en ese banco autorizado, ejecutar el seed con la misma fixture, URI y
   base, **retirando `--dry` y agregando `--verify`**. No combinar ambos flags:
   `--dry --verify` omite expresamente la verificación porque no escribió nada.
   Después aplicar el patch 1Platform por el mecanismo administrativo existente
5. Verificar por lectura administrativa todos los flags `published` y por lectura
   pública el manifiesto/contenido, **además** del `--verify`: ese verificador
   compara conteo, blocks y rutas, pero no comprueba cada flag de publicación
6. Repetir el seed: sin escrituras de contenido, mismo conteo/rutas. Navegar como
   usuario con API real por landing, blog, artículo, guía y Scalar; comprobar
   ambos tenants, idiomas, menús, búsqueda y recarga profunda

La activación en un entorno compartido/producción es un paso posterior al merge
**con autorización separada**, snapshot reciente y revisión del paquete exacto.
Nada de lo preparado aquí autoriza ni realiza ese paso. Las lecturas públicas de
producción sólo prueban su estado observado; no sustituyen el banco local.
