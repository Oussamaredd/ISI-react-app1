# Environment Model

This repository uses one canonical env source per workflow and strict public/private separation.

## Canonical Sources

- Local/native dev:
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

Neon managed baseline note:
- Neon is the managed deployment Postgres baseline for Phase 3.
- Local Docker Postgres remains a local-only sandbox and is not continuously synced with Neon.
- For Neon-backed migration and seed operations, `DATABASE_URL` must be the direct Neon connection string, not the pooled `-pooler` hostname.
- Store Neon connection strings only in local untracked env files or deployment/provider secret stores.
- See `docs/runbooks/NEON_MANAGED_POSTGRES_BASELINE.md` for the bootstrap and validation workflow.

## Canonical Keys

- `DATABASE_URL` for database connectivity
- `API_PORT` for API listen port
- `API_BASE_URL` for backend-generated public API URLs (for example OAuth callback URLs at the frontend edge)
- `ROUTING_API_BASE_URL` for backend road-routing service lookups
- `VITE_API_BASE_URL` for the browser-facing API base URL (normally the frontend origin in proxied runtimes)
- `VITE_MAP_TILE_URL_TEMPLATE` for the frontend Leaflet tile source template
- `VITE_MAP_TILE_ATTRIBUTION` for the frontend map attribution label

Agent tour mapping note:
- `ROUTING_API_BASE_URL` is used by the API to build and persist `tour_routes` records; the frontend does not call the routing provider directly.
- `APP_BASE_URL` for backend-to-frontend auth callback redirects (fallbacks: `APP_URL`, `CLIENT_ORIGIN`)
- `JWT_ACCESS_SECRET` for local access-token signing (Bearer JWT)
- `JWT_ACCESS_EXPIRES_IN` for local access-token TTL (for example `15m`)
- `GOOGLE_CLIENT_ID` must be a Google OAuth Web client ID (`<numeric-project-id>-<client>.apps.googleusercontent.com`)
- `GOOGLE_CALLBACK_URL` for OAuth redirect callback (required in deploy templates; canonical path is fixed and should match `API_BASE_URL + /api/auth/google/callback`)

## Port Contract

- Local/native dev:
  - Browser entrypoint: `http://localhost:5173`
  - Public edge API/health: `http://localhost:5173/api` and `http://localhost:5173/health`
  - API process listen port for direct local diagnostics: `http://localhost:3001`
- Docker dev:
  - Sole browser entrypoint: `http://localhost:3000`
  - Public edge API/health: `http://localhost:3000/api` and `http://localhost:3000/health`
  - Backend keeps `API_PORT=3001` on the internal Docker network only; local machine port `3001` should stay closed
- `API_PORT` is the backend listen port, not the browser entrypoint.
- `API_BASE_URL` and `VITE_API_BASE_URL` must resolve to the public edge origin, not the direct API listen port.
- When Cloudflare Pages fronts the SPA, keep `VITE_API_BASE_URL` on the frontend origin and enable the Pages edge proxy so browser traffic stays same-origin.

## Optional API Hardening Keys

- `RATE_LIMIT_WINDOW_MS` for global throttling window (default `60000`)
- `RATE_LIMIT_MAX_REQUESTS` for global throttling ceiling (default `120`)
- `LOG_LEVEL` for API logger level (`fatal|error|warn|info|debug|trace|silent`); in non-production, `debug|trace` also enables verbose Nest startup logs
- `LOG_FORMAT` for API log output format (`json` or `pretty`); defaults to `pretty` outside production and `json` in production

## Optional CI Quality Keys

- `SONAR_TOKEN` for SonarCloud authentication token in CI quality-gate workflows
- SonarCloud host URL is fixed in CI to `https://sonarcloud.io`
- SonarCloud organization and project key are pinned in `sonar-project.properties`
- In GitHub Actions, set `SONAR_TOKEN` as a repository secret
- If mirrored in local/backend env files for onboarding, keep placeholder values only
- `PERCY_TOKEN` as repository secret to enable visual-regression publishing in `CI.yaml` when dispatching `run_extended_quality=true`
- `CI_PERCY_COMMAND` as repository variable for the visual snapshot command executed by Percy
- `CI_ENABLE_MUTATION_GATE` as repository variable (`0` or `1`) to enable mutation gate execution
- `CI_ENABLE_VISUAL_GATE` as repository variable (`0` or `1`) to enable Percy hook execution
- `CI_ENABLE_LIGHTHOUSE_GATE` as repository variable (`0` or `1`) to enable Lighthouse lane execution

