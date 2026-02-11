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

## Canonical Keys

- `DATABASE_URL` for database connectivity
- `API_PORT` for API listen port
- `VITE_API_BASE_URL` for frontend API base URL
- `GOOGLE_CALLBACK_URL` for OAuth redirect callback (optional explicit override; canonical path is fixed)

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

## OAuth Callback Contract

- Canonical callback URI (local and Docker dev): `http://localhost:3001/api/auth/google/callback`
- Callback path is fixed: `/api/auth/google/callback`
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
