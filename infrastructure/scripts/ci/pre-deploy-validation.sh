#!/usr/bin/env bash
set -euo pipefail

echo "[ci] validate env policies/templates"
npm run validate-env:all

echo "[ci] enforce architecture boundaries"
npm run lint

echo "[ci] build and typecheck database workspace"
npm run build --workspace=react-app1-database
npm run typecheck --workspace=react-app1-database

echo "[ci] run database migrations"
npm run db:migrate --workspace=react-app1-database

echo "[ci] run backend tests"
npm run test --workspace=react-app1-api
