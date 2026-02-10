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
Create or edit `.env.docker`:
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

## Running migrations explicitly
From repo root (Linux/macOS shell):
```bash
ENABLE_SEED_DATA=false ./infrastructure/scripts/migrate.sh up
ENABLE_SEED_DATA=true SEED_COMMAND="npm run db:seed --workspace=react-app1-database" ./infrastructure/scripts/migrate.sh up
```

Cross-platform alternative (runs inside migration container):
```bash
docker compose -f infrastructure/docker-compose.yml --profile core run --build --rm -e ENABLE_SEED_DATA=false migrate
docker compose -f infrastructure/docker-compose.yml --profile core run --build --rm -e ENABLE_SEED_DATA=true -e "SEED_COMMAND=npm run db:seed --workspace=react-app1-database" migrate
```

## Quick troubleshooting
```bash
docker compose -f infrastructure/docker-compose.yml ps
docker compose -f infrastructure/docker-compose.yml logs -f migrate
docker compose -f infrastructure/docker-compose.yml logs -f backend
docker compose -f infrastructure/docker-compose.yml logs -f db
```
- If backend is not starting, check `ticket_migrate` exit code first.
- If needed, run migration manually with `./infrastructure/scripts/migrate.sh up`.
- For a clean restart: `docker compose -f infrastructure/docker-compose.yml --profile core down -v && npm run infra:up`.
