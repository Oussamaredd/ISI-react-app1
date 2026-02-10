# Environment Variables Configuration

This document describes all environment variables used by the application.

## API (NestJS) Environment Variables

Required:
- `API_PORT` - API listen port (default: 3001)
- `DATABASE_URL` - Postgres connection string (`postgres://user:pass@host:port/db`)
- `SESSION_SECRET` - session/CSRF secret
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - token lifetime (for example `7d`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials (if Google login enabled)
- `CORS_ORIGINS` - comma-separated origins (for example `http://localhost:5173`)

## Frontend (Vite) Environment Variables

Required:
- `VITE_API_BASE_URL` - Backend API URL

Optional:
- `VITE_BASE` - Base path for GitHub Pages deployment
- `VITE_DEV_PORT` - Override dev server port

## Docker Compose Variables (infrastructure/)

Canonical env files:
- Local development (non-Docker): `.env` (repo root)
- Docker development: `infrastructure/environments/.env.docker`
- Docker staging: `infrastructure/environments/.env.staging`
- Docker production: `infrastructure/environments/.env.production`

Core compose note:
- `docker compose -f infrastructure/docker-compose.yml --profile core ...` reads `infrastructure/environments/.env.docker` for `migrate` and `backend`.
- Keep `DATABASE_URL` container-safe for compose networking (host `db`).

- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` - PostgreSQL credentials for the DB container
- `DATABASE_URL` - passed to migration and API containers (use `db` host inside compose)
- `API_PORT` - published API port (defaults to 3001)
- `MIGRATE_COMMAND` - migration command source of truth (default: `npm run db:migrate --workspace=react-app1-database`)
- `ENABLE_SEED_DATA` - when `true`, migration scripts run seeders after migrations
- `SEED_COMMAND` - command used by migration scripts to execute seeding (default: `npm run db:seed --workspace=react-app1-database`)

## Docker acceptance expectations

For the core profile (`docker compose -f infrastructure/docker-compose.yml --profile core ...`), expected runtime state is:
- `ticket_db` healthy
- `ticket_migrate` exited with code `0`
- `ticket_backend` healthy

Use the acceptance command sequence in `docs/DOCKER_SETUP.md`.

## Setup Instructions

1. Copy template files:
```bash
cp .env.example .env
cp app/.env.example app/.env.local
cp api/.env.example api/.env
cp database/.env.example database/.env.local
```

2. Replace placeholder values with actual credentials.

3. Never commit actual `.env` files.

## Development vs Production

Local Development:
- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/ticketdb`
- `CORS_ORIGINS=http://localhost:5173`
- `VITE_API_BASE_URL=http://localhost:3001`

Docker Development:
- `DATABASE_URL=postgres://postgres:postgres@db:5432/ticketdb`
- `MIGRATE_COMMAND=npm run db:migrate --workspace=react-app1-database`
- `ENABLE_SEED_DATA=false`
- `SEED_COMMAND=npm run db:seed --workspace=react-app1-database`
- `CORS_ORIGINS=http://localhost:5173,http://localhost:3000`
- `VITE_API_BASE_URL=http://localhost:3001`

Production:
- Use actual domain names
- Enable HTTPS
- Set `NODE_ENV=production`
- Use secure database credentials and secrets
