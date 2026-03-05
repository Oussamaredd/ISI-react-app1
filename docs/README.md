# Project Documentation

Documentation is split by purpose so day-to-day navigation stays predictable.

## Start Here
- `../README.md` - repository quick start and canonical command surface
- `ROADMAP.md` - development roadmap, sprint status, and canonical progress tracking
- `ROADMAP.md` section "UI Completion Execution Plan (Live)" - agent-dispatch sprint plan for remaining UI gaps
- `ARCHITECTURE_OVERVIEW.md` - layer boundaries and architecture contract
- `ENVIRONMENT_SETUP.md` - local/Docker/deploy environment setup

## Environment and Configuration
- `ENV.md` - current source of truth for env rules, browser origins, and the port contract
- `ENV_INVENTORY.md` - env variable inventory reference snapshot
- `ENV_CONFLICTS.md` - historical conflict matrix and normalization notes
- `ENV_CANONICAL_DECISIONS.md` - decision record behind the current canonical env model
- `SECURITY.md` - secret management and leakage safeguards

## Runtime and Operations
- `DOCKER_SETUP.md` - compose workflow and expected service states
- `ELK.md` - observability stack notes
- `.github/workflows/ci-pr.yml` - PR preflight + path-aware CI lanes
- `.github/workflows/ci-main.yml` - main-branch preflight + path-aware CI lanes
- `.github/workflows/ci-quality-nightly.yml` - nightly/manual M10 quality lanes
- `.github/workflows/CD.yml` - deployment workflow
- `runbooks/ACCESSIBILITY_RESPONSIVE_AUDIT.md` - Sprint 6 accessibility/responsive audit baseline
- `runbooks/CORS_ORIGIN_MANAGEMENT.md` - CORS origin registry, rollout, and operations policy
- `runbooks/DEMO_READINESS.md` - checklist and script for demo preparation
- `runbooks/OAUTH_CALLBACK_REMEDIATION.md` - historical OAuth callback remediation record plus current troubleshooting notes

## Product and API
- `API_DOCUMENTATION.md` - API contract and examples
- `FRONTEND_ROUTES.md` - route map
- `openapi/` - OpenAPI reference specs for roadmap phases
- `guides/` - end-user quick guides (citizen/agent/manager)
- `features/` - feature-level behavior notes
- `specs/` - source requirement inputs and planning references

## Local Source Inputs
- `ECOTRACK_CDC_COMMUN_V2 .docx` and `ECOTRACK_M2_DEV.xlsx` are local working inputs used to derive tracked documentation.
- Keep decisions and implementation-ready outputs in tracked Markdown files such as `DB_SCHEMA_NAMESPACE_PLAN.md`.
- Keep `PR_TASKS.md` only while its checklist still has open items; remove it after the checklist is fully closed.

## Historical Baselines
- `baselines/` - captured validation outputs used during remediation phases

## Root Command Cheat Sheet

Install:
```bash
npm install
```

Develop:
```bash
npm run dev
npm run dev:doctor
npm run dev --workspace=ecotrack-app
npm run dev --workspace=ecotrack-api
```

Validate:
```bash
npm run lint
npm run typecheck
npm run test
npm run test:api
npm run test:e2e
npm run test:coverage
npm run test:coverage:api
npm run validate-env:all
npm run validate-specs
node infrastructure/scripts/ci/generate-cdc-summary.mjs
node infrastructure/scripts/ci/run-mutation-gate.mjs
node infrastructure/scripts/ci/run-visual-gate.mjs
node infrastructure/scripts/ci/run-lighthouse-gate.mjs
```

Build:
```bash
npm run build
npm run build --workspace=ecotrack-app
```

Frontend bundle budgets are enforced during `ecotrack-app` builds via `app/scripts/check-bundle-size.mjs`.
Use `ECOTRACK_ENTRY_CHUNK_BUDGET_KB` and `ECOTRACK_LOGO_BUDGET_KB` to override default limits in CI or local runs.
UI theme contract checks are enforced during `ecotrack-app` lint via `app/scripts/validate-theme-contract.mjs`.

Database:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:migrate:seed
```

Infrastructure:
```bash
npm run infra:up
npm run infra:health
npm run smoke-test
npm run infra:down
```

## Maintenance Rules
- Keep docs aligned with the current command surface and env policies.
- Prefer updating existing pages over creating duplicates.
- Keep incident-specific execution plans in `docs/runbooks/`.
