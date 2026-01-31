# Project Documentation

This folder contains the living docs for the monorepo. The focus is on actionable commands for developing, testing, building, and deploying the stack.

## Structure
- `ENVIRONMENT_SETUP.md` – how to create `.env` files for app/api/database/infrastructure.
- `ENV.md` – environment variable reference.
- `DOCKER_SETUP.md` – running the stack with Docker Compose.
- `ARCHITECTURE_OVERVIEW.md`, `architecture/` – high‑level design notes.
- `features/` – feature guides (Dashboard, Advanced Ticket List, Ticket Details).
- `FRONTEND_ROUTES.md` – routing map for the frontend app.

## Command Cheat‑Sheet (root unless noted)

### Install
```bash
npm install
```

### Local development
```bash
npm run dev                       # builds database package then runs app + api together
npm run dev --workspace=react-app1-app
npm run dev --workspace=react-app1-api
```

### Testing
```bash
npm run test                      # runs app + api test suites
npm run test --workspace=react-app1-app
npm run test --workspace=react-app1-api
```

### Build & typecheck
```bash
npm run build                     # builds database schema artifacts, frontend, and api
npm run build --workspace=react-app1-app
npm run build --workspace=react-app1-api
npm run build --workspace=react-app1-database
npm run typecheck --workspace=react-app1-app
npm run typecheck --workspace=react-app1-api
npm run typecheck --workspace=react-app1-database
```

### Database tooling
```bash
npm run db:generate --workspace=react-app1-database   # generate drizzle/sql artifacts
npm run db:migrate  --workspace=react-app1-database   # apply migrations
```

### Production / preview
```bash
npm run build
npm run start  --workspace=react-app1-api              # serve compiled API
npm run preview --workspace=react-app1-app -- --host   # serve built frontend statically
```

### Infrastructure (Docker Compose)
```bash
npm run docker:dev  --workspace=react-app1-infrastructure   # bring up stack
npm run docker:down --workspace=react-app1-infrastructure   # stop stack
npm run health     --workspace=react-app1-infrastructure    # quick health check script
```

## Quick links
- Frontend: `app/src` (workspace name `react-app1-app`)
- API: `api/src` (workspace name `react-app1-api`)
- Database package: `database/` (workspace name `react-app1-database`)
- Infrastructure & compose files: `infrastructure/` (workspace name `react-app1-infrastructure`)
- Environment examples: `.env.example`, `app/.env.example`, `api/.env.example`, `database/.env.example`

Keep these docs minimal and accurate—trim obsolete notes as the code changes.
