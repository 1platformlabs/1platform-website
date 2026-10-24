# 1platform.pro — imagen de producción.
#
# Multi-stage a propósito: el host del dedicado corre CentOS 7.9 con >1200 días
# de uptime y no queremos que el build dependa de qué runtime tenga instalado.

# ── Etapa 1: construir el sitio ──────────────────────────────────────────────
# La versión sale de `.nvmrc` (24), la misma que usa el job `build` del
# pipeline: si el CI y la imagen construyeran con runtimes distintos, el
# artefacto verificado en CI no sería el que se sirve.
#
# El tag flota a propósito dentro de la línea 24: el parche de seguridad de Node
# del 2026-10-21 (24.22.1 en esta línea) entra solo al reconstruir. Esta etapa
# NO llega a producción —sólo construye—, así que no lleva la compuerta de
# versión mínima que sí lleva el runtime de abajo.
FROM node:24-alpine AS build

WORKDIR /app

# Las dependencias van en su propia capa: cambiar `src/` no reinstala nada.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Las dependencias de PRODUCCIÓN, en un árbol aparte, para copiarlas a la imagen
# final sin arrastrar las de desarrollo.
#
# ⚠️ `sharp` NO es dependencia de desarrollo por accidente de este comando: el
# build estático optimizaba las imágenes de antemano y las emitía como archivos;
# un build de servidor no puede, así que expone `/_image` y redimensiona bajo
# demanda — en tiempo de PETICIÓN, con `sharp`. Si quedara fuera de la imagen
# final, el sitio arrancaría perfecto y toda imagen respondería 500. Por eso se
# lo instala explícitamente aunque `package.json` lo declare en devDependencies.
RUN npm ci --omit=dev && npm i --no-save sharp@^0.35.5

# ── Etapa 2: servir — nginx DELANTE de Node ──────────────────────────────────
# ⚠️ VERSIÓN FIJADA, y no es cosmético: `nginx:alpine` y `nginx:stable-alpine`
# (hoy 1.29/1.30) **NO ARRANCAN** en el dedicado. Medido el 2026-08-14 sobre el
# host real (CentOS 7.9, kernel 3.10):
#
#   nginx:alpine         → Exited (1) · pwrite() "/run/nginx.pid" failed (1: Operation not permitted)
#   nginx:stable-alpine  → Exited (1) · idéntico
#   nginx:1.27-alpine    → running ✅
#
# ⚠️ Y POR ESO LA BASE ES ÉSTA Y NO `node:24-alpine`, aunque la imagen necesite
# Node: la pregunta «¿arranca este binario en un kernel 3.10?» ya tiene una
# respuesta MEDIDA para `nginx:1.27-alpine`, y no la tiene para el nginx que
# traería `apk add nginx` sobre `node:24-alpine` (Alpine 3.22 ⇒ nginx 1.28/1.29,
# justo la familia que no arranca). Se parte de lo que se sabe que corre y se le
# agrega lo que falta.
#
# Node llega por `apk`, y la versión alcanza: medido, `nginx:1.27-alpine` es
# Alpine 3.21.3 y su paquete `nodejs` es de la línea **22**, contra el
# `>=22.12.0` que Astro 7 declara en `engines`. El bundle se construye con
# Node 24 y se ejecuta con Node 22; son artefactos ESM planos, no binarios.
#
# ⚠️ PISO DE SEGURIDAD: Node >= 22.23.4. El 2026-10-23 el contenedor de PROD
# (arrancado el 2026-10-21) corría **22.23.2**, afectado por el release de
# seguridad de Node del 2026-10-21 (10 CVE: RCE en el decodificador Brotli
# CVE-2026-111497, bypass de verificación de hostname en TLS, truncamiento por
# NUL en `dns`), corregido en 22.23.4 — que Alpine 3.21 ya publica como
# `nodejs-22.23.4-r0`. Antes la imagen pedía `nodejs` a secas: tomaba lo que
# hubiera en el índice, y una capa cacheada en el host podía reusar un paquete
# viejo sin que nadie se enterara. Ahora:
#   1. `apk` exige la versión mínima (`nodejs>=…`) y falla si el índice no la
#      tiene, en vez de instalar una más vieja;
#   2. el build verifica `node -v` y FALLA si queda por debajo del piso;
#   3. el piso es un ARG usado en el `RUN`: subirlo cambia la clave de caché de
#      esa capa, así que el host no puede reusar la instalación anterior.
# Para el próximo release de seguridad: subir NODE_RUNTIME_MIN y nada más.
# Verificar tras el deploy: `docker exec 1platform-website-prod node -v`.
FROM nginx:1.27-alpine AS runtime

ARG NODE_RUNTIME_MIN=22.23.4

# `sharp` rasterises the tenant social card from SVG at request time. Alpine's
# nginx image carries neither a font nor fontconfig, which would let the PNG
# encoder succeed while silently omitting the brand text. Keep a small,
# deterministic sans face in the runtime image rather than relying on a build
# dependency that `npm ci --omit=dev` removes.
RUN apk add --no-cache --upgrade "nodejs>=${NODE_RUNTIME_MIN}" fontconfig font-dejavu \
 && node -e 'const [m,c]=[process.argv[1],process.versions.node].map(v=>v.split(".").map(Number));if((c.map((x,i)=>x-m[i]).find(x=>x!==0)??0)<0){console.error(`Node ${process.version} está por debajo del piso de seguridad v${process.argv[1]}`);process.exit(1)}' "${NODE_RUNTIME_MIN}" \
 && echo "runtime: node $(node -v) (piso v${NODE_RUNTIME_MIN})"

# El contrato de servido (www→apex, caché por familia, nosniff, 404 real) vive
# versionado en el repo, no editado a mano en el host.
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/docker/proxy-to-node.conf /etc/nginx/proxy-to-node.conf

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

COPY deploy/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

# `nginx:alpine` NO trae `curl` — el healthcheck del compose usa `wget`, que sí
# viene en la imagen base. Copiar el `test: ["CMD","curl",...]` del molde daría
# un contenedor permanentemente `unhealthy` con el sitio sirviendo bien.
ENTRYPOINT ["/entrypoint.sh"]
