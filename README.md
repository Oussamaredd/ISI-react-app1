# EcoTrack Platform

Four-layer monorepo:

- `app`: React frontend (Vite)
- `api`: NestJS backend
- `database`: Drizzle schema/migrations/seeders
- `infrastructure`: Docker Compose and ops scripts

## Repository Layout

```text
EcoTrack/
|-- app/
|-- api/
|-- database/
|-- infrastructure/
|-- docs/
`-- .github/workflows/
```

## Canonical Env Model

- Local/native dev:
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

## Quick Start (Local/Native)

```bash
npm install
cp .env.example .env
cp app/.env.example app/.env.local
npm run dev
```

`npm run dev` now blocks frontend startup until the local direct API readiness URL from the Port Contract returns `200`, so schema drift and failed migrations stop the local-dev flow before Vite starts. The default readiness wait timeout is `180000ms`.

Optional service-scoped template (reference only; root `/.env` remains the local runtime source):

```bash
cp api/.env.example api/.env
```

## Port Contract

Local/native dev:

- Browser entrypoint: `http://localhost:5173`
- Public edge API: `http://localhost:5173/api`
- Public edge health: `http://localhost:5173/health`
- API process listen port (direct local diagnostics only): `http://localhost:3001`
- Root `npm run dev` waits on `http://localhost:3001/api/health/ready` before Vite starts

Docker dev:

- Sole browser entrypoint: `http://localhost:3000`
- Public edge API: `http://localhost:3000/api`
- Public edge health: `http://localhost:3000/health`
- Backend container still listens on `API_PORT=3001`, but that port is internal-only and not published to the local machine

Use `5173` or `3000` in the browser. Use direct `3001` only for local-native API diagnostics. In Docker, `3000` is the only browser-facing entrypoint.

If local-native frontend `/api/*` requests fail, verify the API process directly with:

```bash
curl -f http://localhost:3001/health
curl -f http://localhost:3001/api/health/ready
```

If the readiness check fails, `npm run dev` will stop before launching the frontend dev server. Read the API startup error in the terminal output, then rerun `npm run dev` after the database or API issue is fixed.

## Auth Routes (Local/Docker)

The frontend auth routes are path-stable across local and Docker:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`

Resolve them on the frontend origin defined in the Port Contract (`5173` for local dev, `3000` for Docker dev).

Local auth contract:

- `POST /api/login` returns `{ code, accessToken, user }` for local sign-in; `code` remains available for callback compatibility
- `POST /api/signup` returns `{ accessToken, user }`
- frontend uses the direct local sign-in session when `accessToken` is present, and can still exchange login `code` via `POST /api/auth/exchange`
- frontend stores `accessToken` in `localStorage`
- protected API requests use `Authorization: Bearer <token>`
- frontend clears stale local bearer state when protected API requests return `401`
- reset endpoints are only `POST /api/forgot-password` and `POST /api/reset-password`
- in production, forgot-password returns `204` with no token/url payload

## OAuth Callback Setup

- Local dev callback URI: `http://localhost:5173/api/auth/google/callback`
- Docker dev callback URI: `http://localhost:3000/api/auth/google/callback`
- Set `API_BASE_URL` and `GOOGLE_CALLBACK_URL` to the same public edge origin in active runtime env files.
- In Google Cloud Console, **Authorized redirect URI** must exactly match runtime callback URI:
  - same scheme (`http/https`)
  - same host
  - same port
  - same path (`/api/auth/google/callback`)

## Quick Start (Docker Core)

```bash
cp infrastructure/environments/.env.docker.example infrastructure/environments/.env.docker
npm run infra:up
npm run smoke-test
```

Equivalent compose command:

```bash
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core up --build -d
```

Docker uses the Port Contract above: `http://localhost:3000` is the only browser-facing entrypoint, and the backend keeps `API_PORT=3001` on the internal Docker network.

## Env Key Canonicalization

Canonical keys:

- `DATABASE_URL`
- `API_PORT`
- `API_BASE_URL`
- `VITE_API_BASE_URL`

Deprecated aliases (temporary compatibility only):

- `VITE_API_URL` -> `VITE_API_BASE_URL`
- `PORT` -> `API_PORT`
- `DB_*` -> `DATABASE_URL`

Database name policy: committed connection-string templates target `ticketdb`.

## Root Commands

- `npm run dev` - local/native app + api dev workflow
- `npm run dev:doctor` - fast local diagnostics (env keys, db reachability/migrations, health endpoints)
- `npm run build` - build database, app, api
- `npm run test` - app + api tests
- `npm run test:api` - backend tests with required `ecotrack-database` build pre-step
- `npm run test:e2e` - key citizen/agent/manager journey tests
- `npm run test:coverage` - coverage-gated validation for app + api
- `npm run test:coverage:api` - backend coverage with required `ecotrack-database` build pre-step
- `npm run typecheck` - app + api + database type checks
- `npm run lint` - lint + architecture boundaries
- `npm run validate-specs` - enforce CDC traceability matrix and executable spec contracts
- `npm run ci:cdc:summary` - generate CDC evidence artifact used by CI preflight
- `npm run ci:quality:mutation` - run mutation gate hook (enabled by CI variable)
- `npm run ci:quality:visual` - run visual-regression hook (enabled by CI variable + Percy token/command)
- `npm run ci:quality:lighthouse` - run Lighthouse gate hook (enabled by CI variable)
- `npm run db:migrate` - run Drizzle migrations
- `npm run db:seed` - run seeders
- `npm run infra:up` / `npm run infra:down` / `npm run infra:health` - Docker lifecycle wrappers
- `npm run smoke-test` - strict Docker edge smoke test (public `3000` edge + internal backend health)

`npm run infra:health` is a strict gate: it exits non-zero when Docker is unreachable or any core service health check fails.
`npm run smoke-test` validates the single-entrypoint Docker contract: local machine port `3001` stays closed, internal backend `3001` stays healthy, and OAuth `/api/auth/google` still emits the `3000` callback origin.

## Architecture Contract

See `docs/ARCHITECTURE_OVERVIEW.md`.

## Documentation Map

See `docs/README.md` for organized documentation by domain (setup, env, operations, API, and runbooks).

## CI/CD

- `CI.yaml`: unified CI Integration workflow for `pull_request` + `push` on `main`; supports manual `workflow_dispatch` with `full_run=true` and optional `run_extended_quality=true` for K6/ZAP/mutation/visual/Lighthouse lanes
- `CD.yml`: deployment workflow with pre-deploy validation and release checks
- Phase-4 readiness is preserved through optional CI variables (`CI_ENABLE_*`) and manual extended-quality artifact/report lanes that can be promoted to blocking checks later.


