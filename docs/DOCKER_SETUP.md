# Docker Setup

## Commands (run from repo root)
```bash
npm run docker:dev  --workspace=react-app1-infrastructure   # start stack
npm run docker:down --workspace=react-app1-infrastructure   # stop stack
npm run health     --workspace=react-app1-infrastructure    # quick health script
```

Direct compose:
```bash
docker compose -f infrastructure/docker-compose.yml up -d
docker compose -f infrastructure/docker-compose.yml down
```

## What comes up
1) **PostgreSQL** on 5432 (container `db`), seeded via `database/migrations/legacy/001_initial_schema.sql` if mounted.  
2) **API** on 3001 (container `backend`), built from `api/`, reads `API_PORT` and `DATABASE_URL`.  
3) **Frontend** on 3000 (host) → 80 (container), built from `app/`.  
4) **Optional observability**: Elasticsearch/Logstash/Kibana (profile `obs`) and Prometheus/Grafana (profile `quality`).

## Environment for Docker
Create or edit `.env.docker`:
```
API_PORT=3001
DATABASE_URL=postgres://postgres:postgres@db:5432/tickets
SESSION_SECRET=changeme-session
JWT_SECRET=changeme-jwt
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ticketdb
```

## Quick troubleshooting
```bash
docker compose -f infrastructure/docker-compose.yml ps
docker compose -f infrastructure/docker-compose.yml logs -f backend
docker compose -f infrastructure/docker-compose.yml logs -f db
```
- If DB fails, confirm `database/migrations/legacy/001_initial_schema.sql` exists.
- For a clean restart: `docker compose -f infrastructure/docker-compose.yml down -v && npm run docker:dev --workspace=react-app1-infrastructure`.
