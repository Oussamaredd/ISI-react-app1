# Supabase Managed Postgres And Auth Baseline

Last updated: 2026-04-24

## Baseline Contract

- Managed deployment database baseline: Supabase-hosted Postgres.
- Managed browser authentication baseline: Supabase Auth.
- Local Docker Postgres remains a local development sandbox only.
- Repository source of truth remains `database/schema/index.ts`, `database/migrations/**`, and `database/seeds/**`.
- Supabase connection strings, publishable keys, and secrets must never be committed.
- App-owned auth tables live under the `identity` schema; the provider-owned `auth` schema is reserved for Supabase.

## Repo State

- `DATABASE_URL` is the canonical database env key for database tooling and the API runtime.
- `SUPABASE_URL` enables API-side Supabase JWT verification.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` enable browser Supabase Auth in the Vite frontend build.
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` enable mobile Supabase Auth.
- `npm run db:migrate --workspace=ecotrack-database` applies the tracked Drizzle migration chain against the active direct `DATABASE_URL`.
- `npm run db:baseline:managed --workspace=ecotrack-database` generates `database/migrations/baselines/managed-postgres-current.sql` for blank provider-managed Postgres targets.
- `npm run deploy:render:build:managed-postgres` is the API-only Render build path for already-bootstrapped managed Postgres targets; it does not build the frontend and does not inject `VITE_*` browser env.

## Bootstrap Sequence

1. Create or select the Supabase project for the deployment environment.
2. Confirm the provider-owned `auth` schema exists and stays provider-managed.
3. Apply `database/migrations/baselines/managed-postgres-current.sql` for a blank managed database, or run the tracked migration chain only for repo-managed historical targets.
4. Store the direct Postgres URL as `DATABASE_URL` in local untracked env files and deployment secret stores.
5. Store `SUPABASE_URL` in the API environment.
6. Store `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the frontend static-site build environment.

## Connection Rules

- Direct Postgres connection required for repo migrations and seed execution.
- Pooled/provider proxy URLs include `-pooler.` or `.pooler.` in the hostname and must not be used for `db:migrate` or `db:seed`.
- Keeping a single direct `DATABASE_URL` is the minimal baseline for this phase; introducing a second runtime pooler URL remains optional and must be documented before use.

## Render And Frontend Split

- Render API service build command: `npm run deploy:render:build:managed-postgres`.
- Render API service start command: `npm run deploy:render:start`.
- The Render API service needs backend env such as `DATABASE_URL`, `SUPABASE_URL`, JWT/session secrets, and CORS origins.
- The frontend host needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time. Setting these only on the Render API service does not make them available to the browser bundle.

## Validation Workflow

Database side:

- Confirm schemas after bootstrap: `identity`, `core`, `iot`, `ops`, `incident`, `notify`, `game`, `audit`, `admin`, `export`, and `support`.
- For a blank Supabase project, apply the managed baseline SQL instead of replaying the full historical migration chain.
- Run only read-only validation queries after migration and any optional seed step.

Application side:

- Start the API and verify `GET /api/health/ready` succeeds.
- Build the frontend from the static host environment and verify `/`, `/login`, and `/auth/callback` load without missing-env runtime crashes.
- Confirm browser sign-in works only after the frontend build environment contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
