# Environment Setup Guide

This guide uses the canonical env architecture and strict frontend/backend separation.

## Workflow Mapping

| Workflow | Canonical source | Notes |
| --- | --- | --- |
| host-dev | `/.env` + `app/.env.local` | `app/.env.local` must contain only `VITE_*` keys |
| docker-dev | `infrastructure/environments/.env.docker` | Used by compose core profile with `--env-file` |
| deploy-dev | secret-manager injection | Use committed template `.env.development.example` |
| deploy-staging | secret-manager injection | Use committed template `.env.staging.example` |
| deploy-prod | secret-manager injection | Use committed template `.env.production.example` |

## Precedence Rules

1. Explicit process env
2. Canonical workflow env file
3. `.example` templates (never runtime inputs)

## Host/Native Setup

```bash
cp .env.example .env
cp app/.env.example app/.env.local
```

Optional service-scoped local files:

```bash
cp api/.env.example api/.env
```

## Docker Setup

```bash
cp infrastructure/environments/.env.docker.example infrastructure/environments/.env.docker
npm run infra:up
```

## Deployed Environments

Do not commit runtime secrets. Inject values at runtime from secret manager.

Templates to keep in source control:

- `infrastructure/environments/.env.development.example`
- `infrastructure/environments/.env.staging.example`
- `infrastructure/environments/.env.production.example`

## Canonical Keys

- `DATABASE_URL`
- `API_PORT`
- `VITE_API_BASE_URL`

## OAuth Callback Requirements

- Canonical callback URI for local and Docker dev:
  - `http://localhost:3001/api/auth/google/callback`
- `GOOGLE_CLIENT_ID` must be a Google OAuth Web client ID in this format:
  - `<numeric-project-id>-<client>.apps.googleusercontent.com`
- Set `GOOGLE_CALLBACK_URL` to the canonical callback URI in runtime env files.
- Google Cloud Console Authorized redirect URI must match exactly:
  - scheme + host + port + path
  - expected path: `/api/auth/google/callback`

Deprecated aliases:

- `VITE_API_URL` -> `VITE_API_BASE_URL`
- `PORT` -> `API_PORT`
- `DB_*` -> `DATABASE_URL`

## Validation Commands

```bash
npm run db:migrate --workspace=ecotrack-database
npm run build
npm run test
```
