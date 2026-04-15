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
- `ecotrack_redis`: healthy
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
- `backend` consumes `CACHE_REDIS_URL=redis://redis:6379` from `.env.docker` when Redis-backed caching is enabled.
- Compose DB host is `ticket_db`.
- Compose Redis host is `redis`.
- Canonical DB name is `ticketdb`.
- No credential values should be hardcoded in compose service definitions.
- `.env.docker` must use canonical keys only; deprecated aliases such as `CLIENT_ORIGIN` fail validation.
- `DATABASE_POOLER_URL` is optional in Docker dev; leave it blank unless you add a separate PgBouncer container or external pooler.

Runtime image note:

- The repo-owned Docker images now use Debian-based runtime stages for CI release parity: the API image builds from `node:22-bookworm-slim` and the frontend image serves assets from `nginx:stable-bookworm`.
- The API production-dependency stage narrows the workspace install to `api`, `database`, and `infrastructure` so release images do not inherit unrelated app/mobile packages from the monorepo root.
- The API runtime stage strips `npm`, `npx`, `corepack`, and bundled Yarn after the build; runtime health checks and process startup rely on `node` only.
- The frontend runtime stage refreshes the vulnerable Debian security libraries used by `nginx:stable-bookworm` instead of running a blanket distro upgrade, which keeps the image aligned with the repo's `HIGH`/`CRITICAL` vulnerability gate without touching unrelated shell packages.

## Performance Validation

From repo root:

```bash
npm run perf:autocannon -- --url http://localhost:3001/api/health/ready --scenario docker-health
npm run perf:clinic:doctor
npm run perf:pgbench -- --database-url "$DATABASE_URL"
```

Operational notes:

- `perf:clinic:*` expects a built API (`npm run build --workspace=ecotrack-api`).
- `perf:pgbench` targets the direct database URL, not `DATABASE_POOLER_URL`.
- Cloudflare purge automation is not part of the Docker loop; it requires `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_API_TOKEN`.

## Realtime Transport Edge Policy

- WebSocket upgrade requests must pass through proxy/load balancer for path `/api/planning/ws`.
- Long-lived HTTP connections must be allowed for SSE path `/api/planning/stream`.
- Recommended proxy idle timeout for realtime routes: at least `60s` (higher in production).
- CORS origin policy for WS and SSE must match `CORS_ORIGINS`.
