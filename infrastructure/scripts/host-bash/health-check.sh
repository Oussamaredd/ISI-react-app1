#!/usr/bin/env bash

set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
FRONTEND_EDGE_READY_URL="${FRONTEND_EDGE_READY_URL:-http://localhost:3000/api/health/ready}"
BACKEND_HOST_PORT_URL="${BACKEND_HOST_PORT_URL:-http://localhost:3001/health}"
BACKEND_INTERNAL_LIVE_URL="${BACKEND_INTERNAL_LIVE_URL:-http://localhost:3001/health}"
BACKEND_INTERNAL_READY_URL="${BACKEND_INTERNAL_READY_URL:-http://localhost:3001/api/health/ready}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$INFRA_DIR/docker-compose.yml"
CANONICAL_ENV="$INFRA_DIR/environments/.env.docker"

docker_compose() {
  docker compose --env-file "$CANONICAL_ENV" -f "$COMPOSE_FILE" "$@"
}

check() {
  local label="$1"
  local url="$2"
  if curl -fsS "$url" >/dev/null; then
    echo "[health] $label: healthy"
  else
    echo "[health] $label: unhealthy"
    return 1
  fi
}

check_closed() {
  local label="$1"
  local url="$2"
  if curl -sS --connect-timeout 2 "$url" >/dev/null; then
    echo "[health] $label: unhealthy (host port is exposed)"
    return 1
  fi

  echo "[health] $label: healthy (host port is closed)"
}

check_docker_exec() {
  local label="$1"
  shift

  if docker_compose exec -T "$@" >/dev/null 2>&1; then
    echo "[health] $label: healthy"
  else
    echo "[health] $label: unhealthy"
    return 1
  fi
}

check "frontend" "$FRONTEND_URL"
check "frontend-edge-ready" "$FRONTEND_EDGE_READY_URL"
check_closed "backend-host-port" "$BACKEND_HOST_PORT_URL"
check_docker_exec "backend-live" backend curl -fsS "$BACKEND_INTERNAL_LIVE_URL"
check_docker_exec "backend-ready" backend curl -fsS "$BACKEND_INTERNAL_READY_URL"
check_docker_exec "database" db pg_isready -U postgres -d ticketdb

echo "[health] done"
