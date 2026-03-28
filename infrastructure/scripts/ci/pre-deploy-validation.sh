#!/usr/bin/env bash
set -euo pipefail

echo "[ci] run the development product hardening quality bar"
npm run quality:product-hardening

echo "[ci] verify backend deploy/runtime contract"
npm run deploy:render:verify-local
