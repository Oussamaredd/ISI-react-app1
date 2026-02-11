# Canonical Env Decisions

Date: 2026-02-11
Status: Approved

## 1) Canonical Keys

- Database connection: `DATABASE_URL`
- API port: `API_PORT`
- Frontend API base: `VITE_API_BASE_URL`

Deprecated aliases (read-only compatibility window):

- `VITE_API_URL` -> `VITE_API_BASE_URL`
- `PORT` -> `API_PORT`
- `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_PORT` -> `DATABASE_URL`

## 2) Canonical File Locations By Workflow

### Host/native dev

- Private backend/database source: `/.env`
- Public frontend source: `app/.env.local` (`VITE_*` only)

### Docker dev

- Single source: `infrastructure/environments/.env.docker`
- `migrate` and `backend` must resolve the same `DATABASE_URL` source

### Deployed environments

- Runtime source: secret manager injection (not committed)
- Committed templates only:
  - `infrastructure/environments/.env.development.example`
  - `infrastructure/environments/.env.staging.example`
  - `infrastructure/environments/.env.production.example`

## 3) Precedence Policy

1. Explicit process env injected by shell/CI/runtime
2. Canonical workflow env file
3. `.example` templates (never runtime inputs)

## 4) Frontend Policy (Vite)

- Frontend env files (`app/.env.local`, `app/.env.example`, mode files) may contain only `VITE_*` keys.
- Backend/database/infrastructure keys are forbidden in app env files.

## 5) Database Naming Policy

- Canonical database name is `ticketdb`.
- All committed `DATABASE_URL` examples and compose templates must target `/ticketdb`.

## 6) Migration Window Notes

- Code may continue to read deprecated aliases temporarily.
- No new file should write deprecated aliases.
- Documentation and templates must use canonical names only.