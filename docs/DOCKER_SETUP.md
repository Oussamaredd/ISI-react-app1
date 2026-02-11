# Docker Setup

## Canonical Docker Env Source

Compose core profile uses a single canonical env file:

- `infrastructure/environments/.env.docker`

Create it from template:

```bash
cp infrastructure/environments/.env.docker.example infrastructure/environments/.env.docker
```

## Commands (from repo root)

```bash
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core config
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core up -d --build
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core ps
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core down --remove-orphans
```

Workspace wrappers:

```bash
npm run infra:up
npm run infra:down
npm run infra:health
```

## Expected Core State

- `ticket_db`: healthy
- `ticket_migrate`: exited successfully
- `ticket_backend`: healthy
- `ticket_frontend`: running

## Migration Commands

```bash
npm run migrate:up --workspace=react-app1-infrastructure
npm run migrate:up:seed --workspace=react-app1-infrastructure
npm run migrate:status --workspace=react-app1-infrastructure
```

## Policy

- `migrate` and `backend` consume the same `DATABASE_URL` from `.env.docker`.
- Compose DB host is `ticket_db`.
- Canonical DB name is `ticketdb`.
- No credential values should be hardcoded in compose service definitions.