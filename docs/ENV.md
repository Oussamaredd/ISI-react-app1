# Environment Model

This repository uses one canonical env source per workflow and strict public/private separation.

Mobile workspace note:
- The `mobile` workspace is an Expo/React Native client layer inside this repo.
- It uses `mobile/.env.local` for public runtime configuration and `EXPO_PUBLIC_*` as the only allowed public key prefix.

## Canonical Sources

- Local/native dev:
  - Private source: `/.env`
  - Frontend public source: `app/.env.local` (`VITE_*` only)
  - Mobile public source: `mobile/.env.local` (`EXPO_PUBLIC_*` only)
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
- `ROUTING_TIMEOUT_MS` for routing-call timeout before the circuit breaker records a failure
- `ROUTING_FAILURE_THRESHOLD` for consecutive routing failures required to open the circuit breaker
- `ROUTING_RESET_WINDOW_MS` for the open-state cooldown before the routing circuit allows a probe request
- `IOT_INGESTION_ENABLED` to enable the async IoT ingestion worker and HTTP ingestion endpoints
- `IOT_QUEUE_CONCURRENCY` for the number of concurrent ingestion workers
- `IOT_QUEUE_BATCH_SIZE` for the maximum measurements drained per worker batch and DB insert chunk
- `IOT_BACKPRESSURE_THRESHOLD` for the queued-measurement ceiling that activates ingestion backpressure
- `IOT_MAX_BATCH_SIZE` for the maximum measurements accepted in one HTTP batch request
- `IOT_VALIDATED_CONSUMER_CONCURRENCY` for the downstream validated-event projection worker concurrency
- `IOT_VALIDATED_CONSUMER_BATCH_SIZE` for the maximum validated-event deliveries drained per consumer batch
- `IOT_INGESTION_SHARD_COUNT` for the number of virtual partitions used by the staged-ingestion worker
- `IOT_VALIDATED_CONSUMER_SHARD_COUNT` for the number of virtual partitions used by the validated-event consumer
- `OTEL_TRACING_ENABLED` to enable OpenTelemetry trace export from the API and worker flows
- `OTEL_SERVICE_NAME` for the OpenTelemetry service name emitted by the API runtime
- `OTEL_EXPORTER_OTLP_ENDPOINT` for the OTLP HTTP collector endpoint used by trace export
- `OTEL_TRACES_SAMPLER_RATIO` for probabilistic trace sampling from `0` to `1`
- `ENABLE_LOGSTASH` to mirror structured API and worker logs to the TCP log shipper
- `LOGSTASH_HOST` for the log shipping target hostname
- `LOGSTASH_PORT` for the log shipping target TCP port
- `VITE_API_BASE_URL` for the browser-facing API base URL (normally the frontend origin in proxied runtimes)
- `EXPO_PUBLIC_API_BASE_URL` for the native mobile API base URL (must resolve to a device/simulator reachable API origin)
- `VITE_MAP_TILE_URL_TEMPLATE` for the frontend Leaflet tile source template
- `VITE_MAP_TILE_ATTRIBUTION` for the frontend map attribution label
- `VITE_SENTRY_DSN` and `EXPO_PUBLIC_SENTRY_DSN` for optional client-side Sentry issue capture on web and mobile
- `VITE_RELEASE_VERSION` and `EXPO_PUBLIC_RELEASE_VERSION` for client release tagging in Sentry and backend telemetry
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` for build-time source-map upload; keep them in shell/CI secrets, not client env files

Agent tour mapping note:
- `ROUTING_API_BASE_URL` is used by the API to build and persist `tour_routes` records; the frontend does not call the routing provider directly.
- `ROUTING_TIMEOUT_MS`, `ROUTING_FAILURE_THRESHOLD`, and `ROUTING_RESET_WINDOW_MS` tune the tour-routing circuit breaker so agent-route rebuilds fall back cleanly during upstream routing outages.
- `IOT_INGESTION_ENABLED`, `IOT_QUEUE_CONCURRENCY`, `IOT_QUEUE_BATCH_SIZE`, `IOT_BACKPRESSURE_THRESHOLD`, and `IOT_MAX_BATCH_SIZE` configure the monolith IoT ingestion worker used by `POST /api/iot/v1/measurements` and `POST /api/iot/v1/measurements/batch`.
- `IOT_VALIDATED_CONSUMER_CONCURRENCY`, `IOT_VALIDATED_CONSUMER_BATCH_SIZE`, `IOT_INGESTION_SHARD_COUNT`, and `IOT_VALIDATED_CONSUMER_SHARD_COUNT` configure the downstream validated-event pipeline, including the virtual shard count used to keep same-device processing ordered while allowing parallel drain across different sensors.
- `OTEL_TRACING_ENABLED`, `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, and `OTEL_TRACES_SAMPLER_RATIO` configure OpenTelemetry tracing for HTTP requests, auth exchange, citizen reporting, route planning, tour validation, and the IoT worker pipeline.
- `ENABLE_LOGSTASH`, `LOGSTASH_HOST`, and `LOGSTASH_PORT` configure structured JSON log shipping from the API runtime into Logstash/Elasticsearch when the observability profile is enabled.
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
- Native mobile dev:
  - Expo/native clients do not use the browser edge proxy or fixed browser ports.
  - `EXPO_PUBLIC_API_BASE_URL` must resolve to an API origin reachable from the active emulator, simulator, or physical device.
