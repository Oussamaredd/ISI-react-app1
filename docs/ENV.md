# Environment Model

This repository uses one canonical env source per workflow and strict public/private separation.

## Canonical Sources

- Host/native dev:
  - Private source: `/.env`
  - Frontend public source: `app/.env.local` (`VITE_*` only)
- Docker dev:
  - Source: `infrastructure/environments/.env.docker`
- Deployed dev/staging/production:
  - Runtime source: secret manager injection
  - Committed templates only:
    - `infrastructure/environments/.env.development.example`
    - `infrastructure/environments/.env.staging.example`
    - `infrastructure/environments/.env.production.example`

Database package runtime note:
- `ecotrack-database` runtime entrypoints (for example `db:seed`) fall back to root `/.env` when `DATABASE_URL` is not already present in process env.

## Canonical Keys

- `DATABASE_URL` for database connectivity
- `API_PORT` for API listen port
- `VITE_API_BASE_URL` for frontend API base URL
- `APP_BASE_URL` for backend-to-frontend auth callback redirects (fallbacks: `APP_URL`, `CLIENT_ORIGIN`)
- `JWT_ACCESS_SECRET` for local access-token signing (Bearer JWT)
- `JWT_ACCESS_EXPIRES_IN` for local access-token TTL (for example `15m`)
- `GOOGLE_CLIENT_ID` must be a Google OAuth Web client ID (`<numeric-project-id>-<client>.apps.googleusercontent.com`)
- `GOOGLE_CALLBACK_URL` for OAuth redirect callback (required in deploy templates; canonical path is fixed)

## Optional API Hardening Keys

- `RATE_LIMIT_WINDOW_MS` for global throttling window (default `60000`)
- `RATE_LIMIT_MAX_REQUESTS` for global throttling ceiling (default `120`)
- `LOG_LEVEL` for API logger level (`fatal|error|warn|info|debug|trace|silent`); in non-production, `debug|trace` also enables verbose Nest startup logs
- `LOG_FORMAT` for API log output format (`json` or `pretty`); defaults to `pretty` outside production and `json` in production

## API Readiness Endpoint

- Fast readiness probe: `GET /health` (returns HTTP `200` when the API process is listening)
- Diagnostics endpoint: `GET /api/health/database` (includes database status details)
- Frontend sign-in readiness checks should target `VITE_API_BASE_URL + /health`
- Local `npm run dev` now starts API first and waits on `http://localhost:3001/health` before launching the app dev server

## Auth Exchange Flow

- Google callback redirects to frontend callback page using backend app-base env:
  - `${APP_BASE_URL}/auth/callback?code=<exchangeCode>`
- Local `POST /login` now returns `{ code }` (short-lived one-time exchange code), not JWT directly
- Frontend callback page exchanges code via `POST /api/auth/exchange` to obtain `{ accessToken, user }`
- Frontend stores `accessToken` in `localStorage` after successful exchange

Deprecated aliases (temporary read support only):

- `VITE_API_URL` -> `VITE_API_BASE_URL`
- `PORT` -> `API_PORT`
- `DB_*` -> `DATABASE_URL`

## Precedence Rules

1. Explicit process env (shell/CI/runtime injection)
2. Canonical workflow env file
3. `.example` templates (never runtime inputs)

## Frontend/Backend Separation

- `app/.env.local`, `app/.env.example`, and mode env files must include only `VITE_*` keys.
- API/database/infrastructure secrets must never appear in app env files.
- `APP_URL`/`CLIENT_ORIGIN` values must target the frontend origin root (for example `https://app.example.com`), not removed legacy paths such as `/auth` or `/dashboard`.

## OAuth Callback Contract

- Canonical callback URI (local and Docker dev): `http://localhost:3001/api/auth/google/callback`
- Callback path is fixed: `/api/auth/google/callback`
- `GOOGLE_CLIENT_ID` must use Google Web OAuth client format (`<numeric-project-id>-<client>.apps.googleusercontent.com`)
- When `GOOGLE_CALLBACK_URL` is set for localhost, its port must match `API_PORT`
- Google Console authorized redirect URI must exactly match runtime callback URI

## Database Naming

- Canonical DB name is `ticketdb`.
- All committed `DATABASE_URL` examples must resolve to `/ticketdb`.

## Local Setup

```bash
cp .env.example .env
cp app/.env.example app/.env.local
cp api/.env.example api/.env
cp infrastructure/environments/.env.docker.example infrastructure/environments/.env.docker
```

## Docker Commands

```bash
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core config
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core up -d --build
```

## References

- Inventory: `docs/ENV_INVENTORY.md`
- Conflicts: `docs/ENV_CONFLICTS.md`
- Decisions: `docs/ENV_CANONICAL_DECISIONS.md`
