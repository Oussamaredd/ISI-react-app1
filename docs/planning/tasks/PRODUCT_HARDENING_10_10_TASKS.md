# Product Hardening Tasks - 10/10 Development Scope

Last updated: 2026-03-28

## Objective

This task tracker turns EcoTrack from "feature-complete and stable" into a repo with release-quality gates, measurable UX quality, stronger regression depth, and better day-2 maintainability without expanding into Cyber-Security, Data-Science, or deferred platform work.

## Scope Guardrails

- Stay inside `Development` specialty only.
- Keep the current hosted monolith baseline: Cloudflare Pages + Render + Neon + GitHub Actions.
- Do not activate `DEFERRED_PLATFORM` items such as broad Terraform, Ansible, Kubernetes manifests, Helm, or ArgoCD.
- Do not pull in Cyber-Security or Data-Science workstreams beyond current Development-owned baselines and tests.
- Prefer strengthening what already exists before adding new surface area.

## Related Planning Docs

- `docs/specs/source-of-truth.dev.json`
- `docs/specs/cdc-traceability-matrix.dev.md`
- `docs/planning/roadmaps/ROADMAP.md`
- `docs/planning/roadmaps/PLATFORM_MICRO_ROADMAP.md`
- `docs/operations/runbooks/EXTENDED_QUALITY_GATES.md`
- `docs/operations/runbooks/ACCESSIBILITY_RESPONSIVE_AUDIT.md`
- `docs/operations/runbooks/OBSERVABILITY_AND_RELIABILITY.md`

## Current Audit Baseline

- Development CDC scope is implemented and `npm run validate-specs` passes for all 11 required use cases.
- Root validation baseline is already healthy: lint, typecheck, and test passes were completed in the current implementation cycle.
- `npm run test:coverage` passes, but the quality bar is uneven:
  - app coverage: statements `74.63`, branches `66.17`, functions `74.37`, lines `74.85`
  - current app threshold: statements `60`, branches `55`, functions `60`, lines `60`
  - api coverage: statements `88.20`, branches `71.78`, functions `87.25`, lines `88.12`
  - current api threshold: statements `75`, branches `60`, functions `75`, lines `75`
- Mobile currently has lint, typecheck, and test commands, but no `test:coverage` lane, no coverage thresholds, and lighter screen-level regression depth than app/api.
- Lighthouse quality is not yet a dependable gate:
  - `npm run ci:quality:lighthouse` is disabled unless `ENABLE_LIGHTHOUSE_GATE=1`
  - when forced on, the gate builds successfully but fails because `infrastructure/scripts/ci/run-lighthouse-gate.mjs` shells out to `npx -y @lhci/cli@0.15.1`, which requires runtime package download instead of a repo-owned dependency
- The current frontend build still carries large chunks that are acceptable for functionality but not a 10/10 product bar:
  - `router-vendor`: `1804.77 kB`
  - `index`: `1525.81 kB`
  - `leaflet-src`: `611.06 kB`
  - `query-vendor`: `330.54 kB`
- The current app test suite is broad (`42` files), but mobile coverage is thinner (`15` files) and mostly logic/service oriented rather than full screen-flow coverage.
- The biggest currently measured coverage hotspots are:
  - app: `src/utils/errorHandlers.tsx`, `src/pages/ManagerReportsPage.tsx`, `src/hooks/useTickets.tsx`, `src/hooks/usePlanningRealtimeStream.tsx`
  - api: `src/modules/admin/admin.settings.repository.ts`, `src/modules/routes/planning.service.ts`, `src/modules/monitoring/monitoring.service.ts`, `src/config/validation.ts`

## Definition Of 10/10 For This Repo

EcoTrack is considered "10/10" in Development scope only when all of the following are true:

- correctness: root lint, typecheck, test, env validation, doc sync, and spec validation are green and reliable
- web UX: Lighthouse is runnable from repo-owned dependencies and passes on the canonical URLs with stronger thresholds
- accessibility: keyboard, focus, labeling, status messaging, and screen-reader behavior are validated on the critical web and mobile flows
- performance: initial route shell cost is materially reduced, heavy feature bundles are isolated, and bundle budgets are enforced with realistic release targets
- regression depth: app, mobile, and api all have coverage lanes with meaningful thresholds and critical user journeys are automated
- product polish: loading, empty, retry, offline, and error states are intentionally designed and tested across roles
- maintainability: the repo has one clear task tracker, one clear scorecard, and no fragile quality gate that depends on ad hoc network fetches during CI

## Task 0 - Lock The Quality Baseline

Description:

Make every required quality gate repo-owned, deterministic, and runnable in local and CI contexts without hidden network dependency or optional manual toggles.

- [ ] Add `@lhci/cli` as a repo-owned dependency and stop using dynamic `npx -y` install in `infrastructure/scripts/ci/run-lighthouse-gate.mjs`.
- [ ] Add a mobile `test:coverage` command and a matching Vitest coverage configuration.
- [ ] Add a single repo-root product hardening command that runs the full Development quality bar in a stable order.
- [ ] Write all hardening artifacts to stable `tmp/ci/quality` or `tmp/quality` paths for later review.
- [ ] Make the Lighthouse gate opt-out only for local fallback scenarios, not opt-in by default.

Exit criteria:

- Lighthouse runs from committed dependencies.
- Mobile has a real coverage lane.
- One documented command sequence exists for the full Development quality bar.

## Task 1 - Raise The Regression Bar

Description:

Increase test and coverage strictness to match a release-grade product instead of a merely passing baseline.

