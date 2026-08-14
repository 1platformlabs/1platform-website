#!/usr/bin/env bash
# 1platform.pro — deployment helper
# Usage: ./deploy.sh <prod> <build|start|stop|restart|update|logs|status>
#
# Clonado de `bower-dashboard/deploy.sh` (el molde vivo que despliega al mismo
# dedicado), con UNA corrección deliberada — ver `remove_orphan_container`.

set -euo pipefail

# ── El nombre del proyecto se DERIVA, no se hardcodea ────────────────────────
# El molde escribe `PROJECT_NAME="bower-dashboard-prod"` y su
# `remove_orphan_container()` reconstruye ese mismo nombre a mano para hacerle
# `docker stop` + `docker rm -f`. Copiado tal cual a este repo, cada deploy de
# la landing destruiría el contenedor de `bowerfans.com` — lo único del alcance
# de esta épica que hoy funciona — y como el pipeline invoca
# `./deploy.sh prod stop || true`, lo haría EN SILENCIO y con el job en verde.
#
# Acá el nombre sale del directorio del repo y el huérfano se deriva de
# PROJECT_NAME, así que este script sólo puede tocar su propio contenedor.
# Test de regresión obligatorio (T-28): tras cada corrida,
# `docker inspect -f '{{.Id}}' bower-dashboard-prod` no cambia.
REPO_NAME="$(basename "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_env() { echo -e "${CYAN}[${ENV_LABEL}]${NC} $1"; }

usage() {
    cat <<EOF
Usage: $0 <prod> <build|start|stop|restart|update|logs|status>

Environments:
  prod  Production (usa .env.prod, docker-compose.prod.yml — puerto 3040)

QA no está definido acá a propósito: los ambientes QA se quedan en cPanel
(decisión D-33 de la épica core-hetzner-cutover). Agregar un caso `qa` acá sin
su compose es una trampa: fallaría recién en `check_requirements`.

Commands:
  build    Construir la imagen
  start    Arrancar servicios (detached)
  stop     Detener servicios
  restart  Reiniciar servicios
  update   Detener, reconstruir y arrancar
  logs     Seguir logs
  status   Estado de los servicios
EOF
    exit 1
}

parse_environment() {
    case "${1:-}" in
        prod)
            ENV_FILE=".env.prod"
            COMPOSE_FILE="docker-compose.prod.yml"
            ENV_LABEL="PROD"
            PROJECT_NAME="${REPO_NAME}-prod"
            ;;
        *)
            usage
            ;;
    esac
}

dc() {
    docker compose --env-file "$ENV_FILE" -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
}

check_requirements() {
    command -v docker >/dev/null || { log_error "Docker not installed"; exit 1; }
    docker compose version >/dev/null || { log_error "docker compose plugin missing"; exit 1; }
    [[ -f "$ENV_FILE" ]] || { log_error "Missing $ENV_FILE — el job del pipeline lo escribe antes de construir"; exit 1; }
    [[ -f "$COMPOSE_FILE" ]] || { log_error "Missing $COMPOSE_FILE"; exit 1; }
}

remove_orphan_container() {
    # Baja cualquier contenedor con ESTE nombre aunque no lo trackee este
    # proyecto de compose (huérfano de una corrida previa, un `docker run` a
    # mano, o un proyecto hermano que declare el mismo container_name).
    #
    # El nombre se deriva de PROJECT_NAME — nunca se escribe a mano. Ver el
    # bloque de arriba: el molde lo hardcodeaba y por eso no se copia igual.
    local name="$PROJECT_NAME"

    # Búsqueda por nombre EXACTO (sin regex; el docker viejo del host no honra
    # `--filter name=` como igualdad).
    if docker ps -a --format '{{.Names}}' | grep -Fxq "$name"; then
        local meta
        meta=$(docker inspect "$name" --format 'id={{.Id}} project={{index .Config.Labels "com.docker.compose.project"}} state={{.State.Status}}' 2>/dev/null || echo "<inspect failed>")
        log_warn "Contenedor existente bloqueando el deploy: $meta"
        # Stop antes que rm: algunas políticas de restart lo resucitan si sólo
        # se hace `rm -f`.
        docker stop "$name" >/dev/null 2>&1 || true
        docker rm -f "$name" >/dev/null 2>&1 || true
        sleep 1
    fi
}

cmd_build()   { log_env "Construyendo imagen..."; dc build; }
cmd_start()   {
    log_env "Arrancando servicios...";
    for attempt in 1 2; do
        remove_orphan_container
        if dc up -d --remove-orphans; then
            dc ps
            return
        fi
        log_warn "compose up falló (intento ${attempt}); reintentando tras purgar huérfanos..."
        sleep 1
    done
    log_error "compose up falló tras los reintentos"
    return 1
}
cmd_stop()    { log_env "Deteniendo servicios..."; dc down --remove-orphans; remove_orphan_container; }
cmd_restart() { log_env "Reiniciando..."; dc restart; }
cmd_update()  { cmd_stop; cmd_build; cmd_start; }
cmd_logs()    { log_env "Siguiendo logs..."; dc logs -f --tail=200; }
cmd_status()  { log_env "Estado:"; dc ps; }

main() {
    parse_environment "${1:-}"
    local action="${2:-}"
    [[ -n "$action" ]] || usage

    check_requirements

    case "$action" in
        build)   cmd_build ;;
        start)   cmd_start ;;
        stop)    cmd_stop ;;
        restart) cmd_restart ;;
        update)  cmd_update ;;
        logs)    cmd_logs ;;
        status)  cmd_status ;;
        *)       usage ;;
    esac

    log_info "Done."
}

main "$@"
