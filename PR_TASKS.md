# PR / Task Backlog (Refactored February 9, 2026)

## Context
- Previous backlog items in this file were completed and are now archived.
- This new backlog is focused on hardening the 4-layer architecture with explicit ownership and dependency direction.
- Layer 1: `app` (frontend only).
- Layer 2: `api` (NestJS controllers/modules/use-cases/repositories).
- Layer 3: `database` (Drizzle source of truth: schema + client + migrations + seed).
- Layer 4: `infrastructure` (Docker/Terraform/monitoring + explicit migration/seed execution).

## Global dependency contract (must hold after all PRs)
- `app` must not import runtime code from `api`, `database`, or `infrastructure`.
- `api` may depend on `database`, but `database` must never depend on `api`.
- `infrastructure` must execute migration/seed commands without requiring Nest runtime bootstrap.
- Controllers in `api` must not call Drizzle directly; use use-cases/services and repositories.

## Phase 0 - Baseline and guardrails
- [x] PR: Create architecture-hardening baseline branch and validation snapshot
  - Why: Establish a clean rollback point before folder-level and dependency changes.
  - Scope: create branch, run and capture current `build`, `typecheck`, and tests as baseline logs.
  - Commands:
    - `git checkout -b chore/4-layer-architecture-hardening`
    - `npm ci`
    - `npm run build`
    - `npm run typecheck`
    - `npm run test`

- [x] PR: Add a formal architecture contract document
  - Why: Make ownership and import rules explicit and enforceable.
  - Scope: add a short ADR-style doc and link it from root `README.md`.
  - Files: `docs/ARCHITECTURE_OVERVIEW.md`, `README.md`

## Phase 1 - Workspace and boundary enforcement (keep 4 root layers)
- [x] PR: Keep root layout (`app`, `api`, `database`, `infrastructure`) and enforce import boundaries
  - Why: The layer model is already present; enforcement is missing.
  - Scope: add `eslint` restricted import rules so forbidden cross-layer imports fail CI.
  - Files: `app/eslint.config.js`, `api/eslint.config.js`, root lint docs

- [x] PR: Normalize root scripts around the 4-layer model
  - Why: Developers need one consistent command surface to run app/api/database/infra tasks.
  - Scope: update root `package.json` scripts (`dev`, `build`, `test`, `typecheck`, `db:*`, `infra:*` wrappers).
  - Files: `package.json`, `README.md`, `docs/ENVIRONMENT_SETUP.md`

## Phase 2 - Database layer as sole Drizzle owner
- [x] PR: Finalize Drizzle ownership in `database` and expose stable API
  - Why: `database` must be the single source of truth for schema/client/migrations/seed.
  - Scope: keep all Drizzle artifacts in `database`, export `createDatabaseInstance` and schema/index from `database/src/index.ts`, and ensure `db:*` scripts are only owned there.
  - Files: `database/src/index.ts`, `database/src/client.ts`, `database/src/schema.ts`, `database/src/seed.ts`, `database/drizzle.config.ts`, `database/package.json`
  - Commands:
    - `npm run db:generate --workspace=react-app1-database`
    - `npm run db:migrate --workspace=react-app1-database`
    - `npm run db:seed --workspace=react-app1-database`

- [x] PR: Remove Drizzle toolkit ownership leakage from `api`
  - Why: `api` currently carries Drizzle toolkit deps/scripts that belong to `database`.
  - Scope: remove `drizzle-kit` from `api` dependencies and remove DB lifecycle scripts from `api/package.json`.
  - Files: `api/package.json`, root `package-lock.json`

## Phase 3 - API refactor to clean repository pattern
- [x] PR: Replace legacy `#database` bridge with direct package dependency
  - Why: `api/src/external/database.ts` is an indirect coupling workaround.
  - Scope: import from `react-app1-database` package directly and remove alias bridge.
  - Files: `api/src/external/database.ts`, `api/tsconfig.json`, `api/package.json`, `api/src/database/*`, service imports

- [x] PR: Implement explicit `DbModule` provider contract in API
  - Why: Nest DI for DB must be explicit and stable for tests/runtime.
  - Scope: keep `DRIZZLE` token + provider, source `DATABASE_URL` from validated config, and centralize disposal on module shutdown.
  - Files: `api/src/database/database.module.ts`, `api/src/database/database.service.ts`, `api/src/database/database.constants.ts`, `api/src/config/*`

- [x] PR: Introduce repository layer per domain and remove direct Drizzle calls from controllers/use-cases
  - Why: enforce `controller -> use-case/service -> repository -> database`.
  - Scope: move query logic from services into repositories for `tickets`, `users`, `hotels`, `dashboard`, `admin`.
  - Files: `api/src/tickets/*`, `api/src/users/*`, `api/src/hotels/*`, `api/src/dashboard/*`, `api/src/admin/*`

## Phase 4 - Infrastructure runs migrations explicitly
- [x] PR: Run migrations as explicit deploy/init step in Docker
  - Why: schema setup must be deterministic and independent from API runtime startup.
  - Scope: add a dedicated migration step/service in compose; make API startup depend on successful migration completion.
  - Files: `infrastructure/docker-compose.yml`, `infrastructure/start-dev.bat`, `infrastructure/stop-dev.bat`, `infrastructure/health-check.bat`

- [x] PR: Point infrastructure migration scripts to database workspace commands
  - Why: infra should call `database` package commands as the source of truth.
  - Scope: update migration script defaults and docs; keep optional seed gating via env flags.
  - Files: `infrastructure/scripts/migrate.sh`, `infrastructure/package.json`, `.env.example`, `docs/DOCKER_SETUP.md`, `docs/ENV.md`
  - Commands:
    - `ENABLE_SEED_DATA=false ./infrastructure/scripts/migrate.sh up`
    - `ENABLE_SEED_DATA=true SEED_COMMAND="npm run db:seed --workspace=react-app1-database" ./infrastructure/scripts/migrate.sh up`

## Phase 5 - CI, reliability, and cleanup
- [x] PR: Add CI gates for architecture and migration reliability
  - Why: prevent regressions in layer boundaries and DB lifecycle.
  - Scope: add CI jobs for `database` build/typecheck/migrate, run API tests against migrated DB, fail on forbidden imports.
  - Files: `.github/workflows/CI.yml`, `.github/workflows/CD.yml`, lint configs

- [x] PR: Refresh docs and remove stale architecture references
  - Why: docs still contain outdated assumptions and old command paths.
  - Scope: update all architecture/setup docs to the enforced 4-layer model and current scripts.
  - Files: `README.md`, `docs/ARCHITECTURE_OVERVIEW.md`, `docs/ENVIRONMENT_SETUP.md`, `docs/DOCKER_SETUP.md`, `docs/README.md`

## Definition of done for this backlog
- [x] `npm run dev` starts frontend + backend with local DB available.
- [x] `npm run db:migrate --workspace=react-app1-database` succeeds from root.
- [x] API builds and runs using DB imports from `database` package.
- [x] No forbidden cross-layer imports (lint/CI enforced).
- [x] Infrastructure applies migrations explicitly before API startup.
