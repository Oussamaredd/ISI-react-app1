# Ticket Management System

Monorepo with four active layers and a shared utilities area:
- **app** – Vite + React 18 frontend.
- **api** – NestJS 10 backend using Drizzle ORM.
- **database** – Drizzle schema, migrations, and DB helpers.
- **infrastructure** – Docker compose + ops scripts.
- **shared** – Cross-cutting types/utilities (future use).

Legacy Express code has been removed to avoid confusion.

## Project Structure
```
react-app1/
├── app/             # Frontend workspace
├── api/             # NestJS backend
├── database/        # Drizzle schema + migrations
├── infrastructure/  # Docker, env bootstrap, health checks
├── shared/          # Shared code (placeholder)
├── docs/            # Project docs
└── .github/         # CI/CD
```

## Getting Started
```bash
npm install
cp api/.env.example api/.env
cp database/.env.example database/.env
npm run dev
```

Default ports:
- Frontend: http://localhost:5173
- API: http://localhost:3001/api
- Health: http://localhost:3001/api/health

Root `dev` builds the database package first, then starts Vite and Nest concurrently.

## Scripts (root)
- `npm run dev` – Build database, start frontend + API watchers.
- `npm run build` – Build database, frontend, API.
- `npm run test` – Run frontend + API test suites.
- `npm run lint` – Lint frontend.
- `npm run typecheck` – Typecheck app, api, and database.
- `npm run db:migrate` – Run Drizzle migrations (database workspace).
- `npm run db:generate` – Generate SQL from schema (database workspace).

Run any workspace script directly: `npm run <script> --workspace=<workspace-name>`.

## Layer Notes
- **app**: Vite entry points for landing/app modes; env files `.env.app`, `.env.landing`, `.env.local`.
- **api**: Uses `DatabaseModule` to consume shared Drizzle client; validation via `class-validator`/Zod.
- **database**: `drizzle-kit` config, SQL migrations under `migrations/`; includes `migrations/legacy` for historical reference.
- **infrastructure**: Docker compose files, health-check scripts.

## CI/CD
GitHub Actions run lint/test/build per workspace and publish artifacts. See `.github/workflows` for specifics.

## Next Steps
- Flesh out domain modules (hotels, metrics, admin) inside `api`.
- Replace placeholder auth with Google OAuth + sessions.
- Expand shared utilities in `shared/` and add infra smoke tests.
