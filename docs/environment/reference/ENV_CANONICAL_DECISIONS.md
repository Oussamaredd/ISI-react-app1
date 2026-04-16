# Canonical Env Decisions

Date: 2026-02-11
Status: Approved

This file records the decision history behind the current env model. For active runtime rules and the live port contract, use `docs/environment/reference/ENV.md`.

## 1) Canonical Keys

- Database connection: `DATABASE_URL`
- API port: `API_PORT`
- Public API base: `API_BASE_URL`
- Frontend API base: `VITE_API_BASE_URL`

Deprecated aliases (read-only compatibility window):

- `VITE_API_URL` -> `VITE_API_BASE_URL`
- provider-injected `PORT` -> runtime fallback only when `API_PORT` is absent
- `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_PORT` -> `DATABASE_URL`

## 2) Port Contract

- `API_PORT` is the backend listen port, not the browser entrypoint.
- `API_BASE_URL` and `VITE_API_BASE_URL` must resolve to the public frontend edge origin.
- Local/native dev:
  - Browser entrypoint: `http://localhost:5173`
  - Direct backend diagnostics: `http://localhost:3001`
- Docker dev:
  - Sole browser entrypoint: `http://localhost:3000`
  - Backend keeps `API_PORT=3001` internally and does not publish local machine port `3001`

## 3) Canonical File Locations By Workflow

### Local/native dev

- Private backend/database source: `/.env`
- Public frontend source: `app/.env.local` (`VITE_*` only)

### Docker dev

- Single source: `infrastructure/environments/.env.docker`
- `backend` resolves `DATABASE_URL` from this source

### Deployed environments

- Runtime source: secret manager injection (not committed)
- Committed templates only:
  - `infrastructure/environments/.env.development.example`
  - `infrastructure/environments/.env.staging.example`
  - `infrastructure/environments/.env.production.example`

## 4) Precedence Policy

1. Explicit process env injected by shell/CI/runtime
2. Canonical workflow env file
3. `.example` templates (never runtime inputs)

## 5) Frontend Policy (Vite)

- Frontend env files (`app/.env.local`, `app/.env.example`, mode files) may contain only `VITE_*` keys.
- Backend/database/infrastructure keys are forbidden in app env files.

## 6) Database Naming Policy

- Canonical database name is `ticketdb`.
- All committed `DATABASE_URL` examples and compose templates must target `/ticketdb`.

## 7) Migration Window Notes

- Code may continue to read deprecated aliases temporarily.
- No new file should write deprecated aliases.
- Documentation and templates must use canonical names only.

