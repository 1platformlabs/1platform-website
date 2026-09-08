#!/bin/sh
# Dos procesos en un contenedor, y el contenedor muere si CUALQUIERA muere.
#
# WHY THIS FILE EXISTS AT ALL
# ---------------------------
# D-23 pone nginx delante de Node: nginx conserva el contrato de servido y Node
# resuelve el inquilino y renderiza. Uno solo de los dos no sirve de nada, así
# que el contenedor tiene que tratarlos como una unidad.
#
# EL MODO DE FALLA QUE ESTO EVITA, DICHO SIN ADORNOS
# --------------------------------------------------
# La forma ingenua —arrancar Node en segundo plano y nginx en primer plano— deja
# un contenedor que Docker considera VIVO cuando Node se murió: nginx sigue en
# pie, contesta 502 a todo, `docker ps` dice `Up`, y `restart: unless-stopped`
# no dispara porque nada terminó. El sitio está caído y la infraestructura dice
# que está bien. Con `wait -n` el contenedor sale en cuanto el primero de los
# dos termina, y ahí sí la política de reinicio hace su trabajo.
#
# `wait -n` está VERIFICADO en esta imagen, no supuesto: el `sh` de
# `nginx:1.27-alpine` es busybox ash, y no todas las builds de busybox lo traen.
# Medido dentro de la imagen: `sleep 1 & sleep 2 & wait -n; echo $?` → `0`.
set -eu

: "${PORT:=4321}"
: "${HOST:=127.0.0.1}"
export PORT HOST

# 127.0.0.1 y no 0.0.0.0: el único que tiene que alcanzar a Node es el nginx de
# este mismo contenedor. Escuchar en todas las interfaces publicaría la
# aplicación SIN el contrato de servido —sin `nosniff`, sin la política de
# caché, sin el redirect de `www`— a quien pudiera hablarle al puerto.
node ./dist/server/entry.mjs &
NODE_PID=$!

# Que Node esté ESCUCHANDO antes de aceptar tráfico. Sin esto, las primeras
# peticiones tras un deploy reciben 502 mientras el proceso arranca — que es
# justo la ventana en la que el pipeline sondea el sitio y decide si el deploy
# salió bien.
i=0
while [ "$i" -lt 60 ]; do
    if wget -q -O /dev/null --spider "http://127.0.0.1:${PORT}/" 2>/dev/null; then break; fi
    # Un 404 también significa «está escuchando»: con el manifiesto en la API,
    # `/` con el Host de loopback no resuelve ningún inquilino. Lo que se
    # comprueba acá es que el socket contesta, no que el sitio sirva.
    if wget -q -O /dev/null "http://127.0.0.1:${PORT}/" 2>&1 | grep -q . ; then break; fi
    if ! kill -0 "$NODE_PID" 2>/dev/null; then
        echo "entrypoint: el proceso de Astro murió durante el arranque" >&2
        exit 1
    fi
    i=$((i + 1))
    sleep 0.5
done

nginx -g 'daemon off;' &
NGINX_PID=$!

# Una señal al contenedor tiene que llegarles a los dos, o Docker espera los
# diez segundos completos y después los mata a lo bruto — que en medio de un
# deploy es una petición cortada por cada visitante que hubiera en vuelo.
trap 'kill -TERM "$NODE_PID" "$NGINX_PID" 2>/dev/null || true' TERM INT

wait -n
STATUS=$?
echo "entrypoint: uno de los dos procesos terminó (status ${STATUS}); bajando el otro" >&2
kill -TERM "$NODE_PID" "$NGINX_PID" 2>/dev/null || true
exit "$STATUS"
