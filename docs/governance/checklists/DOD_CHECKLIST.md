# Definition of Done - Development Scope

Last updated: 2026-03-28

This checklist is the release-grade Definition of Done for the current `Development` specialty scope only.

Out of scope for this checklist:

- Cyber-Security specialty deliverables
- Data-Science or MLOps deliverables
- deferred platform migration work

## Blocking Repo Gates

- [ ] `npm run validate-env:all`
- [ ] `npm run validate-doc-sync`
- [ ] `npm run validate-specs`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run validate-sonar-coverage-alignment`
- [ ] `npm run test:e2e`
- [ ] `npm run test:realtime`
- [ ] `npm run test:coverage`
- [ ] `npm run quality:mobile-readiness`
- [ ] `npm run deploy:render:verify-local`
- [ ] `npm run build --workspace=ecotrack-app`
- [ ] `npm run ci:quality:lighthouse`

## Coverage And Regression Bar

- [ ] Web app coverage is at least `80/70/80/80` for statements, branches, functions, and lines.
- [ ] Mobile coverage is at least `80/70/80/80` for statements, branches, functions, and lines.
- [ ] API coverage is at least `85/70/85/85` for statements, branches, functions, and lines.
- [ ] Web critical journeys remain covered by `app/src/tests/e2e.key-journeys.test.tsx`.
- [ ] Web realtime fallback and reconnect remain covered by `npm run test:realtime`.
- [ ] Mobile citizen, agent, manager, login, session, and lifecycle regressions remain covered by the mobile readiness lane.
- [ ] API degraded and recovery paths remain covered by the HTTP smoke and branch-focused tests.

## Accessibility And UX Bar

- [ ] Landing, login, dashboard, planning, reports, and admin settings pass the checklist in `docs/operations/runbooks/ACCESSIBILITY_RESPONSIVE_AUDIT.md`.
- [ ] Mobile login, reporting, agent, manager, and session flows pass the same runbook checklist.
- [ ] Critical forms expose stable labels, validation copy, and non-visual success or failure messaging.
- [ ] Loading, empty, retry, offline, reconnect, and error states are deliberate and tested rather than incidental.

## Performance Bar

- [ ] Lighthouse passes on `/`, `/login`, and `/app/dashboard` with repo-owned dependencies.
- [ ] Route-aware bundle budgets pass for the initial shell, landing, login, dashboard, admin, and mapping chunks.
- [ ] Mapping code stays isolated from the default route shell.

## Mobile Release Bar

- [ ] `npm run quality:mobile-readiness` passes and writes evidence under `tmp/quality/mobile-readiness` or `tmp/ci/quality/mobile-readiness`.
- [ ] `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_ENVIRONMENT`, and `EXPO_PUBLIC_RELEASE_VERSION` remain documented in `mobile/.env.example`.
- [ ] Mobile release tagging, aggregate telemetry, and Sentry session tagging stay aligned with the web release identifier model.

## Release Evidence

- [ ] `npm run ci:release:manifest` produces the release manifest artifact.
- [ ] `npm run ci:release:quality-scorecard` produces the Development-only quality scorecard artifact.
- [ ] Hosted release smoke evidence exists for the target environment.
- [ ] Hosted synthetic monitoring evidence exists for the target environment.
- [ ] CD summaries reference the release scorecard artifact for the current release candidate.

## Docs And Traceability

- [ ] Runtime, env, command-surface, and workflow changes are reflected in `docs/`.
- [ ] The quality policy remains aligned with `docs/governance/QUALITY_SCORECARD.md`.
- [ ] Accessibility and mobile readiness guidance remain aligned with their runbooks.
- [ ] Task trackers only mark work complete when the code, docs, and validation evidence all exist.
