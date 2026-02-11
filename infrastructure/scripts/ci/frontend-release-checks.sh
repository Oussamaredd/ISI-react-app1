#!/usr/bin/env bash
set -euo pipefail

echo "[ci] typecheck frontend"
npm run typecheck --workspace=react-app1-app

echo "[ci] lint frontend"
npm run lint --workspace=react-app1-app

echo "[ci] test frontend"
npm run test:coverage --workspace=react-app1-app

echo "[ci] build frontend"
npm run build --workspace=react-app1-app
