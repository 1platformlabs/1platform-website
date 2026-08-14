# 1platform.pro — imagen de producción.
#
# Multi-stage a propósito: el host del dedicado corre CentOS 7.9 con >1200 días
# de uptime y no queremos que el build dependa de qué runtime tenga instalado.
# La etapa `build` trae su propio Node; la imagen final NO lleva Node ni
# node_modules — sólo nginx y el `dist/` ya construido.

# ── Etapa 1: construir el sitio ──────────────────────────────────────────────
# La versión sale de `.nvmrc` (24), la misma que usa el job `build` del
# pipeline: si el CI y la imagen construyeran con runtimes distintos, el
# artefacto verificado en CI no sería el que se sirve.
FROM node:24-alpine AS build

WORKDIR /app

# Las dependencias van en su propia capa: cambiar `src/` no reinstala nada.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Etapa 2: servir ──────────────────────────────────────────────────────────
# ⚠️ VERSIÓN FIJADA, y no es cosmético: `nginx:alpine` y `nginx:stable-alpine`
# (hoy 1.29/1.30) **NO ARRANCAN** en el dedicado. Medido el 2026-08-14 sobre el
# host real (CentOS 7.9, kernel 3.10):
#
#   nginx:alpine         → Exited (1) · pwrite() "/run/nginx.pid" failed (1: Operation not permitted)
#   nginx:stable-alpine  → Exited (1) · idéntico
#   nginx:1.27-alpine    → running ✅
#
# El molde del que sale este pipeline (`bower-dashboard`) nunca lo tocó porque
# su contenedor es Node, no nginx. Con un tag flotante el build sale verde, la
# imagen se publica, y el contenedor muere al arrancar: el pipeline sólo se
# entera si el health check sondea de verdad — por eso también existe ese probe.
FROM nginx:1.27-alpine AS runtime

# El contrato de servido (www→apex, DirectorySlash, 404 real, caché, nosniff)
# vive versionado en el repo, no editado a mano en el host.
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# `nginx:alpine` NO trae `curl` — el healthcheck del compose usa `wget`, que sí
# viene en la imagen base. Copiar el `test: ["CMD","curl",...]` del molde daría
# un contenedor permanentemente `unhealthy` con el sitio sirviendo bien.
