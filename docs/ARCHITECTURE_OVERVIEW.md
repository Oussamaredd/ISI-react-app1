# ADR-0001: Four-Layer Architecture Contract

- Status: Accepted
- Date: 2026-02-10
- Scope: `app`, `api`, `database`, `infrastructure`

## Context

The repository already follows a four-layer folder layout, but architecture ownership and dependency direction must be explicit so future changes do not reintroduce cross-layer coupling.

## Decision

### Layer ownership

- `app`: frontend UI only (routing, views, client-side state, API calls).
- `api`: NestJS modules/controllers/use-cases/repositories.
- `database`: Drizzle schema, database client factory, migrations, seed lifecycle.
- `infrastructure`: Docker/Terraform/ops scripts that run deploy and runtime orchestration.

### Dependency direction

- `app` must not import runtime code from `api`, `database`, or `infrastructure`.
- `api` may depend on `database`.
- `database` must never depend on `api`.
- `infrastructure` must execute migration and seed commands without bootstrapping Nest runtime.

### Runtime behavior rules

- Controllers in `api` must not execute Drizzle queries directly.
- Data access path in `api` is `controller -> use-case/service -> repository -> database`.
- `database` is the single source of truth for schema, migration, and seed commands.
- Domain controllers/services in `api` must not import `drizzle-orm` or `react-app1-database` directly.

## Enforcement

- Lint rules block forbidden cross-layer imports (`app` and `api`).
- API lint rules also block direct database imports in domain controllers/services.
- Root lint command (`npm run lint`) is the architecture boundary gate.
- CI includes:
  - architecture lint gate,
  - database gate (`build`, `typecheck`, `db:migrate`),
  - backend tests against a migrated Postgres DB,
  - frontend build/test gates.
- CD includes a pre-deploy validation job with architecture and migration checks.

## Consequences

- Ownership is explicit per layer, reducing accidental coupling.
- Database lifecycle operations remain independent from API bootstrap.
- Regressions become detectable through lint/CI rather than production behavior.
