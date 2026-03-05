# Environment Variable Inventory

Last updated: 2026-03-05

This inventory is a reference snapshot, not the day-to-day policy document. For the active runtime contract, use `docs/ENV.md`.

## Discovery Scope

Env files discovered in repo scope (`.`, `app/`, `api/`, `database/`, `infrastructure/`):

- `.env`
- `.env.example`
- `app/.env.local`
- `app/.env.example`
- `app/.env.app`
- `app/.env.landing`
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
| APP_BASE_URL | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical optional explicit frontend app base |
| APP_URL | api | private | docker-dev, deploy-dev, deploy-staging, deploy-prod | supported frontend app-origin fallback (`APP_BASE_URL` takes precedence when both are set) |
| BCRYPT_ROUNDS | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| CACHE_MAX_SIZE | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| CACHE_TTL | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| CLIENT_ORIGIN | api | private | local-dev, docker-dev | transitional alias (prefer `CORS_ORIGINS`) |
| CORS_ORIGINS | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| DATABASE_POOL_MAX | database | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| DATABASE_POOL_MIN | database | private | deploy-dev, deploy-staging, deploy-prod | canonical |
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
| PORT | api | private | local-dev, deploy-dev, deploy-staging, deploy-prod | removed API runtime alias (normalize to `API_PORT`) |
| POSTGRES_DB | infrastructure | private | docker-dev | canonical compose DB container setting |
| POSTGRES_PASSWORD | infrastructure | private | docker-dev | canonical compose DB container setting |
| POSTGRES_USER | infrastructure | private | docker-dev | canonical compose DB container setting |
| RATE_LIMIT_MAX_REQUESTS | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| RATE_LIMIT_WINDOW_MS | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| REDIS_URL | infrastructure | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| SESSION_MAX_AGE | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
| SESSION_SECRET | api | private | local-dev, docker-dev, deploy-dev, deploy-staging, deploy-prod | canonical |
| SESSION_SECURE | api | private | deploy-dev, deploy-staging, deploy-prod | canonical |
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
| VITE_USE_LANDING_PAGE | app | public | local-dev | canonical (mode-specific UI toggle) |
| WEBHOOK_SECRET | infrastructure | private | deploy-staging, deploy-prod | canonical |
| WEBHOOK_URL | infrastructure | private | deploy-staging, deploy-prod | canonical |

## Notes

- No secret values are included in this inventory; this file is key-only.
- Canonical naming and deprecation decisions are finalized in `docs/ENV_CANONICAL_DECISIONS.md`.
- Local browser traffic should follow the Port Contract in `docs/ENV.md` instead of inferring browser origins from `API_PORT`.

