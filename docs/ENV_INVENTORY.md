# Environment Variable Inventory

Last updated: 2026-03-26

This inventory is a reference snapshot, not the day-to-day policy document. For the active runtime contract, use `docs/ENV.md`.

## Discovery Scope

Env files discovered in repo scope (`.`, `app/`, `api/`, `database/`, `infrastructure/`):

- `.env`
- `.env.example`
- `app/.env.local`
- `app/.env.example`
- `app/.env.app`
- `app/.env.landing`
- `app/.env.production`
- `api/.env`
- `api/.env.example`
- `database/.env.example`
- `infrastructure/environments/.env.docker`
- `infrastructure/environments/.env.docker.example`
- `infrastructure/environments/.env.development.example`
- `infrastructure/environments/.env.staging.example`
- `infrastructure/environments/.env.production.example`

Workflow legend:

- `local-dev`: native local dev (`npm run dev`, root `.env`, `app/.env.local`)
- `docker-dev`: compose core profile (`infrastructure/environments/.env.docker`)
- `deploy-dev`: injected runtime env for development deployment
- `deploy-staging`: injected runtime env for staging deployment
- `deploy-prod`: injected runtime env for production deployment
- `ci`: CI workflow secrets and runtime injection (GitHub Actions)

Visibility legend:

- `public`: frontend-visible (`VITE_*` only)
- `private`: backend/database/infrastructure only

## Canonical Variable Catalog

