#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_DIR="$INFRA_DIR/environments"
DOCKER_ENV="$ENV_DIR/.env.docker"
DOCKER_TEMPLATE="$ENV_DIR/.env.docker.example"

print_help() {
  cat <<'EOF'
Environment management (canonical infrastructure env files)

Usage: manage-env.sh <command>

Commands:
  init-docker   Create infrastructure/environments/.env.docker from template if missing
  status        Show canonical environment file status
  help          Show this help
EOF
}

init_docker() {
  if [[ -f "$DOCKER_ENV" ]]; then
    echo "[info] infrastructure/environments/.env.docker already exists"
    return 0
  fi

  if [[ ! -f "$DOCKER_TEMPLATE" ]]; then
    echo "[error] Missing template: infrastructure/environments/.env.docker.example"
    return 1
  fi

  cp "$DOCKER_TEMPLATE" "$DOCKER_ENV"
  echo "[info] Created infrastructure/environments/.env.docker from template"
  echo "[warn] Update CHANGE_ME_* values before running containers"
}

status() {
  echo "[info] Canonical environment files:"
  local file
  for file in ".env.docker" ".env.docker.example" ".env.development.example" ".env.staging.example" ".env.production.example"; do
    if [[ -f "$ENV_DIR/$file" ]]; then
      echo "  [ok] infrastructure/environments/$file"
    else
      echo "  [missing] infrastructure/environments/$file"
    fi
  done
}

case "${1:-help}" in
  init-docker)
    init_docker
    ;;
  status)
    status
    ;;
  help|--help|-h)
    print_help
    ;;
  *)
    echo "[error] Unknown command: $1"
    print_help
    exit 1
    ;;
esac
