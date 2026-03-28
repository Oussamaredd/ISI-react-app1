# Project Documentation

Documentation is organized by document type and responsibility so architecture, API docs, setup guides, reference material, roadmaps, plans, tasks, runbooks, and checklists are easy to distinguish.

## Start Here
- `../README.md` - repository quick start and canonical command surface
- `../LICENSE` - canonical public-use terms and attribution notice for the repository
- `../CHANGELOG.md` - canonical release history from the documented baseline forward
- `architecture/ARCHITECTURE_OVERVIEW.md` - five-layer architecture contract and system views
- `planning/roadmaps/ROADMAP.md` - main development roadmap, sprint status, and canonical progress tracking
- `planning/roadmaps/PLATFORM_MICRO_ROADMAP.md` - scoped platform and DevOps roadmap companion
- `environment/setup/ENVIRONMENT_SETUP.md` - local, Docker, and deploy setup flow
- `governance/RELEASE_VERSIONING.md` - semantic versioning and release bookkeeping process

## Architecture
- `architecture/ARCHITECTURE_OVERVIEW.md` - layer boundaries, architecture contract, and Mermaid system views
- `architecture/ADR-0002_FRONTEND_STATE_ARCHITECTURE.md` - accepted frontend state-management decision record

## API And Product
- `api/API_DOCUMENTATION.md` - API contract and examples
- `api/openapi/` - OpenAPI reference specs for roadmap phases
- `product/FRONTEND_ROUTES.md` - route map
- `product/features/` - feature-level behavior notes
- `product/features/DesignSystem.md` - cross-app UI primitive contract and reuse inventory
- `product/guides/` - end-user quick guides for citizen, agent, and manager roles

## Environment Reference
- `environment/reference/ENV.md` - current source of truth for env rules, browser origins, and the port contract
- `environment/reference/ENV_INVENTORY.md` - env variable inventory reference snapshot
- `environment/reference/ENV_CONFLICTS.md` - historical conflict matrix and normalization notes
- `environment/reference/ENV_CANONICAL_DECISIONS.md` - decision history behind the canonical env model

## Setup Guides
- `environment/setup/ENVIRONMENT_SETUP.md` - local, Docker, and deploy environment setup
- `environment/setup/DOCKER_SETUP.md` - compose workflow and expected service states

## Planning
- `planning/roadmaps/ROADMAP.md` - strategic and sprint roadmap
- `planning/roadmaps/PLATFORM_MICRO_ROADMAP.md` - platform lane roadmap
- `planning/plans/landing-plan.md` - scoped landing-page execution plan
- `planning/tasks/PR_TASKS.md` - active deployment rollout task tracker
- `planning/tasks/PRODUCT_HARDENING_10_10_TASKS.md` - Development-only product hardening and quality task tracker

## Governance And Standards
- `governance/RELEASE_VERSIONING.md` - release bookkeeping and versioning policy
- `governance/CODE_ANNOTATION_CONVENTIONS.md` - TSDoc and JSDoc expectations for shared and exported code
- `governance/SECURITY.md` - secret-management and leakage safeguards
- `governance/QUALITY_SCORECARD.md` - Development-only release quality thresholds and evidence contract
- `governance/checklists/DOD_CHECKLIST.md` - definition-of-done and quality checklist

## Data And Operations
- `data/DB_SCHEMA_NAMESPACE_PLAN.md` - approved namespace migration and additive-entity design
- `data/DB_SCHEMA_NAMESPACE_STATUS.md` - preserved implementation status for the DB namespace rollout
- `operations/observability/ELK.md` - observability stack notes
- `operations/runbooks/` - incident, rollout, quality, and platform runbooks
- `operations/runbooks/EXTENDED_QUALITY_GATES.md` - K6, Stryker, Percy, and Lighthouse execution paths
- `operations/runbooks/ACCESSIBILITY_RESPONSIVE_AUDIT.md` - explicit accessibility and responsive release checklist
- `operations/runbooks/MOBILE_PRODUCT_READINESS.md` - mobile release-readiness lane and evidence map
- `operations/runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md` - phased Cloudflare Pages, Render, and Neon rollout plan
- `operations/runbooks/NEON_MANAGED_POSTGRES_BASELINE.md` - current managed Postgres baseline

