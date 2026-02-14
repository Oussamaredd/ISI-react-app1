#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infrastructure/docker-compose.yml"
ENV_FILE="$REPO_ROOT/infrastructure/environments/.env.docker"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

echo "[verify-docker] validating base compose config"
compose config >/dev/null

echo "[verify-docker] validating profiles"
for profile in core obs quality; do
  compose --profile "$profile" config >/dev/null
done

full_config="$(compose --profile core --profile obs --profile quality config)"

echo "[verify-docker] checking required services"
for service in db migrate backend frontend elasticsearch logstash kibana prometheus grafana; do
  if grep -q "^[[:space:]]\{2,\}$service:" <<<"$full_config"; then
    echo "  - $service: ok"
  else
    echo "  - $service: missing"
    exit 1
  fi
done

echo "[verify-docker] checking required network"
if ! grep -q "ticket-management-network" <<<"$full_config"; then
  echo "  - ticket-management-network: missing"
  exit 1
fi

echo "[verify-docker] checking key rendered env values"
for needle in "DATABASE_URL=" "POSTGRES_USER=" "POSTGRES_DB="; do
  if ! grep -q "$needle" <<<"$full_config"; then
    echo "  - $needle missing"
    exit 1
  fi
done

echo "[verify-docker] all checks passed"
