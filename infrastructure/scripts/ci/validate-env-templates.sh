#!/usr/bin/env bash
set -euo pipefail

echo "[ci] validate environment templates"
npm run validate-env:all
