# Ticket Management System

Four-layer monorepo:

- `app`: React frontend (Vite)
- `api`: NestJS backend
- `database`: Drizzle schema/migrations/seeders
- `infrastructure`: Docker Compose and ops scripts

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

## Canonical Env Model

- Host/native dev:
  - Private source: `/.env`
  - Frontend public source: `app/.env.local` (`VITE_*` only)
- Docker dev:
  - Source: `infrastructure/environments/.env.docker`
- Deployed dev/staging/prod:
  - Runtime source: secret-manager injection
  - Committed templates only:
    - `infrastructure/environments/.env.development.example`
    - `infrastructure/environments/.env.staging.example`
    - `infrastructure/environments/.env.production.example`

Precedence: process env > canonical workflow env file > `.example` templates.

## Quick Start (Host/Native)

```bash
npm install
cp .env.example .env
cp app/.env.example app/.env.local
npm run dev
```

Optional service-scoped templates:

```bash
cp api/.env.example api/.env
```

Default local endpoints:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001/api`
- API health: `http://localhost:3001/api/health`

## OAuth Callback Setup

- Canonical local callback URI: `http://localhost:3001/api/auth/google/callback`
- Set `GOOGLE_CALLBACK_URL` to the same URI in active runtime env files.
- In Google Cloud Console, **Authorized redirect URI** must exactly match runtime callback URI:
  - same scheme (`http/https`)
  - same host
  - same port
  - same path (`/api/auth/google/callback`)

## Quick Start (Docker Core)

```bash
cp infrastructure/environments/.env.docker.example infrastructure/environments/.env.docker
npm run infra:up
```

Equivalent compose command:

```bash
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core up --build -d
```

## Env Key Canonicalization

Canonical keys:

- `DATABASE_URL`
- `API_PORT`
- `VITE_API_BASE_URL`

Deprecated aliases (temporary compatibility only):

- `VITE_API_URL` -> `VITE_API_BASE_URL`
- `PORT` -> `API_PORT`
- `DB_*` -> `DATABASE_URL`

Database name policy: committed connection-string templates target `ticketdb`.

## Root Commands

- `npm run dev` - host/native app + api dev workflow
- `npm run build` - build database, app, api
- `npm run test` - app + api tests
- `npm run typecheck` - app + api + database type checks
- `npm run lint` - lint + architecture boundaries
- `npm run db:migrate` - run Drizzle migrations
- `npm run db:seed` - run seeders
- `npm run infra:up` / `npm run infra:down` / `npm run infra:health` - Docker lifecycle wrappers

## Architecture Contract

See `docs/ARCHITECTURE_OVERVIEW.md`.

## Documentation Map

See `docs/README.md` for organized documentation by domain (setup, env, operations, API, and runbooks).

## CI/CD

`CI.yml` and `CD.yml` enforce architecture, migration, build/test, and env validation gates.
