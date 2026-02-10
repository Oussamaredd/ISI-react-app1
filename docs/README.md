# Project Documentation

This folder contains active documentation for the four-layer monorepo.

## Primary Docs
- `ARCHITECTURE_OVERVIEW.md` - architecture contract and dependency rules
- `ENVIRONMENT_SETUP.md` - local and Docker setup workflow
- `ENV.md` - environment variable reference
- `DOCKER_SETUP.md` - Docker Compose startup and migration flow
- `API_DOCUMENTATION.md` - API endpoints and behavior
- `FRONTEND_ROUTES.md` - frontend route map
- `features/` - feature-specific notes

## Root Command Cheat Sheet

Install:
```bash
npm install
```

Develop:
```bash
npm run dev
npm run dev --workspace=react-app1-app
npm run dev --workspace=react-app1-api
```

Quality gates:
```bash
npm run lint
npm run typecheck
npm run test
```

Database lifecycle:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:migrate:seed
```

Infrastructure lifecycle:
```bash
npm run infra:up
npm run infra:health
npm run infra:down
```

## Workspace References
- Frontend: `app/` (`react-app1-app`)
- API: `api/` (`react-app1-api`)
- Database: `database/` (`react-app1-database`)
- Infrastructure: `infrastructure/` (`react-app1-infrastructure`)

Keep docs aligned with the repository command surface and architecture gates. Remove outdated command examples when behavior changes.
