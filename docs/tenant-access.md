# Acceso desde una landing de tenant

La composición `photographic-service` puede publicar un recorrido de acceso con
la marca del tenant. «Acceder» en cabecera y pie abre la página intermedia;
«Iniciar sesión» utiliza `destinations.app` y «Solicitar acceso» conduce a una
página con el enlace de soporte configurado en `destinations.support`.

## Activación

1. Desplegar el renderer con `/access/` y `/request-access/`.
2. Exportar los catálogos con `node scripts/export-site-content.mjs --out <archivo>`.
3. En la API administrativa, guardar para el tenant los bloques de
   `@tenant-access` bajo `/access/` y de `@tenant-request-access` bajo
   `/request-access/`, con su idioma declarado y `published: true`.
4. Configurar el destino de la aplicación y añadir **ambas** rutas canónicas al
   manifiesto. Conservar sus rutas y destinos existentes.
5. Verificar el recorrido en el host público. Para un tenant cuyo idioma por
   defecto es español, las URLs son `/acceso/` y `/solicitar-acceso/`.

El exportador no activa estas rutas en 1Platform ni en otros tenants. No existe
un destino de aplicación o soporte por defecto. El mensaje de WhatsApp procede
del contenido del tenant; `{brand}` se sustituye al renderizar, sin HTML crudo.
Las páginas funcionan sin JavaScript y se excluyen del sitemap y del índice.

## Vende Fácil

Destino de sesión aprobado: `https://app.1platform.pro/app/auth/login`.
Contacto confirmado desde su propia landing: `https://wa.me/50236532841`.
Se preservan la home publicada, su cotización, contenido y destinos existentes.
La activación usa la API administrativa, con snapshot previo, sin escritura
directa en la base de datos ni cambios en otros tenants.

## Verificación

`tests/photographic-landing.spec.ts` comprueba el flujo servido con un segundo
tenant comercial: destinos independientes, nombre en el mensaje, vuelta al
inicio, ausencia en tenants sin activar, accesibilidad y 320/390/844/1440 px.

La nueva página comparte CSS con la home. El build extrae ese CSS en dos enlaces
en las referencias EN/ES de 1Platform; las dos capturas HTML se actualizan sólo
después de comprobar que, quitando esos enlaces CSS, el HTML sigue idéntico.
No se modifican umbrales ni normalizadores de regresión.