- `API_PORT` is the backend listen port, not the browser entrypoint.
- `API_BASE_URL` and `VITE_API_BASE_URL` must resolve to the public edge origin, not the direct API listen port.
- `EXPO_PUBLIC_API_BASE_URL` must resolve to the public API origin used by the native client, not to database/internal service hosts.
- When Cloudflare Pages fronts the SPA, keep `VITE_API_BASE_URL` on the frontend origin and enable the Pages edge proxy so browser traffic stays same-origin.

## Optional API Hardening Keys

- `RATE_LIMIT_WINDOW_MS` for global throttling window (default `60000`)
- `RATE_LIMIT_MAX_REQUESTS` for global throttling ceiling (default `120`)
- `LOG_LEVEL` for API logger level (`fatal|error|warn|info|debug|trace|silent`); in non-production, `debug|trace` also enables verbose Nest startup logs
- `LOG_FORMAT` for API log output format (`json` or `pretty`); defaults to `pretty` outside production and `json` in production

## Optional Observability Keys

- `OTEL_TRACING_ENABLED` enables OpenTelemetry trace export (default `false`)
- `OTEL_SERVICE_NAME` sets the service name reported to the collector (default `ecotrack-api`)
- `OTEL_EXPORTER_OTLP_ENDPOINT` sets the collector base URL for OTLP HTTP export (default `http://localhost:4318` in local/native dev)
- `OTEL_TRACES_SAMPLER_RATIO` sets probabilistic sampling between `0` and `1` (default `1`)
- `ENABLE_LOGSTASH` mirrors structured request and worker logs to Logstash over TCP (default `false`)
- `LOGSTASH_HOST` sets the Logstash hostname used by the API runtime when shipping logs (default `logstash`)
- `LOGSTASH_PORT` sets the Logstash TCP port used by the API runtime when shipping logs (default `5001`)
- `ALERTMANAGER_DEV_WEBHOOK_URL` sets the default dev webhook receiver used by the local Alertmanager container
- `ALERTMANAGER_WARNING_RECEIVER` chooses the Alertmanager receiver name for warning alerts (default `dev-webhook`)
- `ALERTMANAGER_CRITICAL_RECEIVER` chooses the Alertmanager receiver name for critical alerts (default `dev-webhook`)
- `ALERTMANAGER_GROUP_WAIT` sets Alertmanager initial grouping delay (default `30s`)
- `ALERTMANAGER_GROUP_INTERVAL` sets the Alertmanager grouped resend interval (default `5m`)
- `ALERTMANAGER_REPEAT_INTERVAL` sets the Alertmanager repeat notification interval (default `4h`)
- `ALERTMANAGER_SLACK_WEBHOOK_URL` sets the Slack webhook URL used by the optional `slack-warning` receiver
- `ALERTMANAGER_SLACK_CHANNEL` sets the Slack channel name used by the optional `slack-warning` receiver
- `ALERTMANAGER_PAGERDUTY_ROUTING_KEY` sets the PagerDuty routing key used by the optional `pagerduty-critical` receiver
- For Docker dev with the `obs` profile enabled, set `OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318` and inspect traces in Jaeger at `http://localhost:16686`.
- For Docker dev with the `obs` profile enabled, Alertmanager is exposed at `http://localhost:9093`, the local webhook sink is exposed at `http://localhost:8085`, Kibana is exposed at `http://localhost:5601`, and Elasticsearch-backed log search is also available through Grafana.

