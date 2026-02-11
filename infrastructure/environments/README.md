# Infrastructure Environment Files

## Canonical Files

- `.env.docker` (private runtime, docker-dev source)
- `.env.docker.example` (committed docker-dev template)
- `.env.development.example` (committed deploy-dev template)
- `.env.staging.example` (committed deploy-staging template)
- `.env.production.example` (committed deploy-prod template)

## Rules

- Runtime secret values are injected by environment/secret manager.
- `.example` files are templates only and must not contain real secrets.
- Docker compose core commands must pass:
  - `--env-file infrastructure/environments/.env.docker`

## Database Policy

- Canonical DB env key is `DATABASE_URL`.
- Canonical DB name is `ticketdb`.
- Docker network DB host is `ticket_db`.

## Frontend Separation

Frontend env keys stay in `app/.env.local` / `app/.env.example` and must be `VITE_*` only.