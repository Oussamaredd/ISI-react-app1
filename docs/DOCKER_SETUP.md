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
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile obs up -d --build
```

Workspace wrappers:

```bash
npm run infra:up
npm run infra:down
npm run infra:health
npm run smoke-test
```

`npm run infra:health` exits non-zero if Docker is unreachable or any core service is unhealthy.
`npm run smoke-test` validates the strict Docker single-entrypoint contract and the OAuth callback path on the `3000` edge.

## Expected Core State

- `ticket_db`: healthy
- `ticket_backend`: healthy
- `ticket_frontend`: healthy

## Port Contract

- Browser-facing entrypoint: `http://localhost:3000`
- Browser-facing API: `http://localhost:3000/api`
- Backend keeps `API_PORT=3001` internally on the Docker network only
- Local machine port `3001` should remain closed during Docker dev; if it is reachable, the single-entrypoint contract is broken
- Backend liveness/readiness checks run inside the backend container on `http://localhost:3001/health` and `http://localhost:3001/api/health/ready`

## Migration Commands

```bash
npm run db:migrate --workspace=ecotrack-database
npm run db:seed --workspace=ecotrack-database
npm run db:migrate:seed --workspace=ecotrack-database
```

## Policy

- `backend` consumes `DATABASE_URL` from `.env.docker`.
- Compose DB host is `ticket_db`.
- Canonical DB name is `ticketdb`.
- No credential values should be hardcoded in compose service definitions.
- `.env.docker` must use canonical keys only; deprecated aliases such as `CLIENT_ORIGIN` fail validation.

## Realtime Transport Edge Policy

- WebSocket upgrade requests must pass through proxy/load balancer for path `/api/planning/ws`.
- Long-lived HTTP connections must be allowed for SSE path `/api/planning/stream`.
- Recommended proxy idle timeout for realtime routes: at least `60s` (higher in production).
- CORS origin policy for WS and SSE must match `CORS_ORIGINS`.
