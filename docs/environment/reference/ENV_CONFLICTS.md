# Environment Conflicts And Resolution

Last updated: 2026-03-05

This page is a historical normalization record. The active runtime policy lives in `docs/environment/reference/ENV.md`; use this file to understand prior conflicts, deprecated aliases, and why certain cleanup rules exist.

## Conflict Matrix

| Conflict | Observed Locations | Risk | Resolution | Status |
| --- | --- | --- | --- | --- |
| `VITE_API_URL` vs `VITE_API_BASE_URL` | `app/.env.local`, `app/.env.example`, `app/.env.app`, `app/src/services/api.tsx` | Frontend source ambiguity and drift between local/CI/build inputs | Canonical key is `VITE_API_BASE_URL`. Keep `VITE_API_URL` as temporary alias in code only during transition. | resolved (canonical picked) |
| `PORT` vs `API_PORT` | `.env`, `infrastructure/environments/.env.*`, API config | API port can differ by workflow and break callback/CORS assumptions | Canonical key is `API_PORT`; API runtime accepts provider-injected `PORT` only as a hosted fallback when `API_PORT` is absent. | resolved (canonical + hosted fallback) |
| `DB_*` (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`) vs `DATABASE_URL` | `.env`, `infrastructure/environments/.env.docker` | Multiple DB sources can point services to different DBs | Canonical key is `DATABASE_URL` for app/runtime and tooling. Keep `POSTGRES_*` only for DB container bootstrap in compose. | resolved (canonical picked) |
| API runtime split across `.env` and `api/.env` | root `.env`, `api/.env`, `api/src/main.ts`, `api/src/app.module.ts` | Local native dev may load different env file depending on cwd | Canonical local source is root `.env`; `api/.env` is deprecated as runtime source and now template-only guidance for service-scoped keys. | resolved |
| Docker compose mixed `env_file` + inline fallbacks | `infrastructure/docker-compose.yml` | Inline defaults can silently diverge from canonical docker env file | `--env-file infrastructure/environments/.env.docker` is enforced on compose scripts; redundant inline env defaults removed for canonicalized keys. | resolved |
| Deployed env runtime files tracked as non-template files | `infrastructure/environments/.env.development`, `.env.staging`, `.env.production` | Confuses template vs runtime ownership; risk of committed secrets | Keep committed templates only: `.env.development.example`, `.env.staging.example`, `.env.production.example`; runtime values are injected by secret manager. | resolved |

## Deprecation Map

| Deprecated | Canonical | Sunset Rule |
| --- | --- | --- |
| `VITE_API_URL` | `VITE_API_BASE_URL` | Keep read support in frontend code temporarily; stop writing this key in env files now. |
| `PORT` | `API_PORT` | Keep `API_PORT` as canonical; runtime accepts provider-injected `PORT` only as a hosted fallback when `API_PORT` is absent. |
| `API_URL` | `API_BASE_URL` | Removed from API runtime callback derivation; use `API_BASE_URL` as the canonical public API origin, especially when the frontend edge owns `/api`. |
| `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_PORT` | `DATABASE_URL` | Keep only when needed for local DB bootstrap tooling; runtime resolution uses `DATABASE_URL`. |
| `CLIENT_ORIGIN` | `CORS_ORIGINS` (first origin) | Keep optional for backward compatibility; canonical docs and templates use `CORS_ORIGINS`. |

## Non-Conflicts (Intentional)

- `API_PORT` vs `API_BASE_URL` is intentional after the edge-gateway cleanup: `API_PORT` is the backend listen port, while `API_BASE_URL` is the public frontend-edge origin.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` remain compose DB-container settings and are not replacements for `DATABASE_URL`.
- `VITE_BASE` remains frontend-only and valid for hosted path deployments.

