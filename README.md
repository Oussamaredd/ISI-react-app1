# Ticket Management System

Four-layer monorepo for ticket operations:
- `app`: React frontend (Vite)
- `api`: NestJS backend
- `database`: Drizzle schema, migrations, and seeders
- `infrastructure`: Docker Compose and local ops scripts

## Repository Layout
```text
react-app1/
|-- app/
|-- api/
|-- database/
|-- infrastructure/
|-- docs/
`-- .github/workflows/
```

## Quick Start
```bash
npm install
cp app/.env.example app/.env.local
cp api/.env.example api/.env
cp database/.env.example database/.env.local
npm run dev
```

Default local endpoints:
- Frontend: `http://localhost:5173`
- API: `http://localhost:3001/api`
- API health: `http://localhost:3001/api/health`

## Environment Files
- Local development: `.env` (repo root)
- Docker development: `infrastructure/environments/.env.docker` (canonical for core compose stack)
- Docker staging: `infrastructure/environments/.env.staging`
- Docker production: `infrastructure/environments/.env.production`

## Root Commands
- `npm run dev` - build database workspace, then run app + api
- `npm run build` - build database, app, api
- `npm run test` - run app + api tests
- `npm run typecheck` - run app + api + database type checks
- `npm run lint` - enforce lint rules including architecture import boundaries
- `npm run db:migrate` - run Drizzle migrations from `database` workspace
- `npm run db:seed` - run seeders from `database` workspace
- `npm run infra:up` / `npm run infra:down` / `npm run infra:health` - Docker lifecycle wrappers
- `npm run migrate:up --workspace=react-app1-infrastructure` - run no-seed migration via compose migration container
- `npm run migrate:up:seed --workspace=react-app1-infrastructure` - run migration + seed via compose migration container
- `npm run migrate:status --workspace=react-app1-infrastructure` - print effective migration config from migration container

## Docker Acceptance State
- `ticket_db` must be healthy
- `ticket_migrate` must exit with code `0`
- `ticket_backend` must be healthy

See `docs/DOCKER_SETUP.md` for the acceptance command flow.

## Architecture Contract
See `docs/ARCHITECTURE_OVERVIEW.md`.

Key rules:
- API data path: `controller -> service -> repository -> database`
- Controllers and services in domain modules must not import `drizzle-orm` or `react-app1-database` directly
- Database migration and seed commands are owned by the `database` workspace

## CI/CD
`CI.yml` includes:
- architecture lint gate
- database gate (`build`, `typecheck`, `db:migrate`)
- backend tests against migrated Postgres
- frontend build/test

`CD.yml` runs pre-deploy validation gates before frontend Pages deployment.
