# Project Documentation

Documentation is split by purpose so day-to-day navigation stays predictable.

## Start Here
- `../README.md` - repository quick start and canonical command surface
- `ARCHITECTURE_OVERVIEW.md` - layer boundaries and architecture contract
- `ENVIRONMENT_SETUP.md` - host/Docker/deploy environment setup

## Environment and Configuration
- `ENV.md` - canonical env model and key policies
- `ENV_INVENTORY.md` - env variable inventory
- `ENV_CONFLICTS.md` - conflict matrix and normalization notes
- `ENV_CANONICAL_DECISIONS.md` - canonicalization decisions
- `SECURITY.md` - secret management and leakage safeguards

## Runtime and Operations
- `DOCKER_SETUP.md` - compose workflow and expected service states
- `ELK.md` - observability stack notes
- `runbooks/OAUTH_CALLBACK_REMEDIATION.md` - OAuth callback incident/remediation runbook

## Product and API
- `API_DOCUMENTATION.md` - API contract and examples
- `FRONTEND_ROUTES.md` - route map
- `features/` - feature-level behavior notes

## Historical Baselines
- `baselines/` - captured validation outputs used during remediation phases

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

Validate:
```bash
npm run lint
npm run typecheck
npm run test
npm run validate-env:all
```

Database:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:migrate:seed
```

Infrastructure:
```bash
npm run infra:up
npm run infra:health
npm run infra:down
```

## Maintenance Rules
- Keep docs aligned with the current command surface and env policies.
- Prefer updating existing pages over creating duplicates.
- Keep incident-specific execution plans in `docs/runbooks/`.