- [ ] Raise app coverage thresholds from `60/55/60/60` to at least `80/70/80/80`.
- [ ] Raise api coverage thresholds from `75/60/75/75` to at least `85/70/85/85`.
- [ ] Add mobile coverage thresholds with a minimum target of `80/70/80/80`.
- [ ] Close the measured app hotspots in `errorHandlers`, `ManagerReportsPage`, `useTickets`, and `usePlanningRealtimeStream`.
- [ ] Close the measured api hotspots in `admin.settings.repository`, `planning.service`, `monitoring.service`, and `config/validation`.
- [ ] Expand mobile from logic-heavy tests into screen-flow tests for citizen, agent, and manager journeys.

Exit criteria:

- All three clients/services have enforced coverage thresholds.
- Critical user flows are covered in web, mobile, and api layers.

## Task 2 - Fix Web Performance To Product Grade

Description:

Reduce unnecessary frontend weight and make Core Web Vitals a dependable release signal.

- [ ] Split the current mega-chunks so route shell code, dashboard code, admin code, and mapping code do not travel together.
- [ ] Keep Leaflet and map-heavy logic isolated to the routes that need it.
- [ ] Review vendor chunking so router/query/common app shell dependencies are sized for a hosted SPA, not just for build success.
- [ ] Tighten Lighthouse thresholds to at least `performance 0.90`, `accessibility 0.95`, `best-practices 0.95`, `seo 0.90`.
- [ ] Add a documented target for initial route shell transfer size and hold the build to it.
- [ ] Keep the existing bundle-budget gate but evolve it from "entry chunk exists under broad cap" to route-aware product budgets.

Exit criteria:

- Lighthouse runs and passes on `/`, `/login`, and `/app/dashboard`.
- Initial-route JS cost is materially lower than the current baseline.
- Map features do not dominate the default route shell.

## Task 3 - Harden Accessibility And UX Edge States

Description:

Move from "mostly works" to deliberate accessible product behavior across both web and mobile.

- [ ] Audit keyboard-only navigation, focus order, and escape paths on landing, login, dashboard, planning, reports, and admin settings.
- [ ] Standardize async loading, empty, error, retry, and success-state patterns across app screens and mobile screens.
- [ ] Ensure every critical form has stable labels, actionable validation copy, and non-visual error/status communication.
- [ ] Expand mobile accessibility beyond shell components into workflow screens, action buttons, alerts, and map-adjacent actions.
- [ ] Add automated checks where feasible and preserve a short manual audit checklist for role-critical flows.

Exit criteria:

- Critical flows pass an explicit accessibility checklist.
- Async and failure states are consistent across web and mobile.

## Task 4 - Strengthen Mobile Product Readiness

Description:

Bring the mobile app closer to the same maturity bar as the web app rather than treating it as a secondary client.

- [ ] Add mobile screen-level tests for reporting, role routing, manager status visibility, and core account/session behavior.
- [ ] Add a documented production-readiness lane for mobile, including dependency, env, and crash-capture validation.
- [ ] Verify offline, reconnect, and degraded-network behaviors for the highest-value mobile workflows.
- [ ] Confirm Sentry/session tagging and aggregate telemetry are consistent with the web release identifier model.

Exit criteria:

- Mobile has parity on quality gates that matter for a public product.
- Mobile flow regressions are caught before release, not after.

## Task 5 - Tighten API And Contract Confidence

Description:

The API already tests well, but the remaining weak areas should be hardened to protect the whole product.

- [ ] Add deeper tests around admin settings parsing, planning edge cases, monitoring metric rendering branches, and env validation behavior.
- [ ] Expand role-critical API smoke coverage to explicitly exercise degraded and recovery paths, not only success paths.
- [ ] Reduce noisy expected-error logging in tests where it obscures real failures and CI readability.
- [ ] Keep API docs and runtime behavior aligned when adding stronger edge-case coverage.

Exit criteria:

- API weak spots are covered at branch level, not only at happy-path level.
- CI logs stay high-signal when failures occur.

## Task 6 - Make Release Quality Observable And Non-Negotiable

Description:

A 10/10 product needs one visible scorecard so release quality is not based on memory or opinion.

- [ ] Add a repo-owned quality scorecard doc that records the target thresholds for coverage, Lighthouse, smoke, synthetic, and critical flow evidence.
- [ ] Update the definition-of-done checklist to include the hardened quality bar.
- [ ] Ensure CD summaries attach or reference the quality scorecard artifacts for each release candidate.
- [ ] Keep the scorecard explicitly Development-only so it does not pull in Security or Data work.

Exit criteria:

- Release readiness can be evaluated from one documented scorecard.
- The quality bar is enforced by repo scripts, not tribal knowledge.

## Recommended Execution Order

1. Task 0 - lock deterministic quality tooling first.
2. Task 1 - raise regression depth and thresholds second.
3. Task 2 - reduce web performance risk and make Lighthouse blocking.
4. Task 3 - fix accessibility and UX-state consistency.
5. Task 4 - raise mobile parity to the same product bar.
6. Task 5 - close API weak spots and noisy edge-case behavior.
7. Task 6 - publish the scorecard and make the bar release-facing.

## External Best-Practice Anchors

- Core Web Vitals guidance from web.dev: https://web.dev/explore/learn-core-web-vitals
- WCAG 2.2 principles from W3C WAI: https://www.w3.org/WAI/WCAG22/Understanding/intro
- React Native accessibility guidance: https://reactnative.dev/docs/accessibility
- NestJS testing guidance: https://docs.nestjs.com/fundamentals/testing
- React component purity guidance: https://react.dev/learn/keeping-components-pure

## Final Scope Reminder

This plan is intentionally Development-only. It should not be expanded to include:

- Cyber-Security specialty controls beyond current Development-owned tests and runtime baselines
- Data-Science or MLOps work
- deferred platform migration work for self-managed Kubernetes or multi-cloud infrastructure
