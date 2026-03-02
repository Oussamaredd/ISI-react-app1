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

## CORS Origin Policy

- `CORS_ORIGINS` is canonical for HTTP + WebSocket browser-origin allowlisting.
- Values must be comma-separated origin roots (`scheme://host[:port]`) with no path/query/fragment.
- Wildcard (`*`) is forbidden because API/WS CORS is credentialed.
- Deploy workflows (`deploy-dev`, `deploy-staging`, `deploy-prod`) should use HTTPS origins only (localhost exceptions are for controlled local checks).
- `APP_URL` should use one of the origins listed in `CORS_ORIGINS`.

### Environment Defaults

- host dev: allow local frontend origins and short-lived team-controlled dev origins only.
- docker dev: allow only active local/docker frontend origins.
- staging: allow only controlled staging frontend origin(s).
- production: allow only owned production frontend origin(s).

Use `docs/runbooks/CORS_ORIGIN_MANAGEMENT.md` for origin ownership, change-control, and rollout steps.

## API Readiness Endpoint

- Fast liveness probe: `GET /health` (returns HTTP `200` when the API process is listening)
- API liveness alias: `GET /api/health` and `GET /api/health/live`
- Readiness probe (load-balancer/container ready-state): `GET /api/health/ready`
  - returns HTTP `200` when dependencies are ready
  - returns HTTP `503` when readiness dependencies fail
- Diagnostics alias: `GET /api/health/database`
- Frontend sign-in readiness checks should target `VITE_API_BASE_URL + /health`
- Local `npm run dev` waits on `http://localhost:3001/health` before launching the app dev server, then continues startup even if the wait probe times out

## Auth Exchange Flow

- Google callback redirects to frontend callback page using backend app-base env:
  - `${APP_BASE_URL}/auth/callback?code=<exchangeCode>`
- Local `POST /login` returns `{ code, accessToken, user }`; `code` remains available for callback compatibility
- Frontend uses the direct local session when `accessToken` is present, and the callback page can still exchange code via `POST /api/auth/exchange` to obtain `{ accessToken, user }`
- Frontend stores `accessToken` in `localStorage` after successful sign-in/exchange
- Frontend clears stale local bearer state when `/api/auth/status` resolves `authenticated: false` or protected API calls return `401`

Deprecated aliases (temporary read support only):

- `VITE_API_URL` -> `VITE_API_BASE_URL`
- `DB_*` -> `DATABASE_URL`
- `CLIENT_ORIGIN` -> `CORS_ORIGINS` (first origin)

Validation behavior:

- committed `*.example` env templates reject deprecated aliases
- live runtime env files also fail validation when deprecated aliases are present
- remove deprecated aliases from managed env files before running local or Docker workflows

Removed runtime aliases (no longer read by API runtime):

- `PORT` -> use `API_PORT` only
- `API_URL` -> use `API_BASE_URL` where an explicit API base URL is required

## Precedence Rules

1. Explicit process env (shell/CI/runtime injection)
2. Canonical workflow env file
3. `.example` templates (never runtime inputs)

## Frontend/Backend Separation

- `app/.env.local`, `app/.env.example`, and mode env files must include only `VITE_*` keys.
- API/database/infrastructure secrets must never appear in app env files.
- `APP_URL`/`CLIENT_ORIGIN` values, when used, must target the frontend origin root (for example `https://app.example.com`), not removed legacy paths such as `/auth` or `/dashboard`.

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
