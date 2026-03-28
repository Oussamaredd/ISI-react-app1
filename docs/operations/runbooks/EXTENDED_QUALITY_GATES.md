# Quality Gates And Extended Lanes

Last updated: 2026-03-28

This runbook describes the repo-owned Development quality bar plus the optional extended lanes available through manual CI dispatch.

## Default Blocking Quality Bar

The canonical Development hardening command is:

```bash
npm run quality:product-hardening
```

It runs, in order:

- env policy validation
- doc-sync validation
- spec and CDC validation
- lint
- typecheck
- Sonar coverage alignment validation
- web critical-journey tests
- web realtime fallback tests
- app/mobile/api coverage lanes
- mobile readiness verification
- frontend production build
- repo-owned Lighthouse gate

The dedicated mobile release lane is:

```bash
npm run quality:mobile-readiness
```

## Output Paths

- Local default: `tmp/quality`
- CI/CD default: `tmp/ci/quality`
- Key artifacts:
  - coverage: `coverage/app`, `coverage/mobile`, `coverage/api`
  - Lighthouse: `lighthouse`
  - bundle budgets: `bundle-budgets`
  - mobile readiness: `mobile-readiness`

## Lighthouse

- Config: `app/lighthouserc.cjs`
- Runner: `infrastructure/scripts/ci/run-lighthouse-gate.mjs`
- Canonical URLs:
  - `/`
  - `/login`
  - `/app/dashboard`
- Local fallback skip only:
  - `ECOTRACK_SKIP_LIGHTHOUSE_GATE=1`
  - `ENABLE_LIGHTHOUSE_GATE=0`
- Optional preview overrides:
  - `LIGHTHOUSE_PREVIEW_PORT`
  - `LIGHTHOUSE_BASE_URL`

## Bundle Budgets

The bundle budget gate is route-aware and writes markdown and JSON summaries to `bundle-budgets`.

Supported overrides:

- `ECOTRACK_INITIAL_ROUTE_SHELL_GZIP_BUDGET_KB`
- `ECOTRACK_LANDING_ROUTE_GZIP_BUDGET_KB`
- `ECOTRACK_LOGIN_ROUTE_GZIP_BUDGET_KB`
- `ECOTRACK_DASHBOARD_ROUTE_GZIP_BUDGET_KB`
- `ECOTRACK_ADMIN_ROUTE_GZIP_BUDGET_KB`
- `ECOTRACK_MAPPING_VENDOR_GZIP_BUDGET_KB`
- `ECOTRACK_LOGO_BUDGET_KB`

## Extended Manual Lanes

Manual dispatch in `.github/workflows/CI.yaml` still exposes the extended pack:

- K6 load smoke
- ZAP baseline
- focused mutation gate
- visual regression hook
- Lighthouse CI

Lane status in the manual extended workflow:

- blocking: K6, Lighthouse
- advisory while thresholds stabilize: ZAP, mutation, visual regression

## Local Commands

```bash
npm run ci:quality:k6
node infrastructure/scripts/ci/run-mutation-gate.mjs
node infrastructure/scripts/ci/run-visual-gate.mjs
npm run ci:quality:lighthouse
```
