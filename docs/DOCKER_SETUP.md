# Docker Setup

## Commands (run from repo root)
```bash
npm run infra:up      # start db + migrate + backend + frontend
npm run infra:down    # stop core services
npm run infra:health  # quick health check script
```

Direct compose:
```bash
docker compose -f infrastructure/docker-compose.yml --profile core up --build -d
docker compose -f infrastructure/docker-compose.yml --profile core down --remove-orphans
```

## What comes up
1) **PostgreSQL** on 5432 (container `ticket_db`).
2) **Migration step** (container `ticket_migrate`) that runs `infrastructure/scripts/migrate.sh up`.
3) **API** on 3001 (container `ticket_backend`) only after migration succeeds.
4) **Frontend** on 3000 (container `ticket_frontend`) after backend becomes healthy.
5) **Optional observability**: Elasticsearch/Logstash/Kibana (profile `obs`) and Prometheus/Grafana (profile `quality`).

## Environment for Docker
Core compose runtime uses `infrastructure/environments/.env.docker`.

Create or edit `infrastructure/environments/.env.docker`:
```dotenv
API_PORT=3001
DATABASE_URL=postgres://postgres:postgres@db:5432/ticketdb
SESSION_SECRET=changeme-session
JWT_SECRET=changeme-jwt
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ticketdb
MIGRATE_COMMAND=npm run db:migrate --workspace=react-app1-database
ENABLE_SEED_DATA=false
SEED_COMMAND=npm run db:seed --workspace=react-app1-database
```

If you still have a legacy root `.env.docker`, copy it to `infrastructure/environments/.env.docker`.

## Running migrations explicitly (PowerShell + Linux/macOS)
Workspace scripts from repo root:
```bash
npm run migrate:up --workspace=react-app1-infrastructure
npm run migrate:up:seed --workspace=react-app1-infrastructure
npm run migrate:status --workspace=react-app1-infrastructure
```

Direct compose equivalents (all run inside migration container):
```bash
docker compose -f infrastructure/docker-compose.yml --profile core run --build --rm -e ENABLE_SEED_DATA=false migrate
docker compose -f infrastructure/docker-compose.yml --profile core run --build --rm -e ENABLE_SEED_DATA=true -e "SEED_COMMAND=npm run db:seed --workspace=react-app1-database" migrate
docker compose -f infrastructure/docker-compose.yml --profile core run --rm migrate sh -c "./infrastructure/scripts/migrate.sh status"
```

`infrastructure/scripts/migrate.sh` is an in-container command used by the `migrate` service; standard host workflow should call compose.

## Acceptance flow and expected states
Run from repo root:
```bash
docker compose -f infrastructure/docker-compose.yml --profile core down -v --remove-orphans
docker compose -f infrastructure/docker-compose.yml --profile core config
docker compose -f infrastructure/docker-compose.yml --profile core up -d --build
docker compose -f infrastructure/docker-compose.yml --profile core ps
docker inspect -f "{{.State.Status}} {{.State.ExitCode}}" ticket_migrate
docker compose -f infrastructure/docker-compose.yml --profile core logs backend --tail=200
curl -fsS http://localhost:3001/api/health
```

Expected core state:
- `ticket_db` is `healthy`
- `ticket_migrate` is `exited 0`
- `ticket_backend` stays up and becomes `healthy`

## Quick troubleshooting
```bash
docker compose -f infrastructure/docker-compose.yml ps
docker compose -f infrastructure/docker-compose.yml logs -f migrate
docker compose -f infrastructure/docker-compose.yml logs -f backend
docker compose -f infrastructure/docker-compose.yml logs -f db
```
- If backend is not starting, check `ticket_migrate` exit code first.
- If needed, run migration manually with `docker compose -f infrastructure/docker-compose.yml --profile core run --build --rm -e ENABLE_SEED_DATA=false migrate`.
- For a clean restart: `docker compose -f infrastructure/docker-compose.yml --profile core down -v && npm run infra:up`.