## CORS Origin Policy

- `CORS_ORIGINS` is canonical for HTTP + WebSocket browser-origin allowlisting.
- Values must be comma-separated origin roots (`scheme://host[:port]`) with no path/query/fragment.
- Wildcard (`*`) is forbidden because API/WS CORS is credentialed.
- Deploy workflows (`deploy-dev`, `deploy-staging`, `deploy-prod`) should use HTTPS origins only (localhost exceptions are for controlled local checks).
- `APP_URL` should use one of the origins listed in `CORS_ORIGINS`.

### Environment Defaults

- local dev: allow local frontend origins and short-lived team-controlled dev origins only.
- docker dev: allow only active local/docker frontend origins.
- staging: allow only controlled staging frontend origin(s).
- production: allow only owned production frontend origin(s).

Use `docs/runbooks/CORS_ORIGIN_MANAGEMENT.md` for origin ownership, change-control, and rollout steps.

## API Readiness Endpoint

- Fast liveness probe: `GET /health` (returns HTTP `200` when the API process is listening)
- API liveness alias: `GET /api/health` and `GET /api/health/live`
- Readiness probe (load-balancer/container ready-state): `GET /api/health/ready`
  - returns HTTP `200` when critical ticketing and planning schema dependencies are ready
  - returns HTTP `503` when readiness dependencies fail or a required schema surface is not queryable
- Diagnostics alias: `GET /api/health/database`
- Frontend sign-in readiness checks should target the frontend edge health path, typically `VITE_API_BASE_URL + /health`
- Frontend `/login` must stay interactive while background health checks run; `/health` is advisory UI only and must not hard-disable credential inputs.
- Local `npm run dev` waits on the local direct API readiness URL from the Port Contract before launching the app dev server, and stops startup if the readiness probe times out or returns a non-`200` status (default wait timeout: `180000ms`)
- When `/login` is already in a degraded API state, sign-in actions should reprobe the lightweight health endpoint before starting a new auth request so the UI can recover as soon as the API returns and fail fast when it is still offline.

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
- In local and Docker browser-facing runtimes, `VITE_API_BASE_URL` should target the frontend origin so the edge layer owns `/api` and `/health` routing.
- For Cloudflare Pages deploys, set `VITE_USE_EDGE_API_PROXY=true` and `EDGE_PROXY_TARGET_ORIGIN=<backend-public-origin>` at build time so Vite emits a `_redirects` file that proxies `/api/*` and `/health` through the frontend edge.
- `APP_URL`/`CLIENT_ORIGIN` values, when used, must target the frontend origin root (for example `https://app.example.com`), not removed legacy paths such as `/auth` or `/dashboard`.

## OAuth Callback Contract

- Canonical local-dev callback URI: `http://localhost:5173/api/auth/google/callback`
- Canonical docker-dev callback URI: `http://localhost:3000/api/auth/google/callback`
- Callback path is fixed: `/api/auth/google/callback`
- When `API_BASE_URL` is set, `GOOGLE_CALLBACK_URL` should match the callback derived from that public API base exactly.
- `GOOGLE_CLIENT_ID` must use Google Web OAuth client format (`<numeric-project-id>-<client>.apps.googleusercontent.com`)
- When `API_BASE_URL` is not set and `GOOGLE_CALLBACK_URL` points at localhost, its port must match `API_PORT`
- Google Console authorized redirect URI must exactly match runtime callback URI
- In Docker, the callback must be reached through the frontend edge on `3000`; the backend `3001` port is internal-only

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

`api/.env` remains template-only guidance for service-scoped reference values. In local dev, the canonical runtime source is still root `/.env`.

## Docker Commands

```bash
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core config
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core up -d --build
```

## References

- Inventory: `docs/ENV_INVENTORY.md`
- Conflicts: `docs/ENV_CONFLICTS.md`
- Decisions: `docs/ENV_CANONICAL_DECISIONS.md`


