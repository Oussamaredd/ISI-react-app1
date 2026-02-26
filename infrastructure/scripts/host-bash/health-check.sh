#!/usr/bin/env bash

set -euo pipefail

API_LIVE_URL="${API_LIVE_URL:-http://localhost:3001/health}"
API_READY_URL="${API_READY_URL:-http://localhost:3001/api/health/ready}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

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

check "frontend" "$FRONTEND_URL"
check "backend-live" "$API_LIVE_URL"
check "backend-ready" "$API_READY_URL"

echo "[health] done"
