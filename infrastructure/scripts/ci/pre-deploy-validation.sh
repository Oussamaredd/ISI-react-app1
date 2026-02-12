#!/usr/bin/env bash
set -euo pipefail

echo "[ci] validate env policies/templates"
npm run validate-env:all

echo "[ci] enforce architecture boundaries"
npm run lint

echo "[ci] build and typecheck database workspace"
npm run build --workspace=ecotrack-database
npm run typecheck --workspace=ecotrack-database

echo "[ci] run database migrations"
npm run db:migrate --workspace=ecotrack-database

echo "[ci] run backend tests"
npm run test --workspace=ecotrack-api
