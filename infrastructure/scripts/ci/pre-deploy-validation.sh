#!/usr/bin/env bash
set -euo pipefail

echo "[ci] validate env policies/templates"
npm run validate-env:all

echo "[ci] enforce architecture boundaries"
npm run lint

echo "[ci] typecheck all workspaces"
npm run typecheck

echo "[ci] run the full monorepo test suite"
npm run test

echo "[ci] verify backend deploy/runtime contract"
npm run deploy:render:verify-local

echo "[ci] build the frontend release bundle"
npm run build --workspace=ecotrack-app