## Optional Routing Resilience Keys

- `ROUTING_TIMEOUT_MS` for the maximum duration of one routing-provider call before it is treated as a failure (default `10000`)
- `ROUTING_FAILURE_THRESHOLD` for the number of consecutive routing failures that opens the circuit breaker (default `5`)
- `ROUTING_RESET_WINDOW_MS` for the open-state cooldown before a half-open recovery probe is allowed (default `30000`)

## Optional IoT Ingestion Keys

- `IOT_INGESTION_ENABLED` to expose the async IoT ingestion endpoints and worker (default `true`)
- `IOT_QUEUE_CONCURRENCY` for the number of concurrent queue workers draining buffered measurements (default `50`)
- `IOT_QUEUE_BATCH_SIZE` for the maximum measurements processed per worker batch and DB write chunk (default `500`)
- `IOT_BACKPRESSURE_THRESHOLD` for the queued-measurement ceiling that pauses new ingestion requests with `503` responses (default `100000`)
- `IOT_MAX_BATCH_SIZE` for the maximum measurements allowed in one HTTP batch request (default `1000`)
- `IOT_VALIDATED_CONSUMER_CONCURRENCY` for the number of downstream validated-event consumer workers (default `20`)
- `IOT_VALIDATED_CONSUMER_BATCH_SIZE` for the maximum validated-event deliveries drained per worker batch (default `250`)
- `IOT_INGESTION_SHARD_COUNT` for the number of virtual shards used by the staged-ingestion queue and recovery loop (default `12`)
- `IOT_VALIDATED_CONSUMER_SHARD_COUNT` for the number of virtual shards used by the validated-delivery queue and recovery loop (default `12`)

## Optional CI Quality Keys

- `SONAR_TOKEN` for SonarCloud authentication token in CI quality-gate workflows
- SonarCloud host URL is fixed in CI to `https://sonarcloud.io`
- SonarCloud organization and project key are pinned in `sonar-project.properties`
- In GitHub Actions, set `SONAR_TOKEN` as a repository secret
- If mirrored in local/backend env files for onboarding, keep placeholder values only
- `PERCY_TOKEN` as repository secret to enable visual-regression publishing in `CI.yaml` when dispatching `run_extended_quality=true`
- `CI_PERCY_COMMAND` as an optional repository variable to override the default Percy snapshot command executed by the visual-regression lane
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
- Kubernetes-style liveness alias: `GET /healthz`
- Startup alias: `GET /startupz`
- Root readiness alias: `GET /readyz`
- API liveness alias: `GET /api/health` and `GET /api/health/live`
- Readiness probe (load-balancer/container ready-state): `GET /api/health/ready`
  - returns HTTP `200` when critical ticketing and planning schema dependencies are ready
  - returns HTTP `503` when readiness dependencies fail or a required schema surface is not queryable
