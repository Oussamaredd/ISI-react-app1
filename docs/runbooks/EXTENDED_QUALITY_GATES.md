# Extended Quality Gates

This runbook covers the non-default quality lanes that are available through the manual `run_extended_quality=true` GitHub Actions dispatch and through repo-local commands.

## Scope

The current extended pack covers:

- K6 load and endurance scenarios (`M10.2`)
- focused Stryker mutation testing (`M10.4`)
- Percy visual regression snapshots (`M10.5`)
- Lighthouse CI / Web Vitals auditing (`M10.8`)

These lanes are still non-blocking in `CI.yaml` while thresholds and artifacts stabilize, but they now run real repo-owned scripts instead of placeholder hooks.

## Local Commands

```bash
npm run ci:quality:k6
ENABLE_MUTATION_GATE=1 node infrastructure/scripts/ci/run-mutation-gate.mjs
ENABLE_VISUAL_GATE=1 PERCY_TOKEN=<token> node infrastructure/scripts/ci/run-visual-gate.mjs
ENABLE_LIGHTHOUSE_GATE=1 node infrastructure/scripts/ci/run-lighthouse-gate.mjs
```

Useful overrides:

- K6 profiles: `node infrastructure/scripts/ci/run-k6-scenarios.mjs --profile ramping|spike|stress|soak|all`
- Percy route overrides: `PERCY_URLS=<comma-separated absolute URLs>`
- Percy preview overrides: `PERCY_BASE_URL`, `PERCY_PREVIEW_PORT`
- Mutation dry run: `CI_MUTATION_DRY_RUN=1`

## K6

- Scenario sources live in `infrastructure/performance/k6/`
- The CI runner is `infrastructure/scripts/ci/run-k6-scenarios.mjs`
- Smoke uses readiness only; the business-flow scenario also exercises local auth plus planning dashboard when `K6_LOGIN_EMAIL` and `K6_LOGIN_PASSWORD` are provided
- Summaries are exported to `tmp/ci/k6/*.summary.json`

## Mutation Testing

- Config lives in `infrastructure/tooling/quality/stryker.config.mjs`
- Current mutation scope is intentionally focused on request correlation, trace context, health, monitoring, and auth token handling
- Reports are written under `tmp/ci/stryker`
- The gate respects `CI_QUALITY_STRICT=1` when it should fail hard

## Visual Regression

- Percy config lives in `.percy.yml`
- Default snapshot flow is `infrastructure/scripts/ci/run-visual-snapshots.mjs`
- The default route set is `/`, `/login`, `/app/dashboard`, and `/app/agent/tour`
- The snapshot runner builds the frontend, starts `vite preview`, waits for readiness, and then calls Percy
- `CI_PERCY_COMMAND` remains available for CI overrides, but it is no longer required for the default lane

## Lighthouse

- Config lives in `app/lighthouserc.json`
- The gate runner is `infrastructure/scripts/ci/run-lighthouse-gate.mjs`
- The runner builds the frontend, starts `vite preview`, waits for readiness, and executes LHCI
- Reports are written to `tmp/ci/lighthouse`
- The current audit set covers `/`, `/login`, and `/app/dashboard`

## CI Notes

- Manual workflow dispatch: `.github/workflows/CI.yaml`
- Required secrets/variables:
  - `PERCY_TOKEN`
  - `CI_ENABLE_MUTATION_GATE`
  - `CI_ENABLE_VISUAL_GATE`
  - `CI_ENABLE_LIGHTHOUSE_GATE`
  - optional `CI_PERCY_COMMAND`
- K6 artifacts upload from `tmp/ci/k6`
- Mutation artifacts upload from `tmp/ci/stryker`
- Lighthouse artifacts upload from `tmp/ci/lighthouse`