| Key | Owner | Visibility | Workflows | Status |
| --- | --- | --- | --- | --- |
| API_PORT | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| API_BASE_URL | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| API_URL | api | private | local-dev, deploy-dev, deploy-staging, deploy-prod | removed runtime alias (use `API_BASE_URL` when explicit API base is needed) |
| ALERTMANAGER_CRITICAL_RECEIVER | infrastructure | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical (optional) |
| ALERTMANAGER_DEV_WEBHOOK_URL | infrastructure | private | local-dev, docker-dev | canonical (optional) |
| ALERTMANAGER_GROUP_INTERVAL | infrastructure | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical (optional) |
| ALERTMANAGER_GROUP_WAIT | infrastructure | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical (optional) |
| ALERTMANAGER_PAGERDUTY_ROUTING_KEY | infrastructure | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical (optional) |
| ALERTMANAGER_REPEAT_INTERVAL | infrastructure | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical (optional) |
| ALERTMANAGER_SLACK_CHANNEL | infrastructure | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical (optional) |
| ALERTMANAGER_SLACK_WEBHOOK_URL | infrastructure | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical (optional) |
| ALERTMANAGER_WARNING_RECEIVER | infrastructure | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical (optional) |
| APP_BASE_URL | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical optional explicit frontend app base |
| APP_URL | api | private | docker-dev, deploy-dev, deploy-staging, deploy-prod | supported frontend app-origin fallback (`APP_BASE_URL` takes precedence when both are set) |
| BCRYPT_ROUNDS | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| CACHE_ANALYTICS_TTL_SECONDS | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| CACHE_CITIZEN_TTL_SECONDS | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| CACHE_DASHBOARD_TTL_SECONDS | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| CACHE_DEFAULT_TTL_SECONDS | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| CACHE_ENABLED | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| CACHE_MAX_MEMORY_ENTRIES | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| CACHE_PLANNING_TTL_SECONDS | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| CACHE_PREFIX | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| CACHE_REDIS_URL | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical (optional) |
| CD_BACKEND_DEPLOY_HOOK_METHOD | infrastructure | private | ci | optional GitHub Actions environment variable for backend deploy-hook HTTP method |
| CD_BACKEND_DEPLOY_HOOK_URL | infrastructure | private | ci | optional GitHub Actions environment secret for backend deploy hook |
| CD_DEPLOY_API_HEALTH_URL | infrastructure | private | ci | hosted API readiness URL for CD manifest and smoke validation |
| CD_DEPLOY_APP_URL | infrastructure | private | ci | hosted frontend root URL for CD manifest and smoke validation |
| CD_DEPLOY_EXPECTED_API_BASE_URL | infrastructure | private | ci | optional frontend API-base assertion for hosted release smoke |
| CD_DEPLOY_EXPECTED_API_RELEASE_VERSION | infrastructure | private | ci | optional API release-version assertion for hosted release smoke |
| CD_DEPLOY_EXPECTED_FRONTEND_RELEASE_VERSION | infrastructure | private | ci | optional frontend release-version assertion for hosted release smoke |
| CD_DEPLOY_EXPECTED_OAUTH_CALLBACK_URL | infrastructure | private | ci | optional OAuth callback assertion for hosted release smoke |
| CD_DEPLOY_FRONTEND_HEALTH_URL | infrastructure | private | ci | optional frontend health URL for hosted release smoke |
| CD_DEPLOY_OAUTH_ENTRY_URL | infrastructure | private | ci | optional hosted OAuth entry URL for hosted release smoke |
| CD_FRONTEND_DEPLOY_HOOK_METHOD | infrastructure | private | ci | optional GitHub Actions environment variable for frontend deploy-hook HTTP method |
| CD_FRONTEND_DEPLOY_HOOK_URL | infrastructure | private | ci | optional GitHub Actions environment secret for frontend deploy hook |
| CD_RELEASE_SMOKE_INTERVAL_MS | infrastructure | private | ci | optional hosted release-smoke polling interval override |
| CD_RELEASE_SMOKE_TIMEOUT_MS | infrastructure | private | ci | optional hosted release-smoke timeout override |
| CLIENT_ORIGIN | api | private | local-dev, docker-dev | transitional alias (prefer `CORS_ORIGINS`) |
| CLOUDFLARE_API_TOKEN | infrastructure | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod, ci | canonical (optional purge automation token) |
| CLOUDFLARE_ZONE_ID | infrastructure | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod, ci | canonical (optional purge automation zone id) |
| CORS_ORIGINS | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| DATABASE_POOL_MAX | database | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| DATABASE_POOLER_URL | database | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical (optional runtime pooler) |
| DATABASE_URL | database | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| DB_HOST | database | private | local-dev, docker-dev | deprecated alias (normalize to `DATABASE_URL`) |
| DB_NAME | database | private | local-dev, docker-dev | deprecated alias (normalize to `DATABASE_URL`) |
| DB_PASSWORD | database | private | local-dev, docker-dev | deprecated alias (normalize to `DATABASE_URL`) |
| DB_PORT | database | private | local-dev, docker-dev | deprecated alias (normalize to `DATABASE_URL`) |
| DB_USER | database | private | local-dev, docker-dev | deprecated alias (normalize to `DATABASE_URL`) |
| ELASTIC_URL | infrastructure | private | local-dev, docker-dev | canonical (optional observability) |
| EMAIL_FROM | api | private | deploy-prod | canonical |
| ENABLE_2FA | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| ENABLE_EMAIL_VERIFICATION | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| ENABLE_LOGSTASH | infrastructure | private | local-dev, docker-dev | canonical (optional) |
| ENABLE_METRICS | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| ENABLE_REGISTRATION | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| ENABLE_SWAGGER | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| GOOGLE_CALLBACK_URL | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical for deploy templates (path fixed to `/api/auth/google/callback`) |
| GOOGLE_CLIENT_ID | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| GOOGLE_CLIENT_SECRET | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| IOT_BACKPRESSURE_THRESHOLD | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| IOT_INGESTION_ENABLED | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| IOT_INGESTION_SHARD_COUNT | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| IOT_MAX_BATCH_SIZE | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| IOT_QUEUE_BATCH_SIZE | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| IOT_QUEUE_CONCURRENCY | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| IOT_VALIDATED_CONSUMER_BATCH_SIZE | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| IOT_VALIDATED_CONSUMER_CONCURRENCY | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| IOT_VALIDATED_CONSUMER_SHARD_COUNT | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| JWT_ACCESS_EXPIRES_IN | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| JWT_ACCESS_SECRET | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| JWT_EXPIRES_IN | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| JWT_SECRET | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| LOG_FORMAT | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| LOG_LEVEL | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| LOGSTASH_HOST | infrastructure | private | local-dev, docker-dev | canonical (optional) |
| LOGSTASH_PORT | infrastructure | private | local-dev, docker-dev | canonical (optional) |
| MAX_FILE_SIZE | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| METRICS_PORT | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| NODE_ENV | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| OTEL_EXPORTER_OTLP_ENDPOINT | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| OTEL_SERVICE_NAME | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| OTEL_TRACES_SAMPLER_RATIO | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| OTEL_TRACING_ENABLED | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| PORT | api | private | local-dev, deploy-dev, deploy-staging, deploy-prod | removed API runtime alias (normalize to `API_PORT`) |
| POSTGRES_DB | infrastructure | private | docker-dev | canonical compose DB container setting |
| POSTGRES_PASSWORD | infrastructure | private | docker-dev | canonical compose DB container setting |
| POSTGRES_USER | infrastructure | private | docker-dev | canonical compose DB container setting |
| RATE_LIMIT_MAX_REQUESTS | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| RATE_LIMIT_WINDOW_MS | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| RESPONSE_COMPRESSION_ENABLED | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| RESPONSE_COMPRESSION_LEVEL | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| RESPONSE_COMPRESSION_THRESHOLD_BYTES | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| ROUTING_API_BASE_URL | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| ROUTING_FAILURE_THRESHOLD | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| ROUTING_RESET_WINDOW_MS | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| ROUTING_TIMEOUT_MS | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| SENTRY_AUTH_TOKEN | infrastructure | private | local-dev, ci, deploy-dev, deploy-staging, deploy-prod | optional Sentry sourcemap upload token |
| SENTRY_ORG | infrastructure | private | local-dev, ci, deploy-dev, deploy-staging, deploy-prod | optional Sentry organization slug for sourcemap upload |
| SENTRY_PROJECT | infrastructure | private | local-dev, ci, deploy-dev, deploy-staging, deploy-prod | optional Sentry project slug for sourcemap upload |
| SENTRY_RELEASE | infrastructure | private | local-dev, ci, deploy-dev, deploy-staging, deploy-prod | optional explicit release override for sourcemap upload |
| SESSION_MAX_AGE | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| SESSION_SECRET | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| SESSION_SECURE | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| CI_ENABLE_LIGHTHOUSE_GATE | infrastructure | private | ci | optional quality-lane toggle (`0` or `1`) |
| CI_ENABLE_MUTATION_GATE | infrastructure | private | ci | optional mutation-lane toggle (`0` or `1`) |
| CI_ENABLE_VISUAL_GATE | infrastructure | private | ci | optional visual-lane toggle (`0` or `1`) |
| CI_PERCY_COMMAND | infrastructure | private | ci | optional Percy execution command for visual snapshots |
| PERCY_TOKEN | infrastructure | private | ci | optional Percy authentication token for visual-regression publishing |
| SONAR_ORGANIZATION | infrastructure | private | ci | optional SonarCloud org override for manual/legacy scanner wiring |
| SONAR_PROJECT_KEY | infrastructure | private | ci | optional SonarCloud project-key override for manual/legacy scanner wiring |
| SONAR_TOKEN | infrastructure | private | ci | canonical SonarCloud CI analysis token |
| SMTP_HOST | infrastructure | private | deploy-prod | canonical |
| SMTP_PASS | infrastructure | private | deploy-prod | canonical |
| SMTP_PORT | infrastructure | private | deploy-prod | canonical |
| SMTP_USER | infrastructure | private | deploy-prod | canonical |
| TELEGRAM_BOT_TOKEN | infrastructure | private | local-dev, docker-dev | canonical (optional) |
| TELEGRAM_CHAT_ID | infrastructure | private | local-dev, docker-dev | canonical (optional) |
| UPLOAD_PATH | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| VITE_API_BASE_URL | app | public | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| VITE_API_URL | app | public | local-dev | deprecated alias (migrate to `VITE_API_BASE_URL`) |
| VITE_BASE | app | public | local-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| VITE_RELEASE_VERSION | app | public | local-dev, deploy-dev, deploy-staging, deploy-prod | optional frontend release tag for telemetry/Sentry |
| VITE_SENTRY_DSN | app | public | local-dev, deploy-dev, deploy-staging, deploy-prod | optional web Sentry DSN |
| VITE_SENTRY_ENVIRONMENT | app | public | local-dev, deploy-dev, deploy-staging, deploy-prod | optional web Sentry environment override |
| VITE_USE_LANDING_PAGE | app | public | local-dev | canonical (mode-specific UI toggle) |
| EXPO_PUBLIC_RELEASE_VERSION | mobile | public | local-dev, deploy-dev, deploy-staging, deploy-prod | optional mobile release tag for telemetry/Sentry |
| EXPO_PUBLIC_SENTRY_DSN | mobile | public | local-dev, deploy-dev, deploy-staging, deploy-prod | optional mobile Sentry DSN |
| EXPO_PUBLIC_SENTRY_ENVIRONMENT | mobile | public | local-dev, deploy-dev, deploy-staging, deploy-prod | optional mobile Sentry environment override |
| WEBHOOK_SECRET | infrastructure | private | deploy-staging, deploy-prod | canonical |
| WEBHOOK_URL | infrastructure | private | deploy-staging, deploy-prod | canonical |

## Notes

- No secret values are included in this inventory; this file is key-only.
- Canonical naming and deprecation decisions are finalized in `docs/ENV_CANONICAL_DECISIONS.md`.
- Local browser traffic should follow the Port Contract in `docs/ENV.md` instead of inferring browser origins from `API_PORT`.

