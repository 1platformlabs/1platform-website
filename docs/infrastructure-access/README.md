# Acceso de 1Platform

La integración recupera «Acceder» en la cabecera de infraestructura, su menú
móvil y el pie. Las páginas intermedias reutilizan el recorrido existente y
la identidad de infraestructura; el inicio de sesión sigue perteneciendo al
Dashboard. No se añaden autenticación ni formularios de alta al website.

## Configuración preparada

`activation.json` es un paquete de cambios, **no un manifiesto de reemplazo**.
Contiene cuatro documentos publicados (dos rutas por dos idiomas), las dos
rutas canónicas a añadir y el destino de sesión aprobado. Los textos usan
`{brand}` y el contacto permanece en `destinations.support` del tenant.

La lectura pública del 26-10-2026 de `oneplatform` no incluía `/access/`,
`/request-access/` ni contenido `access.*`; `/es/acceso/` respondía 404.
Por tanto, desplegar este código por sí solo no hace aparecer el botón.
El gate de ambas rutas se conserva para no activar otros tenants.

## Orden de publicación

Estos pasos son posteriores al PR y requieren el alcance de publicación
correspondiente. Esta integración no los ejecuta.

1. Publicar el renderer del website y comprobar su SHA servido.
2. En la API administrativa, guardar un snapshot del manifiesto de `oneplatform`
   y de sus SitePages para ambas rutas/idiomas, incluyendo inexistencias.
3. Guardar los cuatro documentos de `activation.json` en el tenant indicado.
   Si ya existen, revisar el diff y preservar los bloques y metadatos ajenos.
4. Añadir ambas rutas al conjunto existente `pages` y aplicar sólo
   `destinations_patch.app`. Conservar los demás destinos, hosts, logos,
   módulos, idiomas y configuración; comprobar que soporte sigue siendo
   `https://wa.me/50253946564`. No enviar este paquete entero al endpoint de manifiesto.
5. Esperar la invalidación/caducidad de la caché y comprobar EN/ES:
   `/access/`, `/request-access/`, `/es/acceso/`, `/es/solicitar-acceso/`.
   Deben responder 200; login debe apuntar a
   `https://app.1platform.pro/app/auth/login`, y solicitud al soporte del tenant.
   Revisar cabecera/pie en home y blog, móvil y escritorio, y ausencia de las
   rutas en sitemap (`noindex,follow` en las páginas).
6. Publicar el PR compañero de Developer sólo después de esos 200. Su
   navegación apunta a `/es/acceso/` del `WEBSITE_URL` configurado; un build
   del portal no activa rutas en el website.

## Script de activación y reversión

`activate_access.py` aplica este paquete por los servicios del Core
(`SitePageService.put_page` y `SiteTenantService.patch_tenant`), con las mismas
validaciones que la API administrativa y sin abrir sesiones de staff. Corre
dentro de un runtime del Core (`PYTHONPATH` en la raíz del API). Sin `--apply`
toda fase es de sólo lectura.

```bash
python activate_access.py plan      --package activation.json --snapshot-out snapshot.json
python activate_access.py documents --package activation.json --apply
#   esperar ≥2 min con tráfico EN y ES (cachés de 60 s del website)
python activate_access.py manifest  --package activation.json --apply
python activate_access.py verify    --package activation.json
```

`manifest` se niega si faltan los documentos; escribe sólo `pages` (lista viva
más las dos rutas) y `destinations.app`. Reversión, también en dos fases:

```bash
python activate_access.py rollback --package activation.json --snapshot snapshot.json --phase manifest --apply
#   esperar ≥2 min con tráfico EN y ES
python activate_access.py rollback --package activation.json --snapshot snapshot.json --phase documents --apply
```

La fase `documents` se niega mientras las rutas sigan publicadas. Borra sólo
los documentos que no existían en el snapshot y que nadie editó después, y
restaura `destinations.app` sólo si sigue en el valor de este paquete.

Efecto colateral conocido: `destinations.app` también alimenta los CTA de
`/about/`, `/contact/`, `/pricing/`, `/payments-invoicing/` y `/solutions/*`
(con `?intent=`), que pasan de `/app/` a `/app/auth/login`. El panel no lee
`intent` hoy, así que el parámetro ya se ignoraba.

El orden importa en las dos direcciones. Manifiesto y contenido se cachean por
separado; en el banco local, borrar los documentos en el mismo paso que el
manifiesto dejó todas las páginas en inglés en 503 hasta que el manifiesto
caducó. Desde este PR la cabecera y el pie omiten la entrada si falta su copia
(`tenantAccessChrome`), pero las páginas de acceso siguen exigiéndola.

Banco local: `bench/seed_bench.py` carga un snapshot real y un sitio sin
activar; `bench/probe_access.mjs <web> <dev> <capturas> [--expect-control]`
recorre website y Developer en 320/390/844/1440 px.

## Evidencia y continuación

`tests/photographic-landing.spec.ts` sirve el build real contra una API HTTP
controlada: EN/ES, 320/390/844/1440 px, navegación completa, destinos por tenant,
accesibilidad y tenant sin activar. No ejercita credenciales ni una DB real.
La regresión de contraste falló con texto navy sobre azul antes de definir el
color de primer plano de infraestructura, y queda cubierta por CSS computado.

Para el gate de banco real: `/verify-epic-e2e 1platform-infraestructura-branding`
con `.claude/commands/verify-epic-e2e.md` del monorepo. Worktrees:
`../landing-access-website` y `../landing-access-developer`, rama
`fix/infrastructure-access` en cada repositorio. Se necesitan API/DB privadas,
seeds locales de SiteTenant/SitePage con este paquete, aplicación y usuario
de prueba si se verifica login, puertos aislados y `WEBSITE_URL` local en
Developer. Para llamadas desde la referencia, usar `SCALAR_PROXY_URL=''` y
servidores Core/Atlas locales con CORS del portal. No usar QA/PROD como banco.

No cambia ninguna regla de workspace: `AGENTS.md` y `CLAUDE.md` permanecen intactos.
