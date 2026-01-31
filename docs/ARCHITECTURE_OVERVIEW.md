# Architecture Overview

This repo is organized into four workspaces plus `shared/`. Each workspace ships with its own tooling, env file, and npm scripts so concerns stay isolated while still working together via root commands.

## Repository layout

```
react-app1/
├── app/             # Vite + React 18 frontend
├── api/             # NestJS 10 API using Drizzle ORM
├── database/        # Shared Drizzle schema, client factory, migrations
├── infrastructure/  # Docker, compose files, ops/health scripts
├── shared/          # Future shared utilities
├── docs/            # Living documentation
└── .github/         # CI/CD workflows
```

## Layer responsibilities

- `app`: UI, routing, and data fetching. Uses React Router 7 and TanStack Query 5. Depends on the API for data.
- `api`: NestJS service exposing `/api/*` endpoints. Imports the database workspace as a local package for schema and client creation.
- `database`: Owns the Drizzle schema (`src/schema.ts`) and provides `createDatabaseInstance` for Postgres connections. Also holds SQL migrations under `migrations/legacy` for historical reference.
- `infrastructure`: Dockerfiles, docker-compose configs, env templates, and health-check scripts for local/staging/prod setups.
- `shared`: Placeholder for shared types/utilities as they emerge.

## Development flow

- Root commands:
  - `npm run dev` — builds the database workspace, then runs the frontend and API in watch mode.
  - `npm run build` — builds database, frontend, and API in sequence.
  - `npm run typecheck` — runs TypeScript checks across all workspaces.
  - `npm run test` — runs workspace test suites (frontend + API).
- Workspace-specific commands: run any script with `npm run <script> --workspace=<package-name>` (e.g., `react-app1-app`, `react-app1-api`, `react-app1-database`, `react-app1-infrastructure`).

## Environments

- Frontend: `app/.env.example` (uses `VITE_API_BASE_URL`).
- API: `api/.env.example` (`API_PORT`, `DATABASE_URL`, `SESSION_SECRET`, `JWT_*`, `GOOGLE_*`).
- Database: `database/.env.example` (`DATABASE_URL`).
- Infrastructure: `.env.docker` for compose defaults (used by `infrastructure/docker-compose.yml`).

## Data flow

1. React app calls the API at `${VITE_API_BASE_URL}/api/*`.
2. Nest API uses `createDatabaseInstance` from the `database` workspace to talk to Postgres via Drizzle ORM.
3. Infrastructure scripts containerize and orchestrate the API/database stack for local and deployment targets.