- Diagnostics alias: `GET /api/health/database`
- `GET /health`, `GET /healthz`, and `GET /startupz` stay dependency-free so process-start and edge-proxy probes do not flap on downstream outages.
- `GET /readyz`, `GET /api/health/ready`, and `GET /api/health/database` are the dependency-aware readiness checks.
- Frontend health probes, when used for diagnostics, should target the frontend edge health path, typically `VITE_API_BASE_URL + /health`
- Frontend `/login` must stay interactive and send auth requests directly; `/health` is advisory only and must not gate sign-in submission.
- Local `npm run dev` waits on the local direct API readiness URL from the Port Contract before launching the app dev server, and stops startup if the readiness probe times out or returns a non-`200` status (default wait timeout: `180000ms`)

## Request Correlation

- `X-Request-Id` remains the canonical human-facing request correlation header and is reused from incoming `x-request-id` values when provided.
- `Traceparent` is emitted on every response and reused from valid incoming W3C trace context when provided.
- `Tracestate` is echoed on responses when the incoming request carries it.
- Structured API logs emit `traceId` and `spanId` alongside request metadata.
- The IoT worker path persists `traceparent` and `tracestate` on staged and validated events so the downstream consumer continues the originating request trace instead of starting an unrelated trace tree.

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

## Workspace Install Contract

- The monorepo install contract is one committed root `package-lock.json` plus repo-root `npm ci --include=dev`.
- Do not use `npm install --prefix <workspace>` or create workspace-local `package-lock.json` files.
- Use `npm run validate:workspace-toolchain` before cross-layer build, lint, test, or Render verification when local dependency drift is suspected.

## Frontend/Backend Separation

- `app/.env.local`, `app/.env.example`, and mode env files must include only `VITE_*` keys.
- `mobile/.env.local`, `mobile/.env.example`, and mode env files must include only `EXPO_PUBLIC_*` keys.
- API/database/infrastructure secrets must never appear in app or mobile env files.
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_RELEASE` are private build/deploy inputs; expose only the public DSNs (`VITE_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN`) to clients.
- In local and Docker browser-facing runtimes, `VITE_API_BASE_URL` should target the frontend origin so the edge layer owns `/api` and `/health` routing.
- In native mobile runtimes, `EXPO_PUBLIC_API_BASE_URL` should target the public API origin directly because Expo clients do not inherit the Vite edge proxy.
- For Cloudflare Pages deploys, set `VITE_USE_EDGE_API_PROXY=true` and `EDGE_PROXY_TARGET_ORIGIN=<backend-public-origin>` at build time so Vite emits a `_redirects` file that proxies `/api/*` and `/health` through the frontend edge.
- `APP_URL`/`CLIENT_ORIGIN` values, when used, must target the frontend origin root (for example `https://app.example.com`), not removed legacy paths such as `/auth` or `/dashboard`.

## Frontend Error Tracking

- Web initializes Sentry when `VITE_SENTRY_DSN` is present and continues forwarding aggregate client errors and Web Vitals to `/api/errors` and `/api/metrics/frontend`.
- Mobile initializes Sentry when `EXPO_PUBLIC_SENTRY_DSN` is present and continues forwarding aggregate runtime, push, and API failures to `/api/errors`.
- Web source maps upload through the Vite build only when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are present in the shell or CI environment.
- Expo builds can enable the `@sentry/react-native/expo` plugin path for native symbol/source-map support without placing private Sentry credentials in committed mobile env files.

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
npm ci --include=dev
cp .env.example .env
cp app/.env.example app/.env.local
cp mobile/.env.example mobile/.env.local
cp api/.env.example api/.env
cp infrastructure/environments/.env.docker.example infrastructure/environments/.env.docker
```

`api/.env` remains template-only guidance for service-scoped reference values. In local dev, the canonical runtime source is still root `/.env`.

## Docker Commands

```bash
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core config
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core up -d --build
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile obs up -d elasticsearch logstash kibana jaeger grafana prometheus alertmanager alert-webhook-sink
```

## References

- Inventory: `docs/ENV_INVENTORY.md`
- Conflicts: `docs/ENV_CONFLICTS.md`
- Decisions: `docs/ENV_CANONICAL_DECISIONS.md`


