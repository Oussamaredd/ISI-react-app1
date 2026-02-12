#!/usr/bin/env bash
set -euo pipefail

echo "[ci] typecheck frontend"
npm run typecheck --workspace=ecotrack-app

echo "[ci] lint frontend"
npm run lint --workspace=ecotrack-app

echo "[ci] test frontend"
npm run test:coverage --workspace=ecotrack-app

echo "[ci] build frontend"
npm run build --workspace=ecotrack-app