## Specs And Inputs
- `specs/README.md` - entry point for source specs and planning inputs
- `specs/SOURCE_OF_TRUTH.md` - executable-spec governance, scope, and update workflow
- `specs/source-of-truth.dev.json` - machine-readable source-of-truth contract
- `specs/cdc-traceability-matrix.dev.json` - machine-readable Development-specialty CDC matrix
- `specs/cdc-traceability-matrix.dev.md` - human-readable Development-specialty CDC matrix
- `specs/mobile-platform-integration-contract.md` - platform and mobile integration contract
- `specs/mobile-layer-rollout-plan.md` - architecture-first mobile rollout plan
- `specs/inputs/` - canonical source documents used by specs and traceability and kept local-only via Git ignore rules
- `specs/source-of-truth.dev.json` separates repo-enforced canonical files from `localInputArtifacts`, which stay local-only and are validated through `.gitignore` coverage rather than repo file existence

## Historical Baselines
- `baselines/` - captured validation outputs used during remediation phases

## Root Command Cheat Sheet

Install:
```bash
npm ci --include=dev
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
npm run validate-sonar-coverage-alignment
npm run test:api
npm run test:e2e
npm run test:coverage
npm run test:coverage:api
npm run quality:mobile-readiness
npm run quality:product-hardening
npm run validate-env:all
npm run validate:workspace-toolchain
npm run validate-specs
node infrastructure/scripts/ci/generate-cdc-summary.mjs
npm run ci:release:manifest
npm run ci:release:quality-scorecard
npm run ci:release:deploy-hooks
npm run ci:release:smoke
npm run ci:quality:k6
node infrastructure/scripts/ci/run-mutation-gate.mjs
node infrastructure/scripts/ci/run-visual-gate.mjs
node infrastructure/scripts/ci/run-visual-snapshots.mjs
node infrastructure/scripts/ci/run-lighthouse-gate.mjs
```

Build:
```bash
npm run build
npm run build --workspace=ecotrack-app
```

Frontend bundle budgets are enforced during `ecotrack-app` builds via `app/scripts/check-bundle-size.mjs`.
Use the route-aware budget overrides `ECOTRACK_INITIAL_ROUTE_SHELL_GZIP_BUDGET_KB`, `ECOTRACK_LANDING_ROUTE_GZIP_BUDGET_KB`, `ECOTRACK_LOGIN_ROUTE_GZIP_BUDGET_KB`, `ECOTRACK_DASHBOARD_ROUTE_GZIP_BUDGET_KB`, `ECOTRACK_ADMIN_ROUTE_GZIP_BUDGET_KB`, `ECOTRACK_MAPPING_VENDOR_GZIP_BUDGET_KB`, and `ECOTRACK_LOGO_BUDGET_KB` when CI or local runs need non-default caps.
UI theme contract checks are enforced during `ecotrack-app` lint via `app/scripts/validate-theme-contract.mjs`.
Doc-sync checks are enforced via `npm run validate-doc-sync` and the managed local `pre-commit` hook that repo-root installs generate under `.githooks/` through the root `prepare` script. `.githooks/` is ignored and remains local-only.

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
- Keep category boundaries clear: roadmaps, plans, tasks, setup guides, reference docs, runbooks, and checklists should stay in their dedicated folders.
- Keep incident-specific execution plans in `docs/operations/runbooks/`.
- Keep local-only raw source artifacts only at their canonical `docs/specs/inputs/` paths and out of Git.
- Keep disposable local and CI artifacts under `tmp/`; avoid root-level timestamped temp folders and root `temp-*.log` files.
