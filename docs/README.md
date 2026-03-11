# Project Documentation

Documentation is split by purpose so day-to-day navigation stays predictable.

## Start Here
- `../README.md` - repository quick start and canonical command surface
- `../CHANGELOG.md` - canonical release history from the documented baseline forward
- `ROADMAP.md` - development roadmap, sprint status, and canonical progress tracking
- `ROADMAP.md` section "UI Completion Execution Plan (Live)" - agent-dispatch sprint plan for remaining UI gaps
- `ARCHITECTURE_OVERVIEW.md` - layer boundaries, architecture contract, and Mermaid system views
- `ENVIRONMENT_SETUP.md` - local/Docker/deploy environment setup
- `RELEASE_VERSIONING.md` - semantic versioning and release bookkeeping process
- `CODE_ANNOTATION_CONVENTIONS.md` - TSDoc/JSDoc expectations for shared and exported code

## Environment and Configuration
- `ENV.md` - current source of truth for env rules, browser origins, and the port contract
- `ENV_INVENTORY.md` - env variable inventory reference snapshot
- `ENV_CONFLICTS.md` - historical conflict matrix and normalization notes
- `ENV_CANONICAL_DECISIONS.md` - decision record behind the current canonical env model
- `SECURITY.md` - secret management and leakage safeguards
- `DB_SCHEMA_NAMESPACE_PLAN.md` - approved namespace migration and additive-entity design for the database
- `DB_SCHEMA_NAMESPACE_STATUS.md` - preserved implementation status for the DB namespace rollout, including done, partial, and open items

## Runtime and Operations
- `DOCKER_SETUP.md` - compose workflow and expected service states
- `ELK.md` - observability stack notes
- `runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md` - phased deployment plan for Cloudflare Pages, Render, and Neon
- `runbooks/NEON_MANAGED_POSTGRES_BASELINE.md` - current Neon Phase 3 baseline, validated resources, and direct-connection workflow
- `.github/workflows/CI.yaml` - canonical `CI Integration` workflow for PR/main with path-aware lanes, `full_run` override, manual `run_extended_quality` lanes, Sonar scan/gate, and a final required aggregator job
- `.github/workflows/docs-pages.yml` - docs-only GitHub Pages publishing workflow using `docs/` as the site source
- SonarCloud CI scanner lane in `CI.yaml` runs only when `SONAR_TOKEN` is configured and Sonar automatic analysis is disabled for the project
- Sonar coverage gate currently excludes `database/**`, selected frontend auth/bootstrap routing files, and selected users/auth service files pending dedicated coverage instrumentation alignment in the broader app/api source set
- Preflight now enforces `node infrastructure/scripts/validate-sonar-coverage-alignment.mjs`, which compares the full branch diff against workspace Vitest coverage includes and `sonar.coverage.exclusions`; each changed `app/src/**` or `api/src/**` source file must live in exactly one lane
- `.github/workflows/CD.yml` - canonical `CD Deployment` workflow
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
- `specs/mobile-platform-integration-contract.md` - mobile/client integration contract for the future Expo layer
- `specs/mobile-layer-rollout-plan.md` - architecture-first rollout plan for adapting `poemapp` into EcoTrack

## Local Source Inputs
- `ECOTRACK_CDC_COMMUN_V2 .docx` and `ECOTRACK_M2_DEV.xlsx` are local working inputs used to derive tracked documentation.
- Keep decisions and implementation-ready outputs in tracked Markdown files such as `DB_SCHEMA_NAMESPACE_PLAN.md`.
- `PR_TASKS.md` - active deployment rollout tracker showing what is done in planning and what remains open for implementation
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
npm run dev:mobile
npm run dev --workspace=ecotrack-api
```

Cleanup:
```bash
npm run clean:artifacts
```

Validate:
```bash
npm run lint
npm run lint --workspace=ecotrack-mobile
npm run typecheck
npm run typecheck --workspace=ecotrack-mobile
npm run test
npm run test --workspace=ecotrack-mobile
npm run validate-doc-sync
npm run test:api
npm run test:e2e
npm run test:coverage
npm run test:coverage:api
npm run validate-env:all
node infrastructure/scripts/validate-sonar-coverage-alignment.mjs
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
Doc-sync checks are enforced via `npm run validate-doc-sync` and the managed `.githooks/pre-commit` hook that `npm install` configures automatically through the root `prepare` script.

Database:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:migrate:seed
```

Infrastructure:
```bash
npm run hooks:install
npm run infra:up
npm run infra:health
npm run smoke-test
npm run infra:down
```

## Maintenance Rules
- Keep docs aligned with the current command surface and env policies.
- Prefer updating existing pages over creating duplicates.
- Keep incident-specific execution plans in `docs/runbooks/`.
- Keep disposable local and CI artifacts under `tmp/`; avoid root-level timestamped temp folders and root `temp-*.log` files.
