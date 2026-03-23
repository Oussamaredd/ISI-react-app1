# Demo Readiness Runbook

## Goal

Use this checklist to confirm the current EcoTrack implementation is demo-ready.

## Scope Covered

- Citizen flows: report, profile, challenges
- Agent flows: assigned tour, stop validation, anomaly reporting
- Manager flows: planning optimization, emergency trigger, reporting
- Support/Admin flows: support categories, admin settings, audit logs

## Environment Preparation

1. Install dependencies:

```bash
npm ci --include=dev
```

2. Prepare local env files:

```bash
cp .env.example .env
cp app/.env.example app/.env.local
```

3. Validate env templates:

```bash
npm run validate-env:all
```

4. Run DB migrations and seed:

```bash
npm run db:migrate
npm run db:seed
```

5. Start app + api:

```bash
npm run dev
```

## Seeded Manual Test Credentials

After `npm run db:seed`, the seeded manual test accounts are local email/password users. Each uses the same password: `Test!1234`.

- `super_admin`: `a@admin.fr`, `superadmin@example.com`
- `admin`: `admin@example.com`
- `manager`: `manager@example.com`
- `agent`: `test@ecotrack.local`, `agent@example.com`
- `citizen`: `citizen@example.com`

## Validation Gate (Must Pass)

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:coverage
```

## Demo Script (Suggested Order)

1. Citizen submits overflow report (`/app/citizen/report`).
2. Citizen views updated profile and challenge progress (`/app/citizen/profile`, `/app/citizen/challenges`).
3. Agent starts tour and validates a stop (`/app/agent/tour`).
4. Agent reports anomaly and shows alert propagation in activity.
5. Manager runs optimization and assigns tour (`/app/manager/planning`).
6. Manager generates and downloads monthly report (`/app/manager/reports`).
7. Admin opens settings/audit logs and dispatches test notification (`/app/admin`).

## Artifacts to Confirm Before Demo

- Roadmap and sprint status: `docs/ROADMAP.md`
- API references: `docs/API_DOCUMENTATION.md`, `docs/openapi/`
- Accessibility baseline: `docs/runbooks/ACCESSIBILITY_RESPONSIVE_AUDIT.md`
- Role quick guides: `docs/guides/`

