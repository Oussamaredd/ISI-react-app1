# CORS Origin Management Runbook

Use this runbook to manage browser-origin access for EcoTrack API and realtime WebSocket endpoints.

## Scope

- Applies to API HTTP CORS and planning WebSocket CORS.
- Applies to local dev, docker dev, deploy development, staging, and production.
- Development-only scope: this runbook covers application/runtime configuration and process controls only.

## Phase 1 - Origin Registry (Owner + Purpose + Expiry)

Track active origins in this registry before changing env values.

| Environment | Origin | Purpose | Owner | Expiry (if temporary) | Status |
| --- | --- | --- | --- | --- | --- |
| local-dev | http://localhost:5173 | local frontend dev | dev team | n/a | active |
| docker-dev | http://localhost:3000 | docker frontend dev | dev team | n/a | active |
| deploy-dev | https://ecotrack-jmj.pages.dev | Cloudflare Pages deploy-dev frontend | dev team | n/a | active |
| deploy-staging | https://staging.example.com | pre-prod validation | platform/devops | n/a | template |
| deploy-prod | https://app.example.com | production frontend | platform/devops | n/a | template |

Rules:
- Temporary origins must include owner + expiry date and be removed at expiry.
- Only team-controlled origins are allowed.
- `APP_URL` must match one of `CORS_ORIGINS` entries.
- Current deploy-dev state: the live Render API now returns `Access-Control-Allow-Origin: https://ecotrack-jmj.pages.dev`, and CORS preflights for the Pages origin succeed with credentials enabled.

## Phase 2 - Env and Docs Normalization

Update these files together when origin policy changes:

- `.env.example`
- `infrastructure/environments/.env.docker.example`
- `infrastructure/environments/.env.development.example`
- `infrastructure/environments/.env.staging.example`
- `infrastructure/environments/.env.production.example`
- `docs/ENV.md`

## Phase 3 - Validation Guardrails

Env policy validation enforces:

- no wildcard origins (`*`)
- valid URL format only
- `http/https` schemes only
- no path/query/fragment in origins
- duplicate env keys are rejected
- committed templates reject deprecated aliases
- deploy workflows require HTTPS for non-localhost origins
- `APP_URL` origin must be included in `CORS_ORIGINS`

Validation command:

```bash
npm run validate-env:all
```

## Phase 4 - Runtime Enforcement

API runtime enforces:

- production requires explicit `CORS_ORIGINS`
- origins are normalized and validated before Nest CORS setup
- production origins must be HTTPS (except localhost/127.0.0.1 for controlled local checks)
- the same parsed origin list is reused for HTTP and WebSocket CORS

## Phase 5 - Rollout Sequence

1. Update dev env/templates and verify team workflows.
2. Promote same policy shape to staging and run smoke tests.
3. Promote to production in a change window with rollback-ready previous origin list.

## Phase 6 - Operations and Governance

- Review the origin registry monthly.
- Require PR notes for any origin add/remove change with owner + reason.
- Time-box temporary origins and remove on schedule.

## Verification Checklist

- [ ] `npm run validate-env:all`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] Browser call from allowed origin succeeds (HTTP + WS)
- [ ] Browser call from disallowed origin is blocked by CORS

