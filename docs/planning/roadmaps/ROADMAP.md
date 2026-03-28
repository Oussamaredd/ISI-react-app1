# EcoTrack Development Roadmap (Dev Scope Only)

Last update: 2026-03-24
Planning horizon: 8 completed delivery sprints, 3 follow-on completion sprints, and the remaining monolith backlog

## 1. Scope and Planning Basis

### Inputs Used
- `docs/specs/inputs/ECOTRACK_CDC_COMMUN_V2.docx`
- `docs/specs/inputs/ECOTRACK_M2_DEV.xlsx`
- `docs/specs/inputs/ECOTRACK_CDC_COMMUN_V2.docx`
- `docs/specs/inputs/ECOTRACK_M2_DEV.xlsx`
- Current repository implementation across `app`, `api`, `database`, `infrastructure`, and `docs`

### In Scope for This Roadmap
- Frontend SPA and mobile-first UX
- Backend API and business logic
- Route planning and operational workflows
- Gamification and user engagement flows
- Support and administration modules
- Test automation, CI/CD, and documentation

### Out of Scope for This Roadmap
- Cyber-Security specialty tracks
- Data Science specialty tracks

## 2. Delivery Rules and Status Legend

### Non-Breaking Delivery Guardrails

The roadmap follows an additive-first strategy so current project logic remains stable while the EcoTrack domain continues to mature.

- Add and polish features without removing working flows during transition.
- Keep current routes and endpoints stable until replacement features are validated and signed off.
- Prefer additive API evolution through new endpoints or versioned namespaces instead of in-place contract breaks.
- Use additive database migrations first and avoid destructive schema changes until cutover plans are approved.
- Keep backward-compatible adapters and aliases while moving from ticket-centric naming to EcoTrack naming.
- Require regression checks such as lint, typecheck, tests, and targeted smoke flows before each merge.
- Treat removals and deprecations as explicit follow-up tasks after parity is reached.

### Status Legend

- `DONE`: implemented and usable now
- `PARTIAL`: implemented, but still not fully aligned with the intended EcoTrack business flow
- `IN_PROGRESS`: actively being delivered
- `TODO`: planned but not started
- `BLOCKED`: cannot move forward until a dependency is cleared
- `TODO_MONOLITH`: still open and must be delivered in the modular-monolith architecture
- `DEFERRED_PLATFORM`: owned by development, but intentionally delayed until the monolith core is stable
- `HANDOFF_SECURITY`: outside the temporary Development-only scope and waiting for Security ownership
- `HANDOFF_DATA`: outside the temporary Development-only scope and waiting for Data ownership

## 3. Current Implementation Baseline

This baseline explains what already exists before looking at sprint history and remaining work.

### Auth Flows and Token Exchange

Status: `DONE`

The platform already supports the account lifecycle needed to enter the application securely.

Evidence:
- `api/src/modules/auth/local-auth.controller.ts`
- `api/src/modules/auth/auth.controller.ts`
- `app/src/pages/auth/LoginPage.tsx`

Checklist:
- [x] Signup, login, reset, and `me` flows exist.
- [x] Token exchange is implemented.
- [x] Frontend authentication screens are wired to the API.

### Protected Routes and Role-Based App Shell

Status: `DONE`

The frontend shell already enforces authenticated navigation and role-aware access patterns.

Evidence:
- `app/src/routes/AppRouter.tsx`
- `app/src/routes/guards/RequireAuth.tsx`

Checklist:
- [x] Protected routes are present.
- [x] Route guards are active.
- [x] Role-based shell behavior is in place.

### Support Ticket Workflows

Status: `DONE`

The ticketing foundation is already operational and remains an important shared product module.

Evidence:
- `api/src/modules/tickets/tickets.controller.ts`
- `app/src/pages/TicketDetails.tsx`
- `app/src/pages/AdvancedTicketList.tsx`

Checklist:
- [x] Ticket CRUD is available.
- [x] Comments are supported.
- [x] Activity history is tracked.

### Admin Center

Status: `DONE`

The application already includes a meaningful admin backoffice for operations and governance.

Evidence:
- `app/src/pages/AdminDashboard.tsx`
- `api/src/modules/admin/admin.users.controller.ts`
- `api/src/modules/admin/admin.settings.controller.ts`

Checklist:
- [x] User administration exists.
- [x] Role administration exists.
- [x] Ticket, settings, and audit areas are available.

### Operational Dashboard

Status: `DONE`

The dashboard foundation is now aligned to EcoTrack-specific operational KPIs, manager heatmap monitoring, and realtime transport behavior.

Evidence:
- `app/src/pages/Dashboard.tsx`
- `app/src/components/dashboard/ManagerHeatmapPanel.tsx`
- `api/src/modules/routes/planning.controller.ts`
- `docs/product/features/Dashboard.md`

Checklist:
- [x] Dashboard foundation exists.
- [x] Operational metrics endpoints exist.
- [x] EcoTrack domain alignment and realtime monitoring are live.

### Health and Metrics Endpoints

Status: `DONE`

The service exposes technical health and monitoring endpoints, and the monolith observability hardening backlog is now closed through repo-owned metrics, runbooks, synthetic checks, and SLO instrumentation.

Evidence:
- `api/src/modules/health/health.controller.ts`
- `api/src/modules/monitoring/monitoring.controller.ts`

Checklist:
- [x] Health endpoints exist.
- [x] Monitoring endpoints exist.
- [x] Full monolith observability hardening is complete.

### CI/CD and Quality Gates

Status: `DONE`

Build and deployment automation are already present and were later extended by sprint work.

Evidence:
- `.github/workflows/CI.yaml`
- `.github/workflows/CD.yml`

Checklist:
- [x] CI workflow exists.
- [x] CD workflow exists.
- [x] Quality gates are part of the delivery process.

### EcoTrack Domain Modules

Status: `DONE`

Core EcoTrack modules already exist in the codebase and are no longer just roadmap targets.

Evidence:
- `api/src/app.module.ts`
- `app/src/routes/AppRouter.tsx`
- `database/schema/index.ts`

Checklist:
- [x] Containers are represented in the stack.
- [x] Zones are represented in the stack.
- [x] Tours are represented in the stack.
- [x] Citizen reports are represented in the stack.
- [x] Gamification is represented in the stack.

## 4. Completed Product Delivery Sprints

### Sprint Progress Snapshot

- Sprint 0: `DONE` - domain framing, API surface, and role alignment completed
- Sprint 1: `DONE` - citizen reporting, profile, and challenge flows completed
- Sprint 2: `DONE` - absorbed as a buffer and stabilization phase with no separate story set in the current board
- Sprint 3: `DONE` - agent mobile-first tour execution completed
- Sprint 4: `DONE` - manager planning and near-realtime monitoring completed
- Sprint 5: `DONE` - support, admin, and gamification alignment completed
- Sprint 6: `DONE` - reporting and quality hardening completed
- Sprint 7: `DONE` - documentation and release-readiness completed

### Sprint 0 - Domain Framing and API Contracts

Phase status: `DONE`

Sprint 0 established the shared language of the product. The main outcome was a stable EcoTrack domain model, a documented API surface, and a role model that the UI and API could enforce consistently.

Exit result:
- [x] Approved domain model
- [x] API contract draft
- [x] Role mapping aligned with citizen, agent, manager, and admin use

#### US-DEV-001: EcoTrack Domain Model

Status: `DONE`

Description: As a product team, we need core EcoTrack entities so all modules share the same business language.

Progress: Domain entities, schema, API layers, DTOs, and seed fixtures were delivered additively without breaking current flows.

Spec refs: `7.1`, `10.1`
Workbook refs: `M1.1`, `M1.9`, `M2.9`

Checklist:
- [x] Define and validate the shared glossary for `Container`, `Zone`, `Tour`, `TourStop`, `CitizenReport`, `CollectionEvent`, and `GamificationProfile`.
- [x] Add schema changes and migrations for development-owned OLTP needs.
- [x] Create API modules following `controller -> service -> repository`.
- [x] Add DTOs and validation rules for all new entities.
- [x] Add seed fixtures for local and demo environments.

#### US-DEV-002: EcoTrack API Contract Surface

Status: `DONE`

Description: As frontend and integration teams, we need a stable API contract for all core flows.

Progress: OpenAPI coverage, pagination and filtering rules, error payload conventions, and critical contract tests were added.

Spec refs: `5.2`, `10.1`
Workbook refs: `M1.13`, `M14.1`

Checklist:
- [x] Publish OpenAPI sections for auth, containers, zones, tours, analytics summary, and gamification.
- [x] Add pagination and filtering conventions for list endpoints.
- [x] Define consistent error payloads and request-id propagation.
- [x] Add API contract tests for critical endpoints.

#### US-DEV-003: Role Model Alignment for EcoTrack Users

Status: `DONE`

Description: As an admin, I need roles aligned to citizen, agent, manager, and admin usage.

Progress: Route-level citizen, agent, manager, and admin enforcement is now backed by explicit authorization helpers.

Spec refs: `3.2`, `4.1` to `4.4`, `5.1`
Workbook refs: `M5.6`

Checklist:
- [x] Keep existing RBAC and protected route foundations.
- [x] Map current roles to the EcoTrack role matrix.
- [x] Align permission names with EcoTrack modules.
- [x] Update the admin role-assignment UX for the new role model.

### Sprint 1 - Citizen Experience Foundations

Phase status: `DONE`

Sprint 1 focused on the citizen side of the product. It turned the domain model into user-facing reporting, visibility, and engagement flows so citizens can contribute data and track their impact.

Exit result:
- [x] End-to-end citizen report flow is live
- [x] Citizen history and impact view is live
- [x] Challenge participation and progress tracking are live

#### US-DEV-101: Citizen Overflow Report

Status: `DONE`

Description: As a citizen, I can report an overflowing container with location and an optional photo.

Progress: The report flow, duplicate-prevention rules, geolocation capture, and confirmation state are implemented.

Spec refs: `UC-C01`, `10.1`
Workbook refs: `M2.8`, `M5.2`

Checklist:
- [x] Implement the `CitizenReport` creation flow in API and UI.
- [x] Add duplicate-report prevention for the same container and time window.
- [x] Store timestamp and geolocation on each report.
- [x] Add a confirmation state after report submission.

#### US-DEV-102: Citizen Profile, History, and Impact

Status: `DONE`

Description: As a citizen, I can view report history, points, badges, leaderboard position, and personal impact.

Progress: Citizen profile and history APIs are live, and the UI now exposes impact and gamification widgets.

Spec refs: `UC-C02`, `5.2`
Workbook refs: `M5.2`, `M5.11`

Checklist:
- [x] Build the citizen profile page with a history timeline.
- [x] Add summary widgets for points, badges, and leaderboard position.
- [x] Add personal impact metrics.
- [x] Add API endpoints for profile and history queries.

#### US-DEV-103: Collective Challenges

Status: `DONE`

Description: As a citizen, I can join and track collective challenges.

Progress: The challenge catalog, enrollment flow, progress tracking, and reward computation are complete and exposed through the citizen experience.

Spec refs: `UC-C03`, `5.2`
Workbook refs: `M5.2`, `M14.7`

Checklist:
- [x] Create the challenge catalog endpoint and UI.
- [x] Implement challenge enrollment and participation tracking.
- [x] Compute challenge results and rewards.
- [x] Expose challenge progress in the citizen profile.

### Sprint 2 - Buffer and Integration Stabilization

Phase status: `DONE`

Sprint 2 no longer carries a separate story set in the current board. In practice, it behaved as a stabilization window between the citizen foundation work and the mobile-first agent operations work.

Progress note:
- [x] Close citizen follow-up adjustments before agent work scaled up.
- [x] Prepare shared domain and route-planning dependencies for Sprint 3.
- [x] Keep the sprint reserved as delivery slack rather than opening a new feature front.

### Sprint 3 - Agent Mobile-First Operations

Phase status: `DONE`

Sprint 3 delivered the operational field workflow for agents. The emphasis was a mobile-first interface that lets agents receive tours, validate collections, and report anomalies without leaving the active run.

Exit result:
- [x] Agents can receive and start tours
- [x] Stop validation is operational
- [x] Tour anomalies can be reported and surfaced back to managers

#### US-DEV-201: Daily Tour Reception

Status: `DONE`

Description: As an agent, I can receive and start my optimized daily tour from a mobile-first interface.

Progress: The agent tour page, itinerary map, tour start action, and mobile-first behavior are implemented.

Spec refs: `UC-A01`, `9.1`
Workbook refs: `M5.4`, `M5.9`

Checklist:
- [x] Build the agent tour page with ordered stops and ETA.
- [x] Add map itinerary rendering for the active tour.
- [x] Add the start-tour action and live tour state transitions.
- [x] Ensure mobile-first responsive behavior.

#### US-DEV-202: Collection Validation at Stop

Status: `DONE`

Description: As an agent, I can validate a collection at each stop with volume information.

Progress: Stop validation endpoints and UI actions are live, including QR fallback, persisted collection events, and auto-advance behavior.

Spec refs: `UC-A02`
Workbook refs: `M5.4`, `M5.9`

Checklist:
- [x] Add stop-validation API and UI actions.
- [x] Add QR scan fallback to manual selection.
- [x] Persist volume, timestamp, actor, and position.
- [x] Auto-advance to the next stop after validation.

#### US-DEV-203: Agent Anomaly Report

Status: `DONE`

Description: As an agent, I can report anomalies encountered during a tour.

Progress: Anomaly catalogs, anomaly reporting, manager alert events, and tour activity integration are complete.

Spec refs: `UC-A03`
Workbook refs: `M5.4`

Checklist:
- [x] Add the anomaly type catalog.
- [x] Add anomaly reporting with comments and optional photo.
- [x] Trigger a manager-facing alert event.
- [x] Include the anomaly in tour activity history.

### Sprint 4 - Manager Planning and Monitoring

Phase status: `DONE`

Sprint 4 shifted attention to managerial control. It delivered route planning, assignment, and near-realtime monitoring so operations leadership can actively manage the collection network.

Exit result:
- [x] Managers can create and assign tours
- [x] Managers can monitor operational state and critical alerts

#### US-DEV-301: Create Optimized Tour

Status: `DONE`

Description: As a manager, I can create a tour by zone and fill-rate threshold and run optimization.

Progress: The creation wizard, nearest-neighbor plus 2-opt optimization, route adjustment, and assignment workflow are implemented.

Spec refs: `UC-G01`, `5.2`, `10.1`
Workbook refs: `M2.15`, `M5.9`

Checklist:
- [x] Build the tour-creation wizard for date, zone, threshold, and candidate containers.
- [x] Implement the optimization service with an initial heuristic and later tuning.
- [x] Show route order, distance, duration, and manual adjustments.
- [x] Add assignment workflow to an agent user.

#### US-DEV-302: Real-Time Manager Dashboard

Status: `DONE`

Description: As a manager, I can monitor container states and critical alerts in real time.

Progress: Planning and dashboard polling now drive near-realtime monitoring, and live freshness indicators are visible in the UI.

Spec refs: `UC-G02`, `5.1`, `5.2`
Workbook refs: `M5.1`, `M3.5`

Checklist:
- [x] Keep the existing dashboard and KPI foundation.
- [x] Cut over manager planning responses to EcoTrack KPIs while retaining support-ticket dashboards in the support module.
- [x] Add a container-state map and critical thresholds.
- [x] Add an emergency collection trigger flow.

### Sprint 5 - Shared Product Module Alignment

Phase status: `DONE`

Sprint 5 aligned the shared modules that support the main citizen, agent, and manager flows. The result was a cleaner EcoTrack vocabulary across support, admin, and gamification.

Exit result:
- [x] Support terminology and navigation are aligned
- [x] Admin tools cover EcoTrack settings and oversight
- [x] Gamification is connected to the citizen experience

#### US-DEV-401: Support Module Alignment

Status: `DONE`

Description: As operations users, we keep a support module with tickets, FAQ, and chat support aligned with EcoTrack terminology.

Progress: EcoTrack support categories and aliases were added, FAQ navigation was wired, and the chatbot integration contract was documented.

Spec refs: `5.2` support section
Workbook refs: `M5.2`, `M14.7`

Checklist:
- [x] Keep the existing support ticket CRUD, comments, and activity base.
- [x] Add EcoTrack support categories while retaining legacy aliases until migration closure.
- [x] Add FAQ module wiring in app navigation.
- [x] Define the chatbot integration contract if the feature remains in scope.

#### US-DEV-402: Admin Backoffice Alignment

Status: `DONE`

Description: As an admin, I can manage users, roles, and alert thresholds relevant to EcoTrack.

Progress: Admin ticket management, add-user flow, advanced user filters, and audit CSV export are implemented.

Spec refs: `UC-AD01`, `UC-AD02`, `5.2`
Workbook refs: `M14.7`

Checklist:
- [x] Keep the existing admin users, roles, settings, and audit modules.
- [x] Add threshold configuration per container type and zone.
- [x] Add notification recipient and channel management.
- [x] Add EcoTrack-specific admin metrics on the overview.

#### US-DEV-403: Gamification Engine

Status: `DONE`

Description: As product owners, we need a complete gamification module with points, badges, challenges, and leaderboard ranking.

Progress: Citizen report actions now award points and badges, and these updates feed the leaderboard and citizen profile experience.

Spec refs: `5.2`, `UC-C01`, `UC-C02`, `UC-C03`
Workbook refs: `M5.2`, `M14.7`

Checklist:
- [x] Implement point-attribution rules for citizen actions.
- [x] Implement badge rules and issuance.
- [x] Implement leaderboard aggregation and ranking APIs.
- [x] Connect gamification updates to the citizen UX.

### Sprint 6 - Reporting and Quality Hardening

Phase status: `DONE`

Sprint 6 moved beyond feature delivery into operational readiness. It closed reporting needs and reinforced accessibility, responsiveness, E2E coverage, and API contract confidence.

Exit result:
- [x] Monthly reporting flow is operational
- [x] Cross-device and accessibility validation are in place
- [x] Release quality gates are stronger than the baseline

#### US-DEV-303: Monthly Report Export

Status: `DONE`

Description: As a manager, I can generate and export monthly operational reports.

Progress: Report generation, PDF and CSV outputs, email send options, and report history with regeneration are implemented.

Spec refs: `UC-G03`
Workbook refs: `M14.7`

Checklist:
- [x] Add report-generation endpoints for selected periods and KPIs.
- [x] Add PDF export download flow.
- [x] Add an email-send option from the manager UI.
- [x] Add report history and regeneration actions.

#### US-DEV-501: Responsive and Accessible UI Baseline

Status: `DONE`

Description: As end users, the app works across desktop, tablet, and mobile with accessible interaction patterns.

Progress: Keyboard, screen-reader, and responsive checks are automated for core citizen, agent, and manager flows.

Spec refs: `9.1`, `13.2`
Workbook refs: `M5.5`, `M10.6`

Checklist:
- [x] Add an accessibility audit checklist to the PR flow.
- [x] Validate keyboard and screen-reader patterns on critical flows.
- [x] Validate responsive layouts for citizen, agent, and manager surfaces.
- [x] Fix identified WCAG 2.1 AA issues.

#### US-DEV-502: Automated Quality Gates

Status: `DONE`

Description: As the dev team, we enforce tests and quality thresholds for releases.

Progress: CI now runs key-journey E2E coverage, expanded API contract tests, and a coverage gate of at least 60 percent.

Spec refs: `9.1`, `12.2`, `13.2`
Workbook refs: `M2.3`, `M5.12`, `M10.1`, `M10.7`

Checklist:
- [x] Keep lint, typecheck, and test pipelines in CI.
- [x] Add E2E coverage for citizen, agent, and manager journeys.
- [x] Add API contract tests for the new EcoTrack endpoints.
- [x] Maintain a coverage target above 60 percent for the development deliverable.

### Sprint 7 - Release Candidate and Documentation Completion

Phase status: `DONE`

Sprint 7 closed the main implementation arc. The focus was documentation quality, EcoTrack wording consistency, and demo-ready release preparation.

Exit result:
- [x] Stable release candidate
- [x] Docs updated to EcoTrack wording
- [x] End-user quick guides published

#### US-DEV-503: Documentation and Runbooks for Dev Scope

Status: `DONE`

Description: As contributors, we need current documentation for API usage, setup, runtime behavior, and release operations.

Progress: The documentation set now uses EcoTrack wording, includes updated OpenAPI references, and provides quick guides for citizen, agent, and manager audiences.

Spec refs: `12.2`, `13.2`
Workbook refs: `M14.1`, `M14.2`, `M14.5`, `M14.7`, `M14.8`

Checklist:
- [x] Keep the existing baseline README, API, and docs structure.
- [x] Update docs from ticket-centric language to EcoTrack language.
- [x] Publish OpenAPI references for new domain modules.
- [x] Add end-user quick guides for citizen, agent, and manager roles.

## 5. UI Completion Execution Phases

Purpose: close the remaining UI delivery gaps with parallel work packages while keeping each unit small enough to implement safely.

### UI Phase Snapshot

- Sprint 8: `DONE` - admin core completion
- Sprint 9: `DONE` - governance and role enforcement
- Sprint 10: `DONE` - realtime UX hardening, QA closure, and documentation updates

### Sprint 8 - Admin Core Completion

Phase status: `DONE`

Sprint 8 removed placeholder behavior from the admin area and completed the missing user-management workflows that were already partially scaffolded.

Parallel lanes:
- Agent-A
- Agent-B
- Agent-C

#### UI-ADM-001: Admin Ticket Management UI

Status: `DONE`
Owner lane: `Agent-A`

Description: Replace the admin ticket placeholder with a functional management UI for list, search, filtering, pagination, and actions.

Progress: The Admin Ticket tab now supports real ticket management instead of placeholder copy.

Depends on: none

Primary files:
- `app/src/pages/AdminDashboard.tsx`
- `app/src/hooks/useTickets.tsx`

Checklist:
- [x] Admin Ticket tab no longer shows placeholder text.
- [x] Admin can search, filter, paginate, and trigger allowed actions.
- [x] Loading, error, and empty states are visible and accessible.

#### UI-ADM-002: Add User Flow

Status: `DONE`
Owner lane: `Agent-B`

Description: Implement the add-user modal, validation rules, submission flow, and feedback states.

Progress: Admins can now create users from the backoffice with validation and refresh behavior.

Depends on: none

Primary files:
- `app/src/components/admin/UserManagement.tsx`
- `app/src/hooks/adminHooks.tsx`

Checklist:
- [x] The Add User action is enabled and submits through the API.
- [x] Form validation blocks invalid payloads.
- [x] Success and error feedback are visible.
- [x] The user list refreshes after creation.

#### UI-ADM-003: Advanced User Filters

Status: `DONE`
Owner lane: `Agent-C`

Description: Enable advanced user filters and persist filter state in the URL.

Progress: Admin filtering is now deeper and shareable because the filter state survives in query parameters.

Depends on: none

Primary files:
- `app/src/components/admin/UserManagement.tsx`

Checklist:
- [x] More Filters is enabled and applied to queries.
- [x] Filter state is persisted in URL query parameters.
- [x] Reset clears filters and returns to page 1.

### Sprint 9 - Governance and Role Enforcement

Phase status: `DONE`

Sprint 9 reinforced governance flows around auditing and explicit access control for the EcoTrack role model.

Parallel lanes:
- Agent-A
- Agent-B

#### UI-AUD-001: Audit Log Export

Status: `DONE`
Owner lane: `Agent-A`

Description: Implement audit-log export while honoring the current filter scope.

Progress: The export path now produces filtered CSV output instead of a placeholder interaction.

Depends on: Sprint 8 merge preferred, but not required

Primary files:
- `app/src/components/admin/AuditLogs.tsx`
- `app/src/hooks/adminHooks.tsx`

Checklist:
- [x] Export downloads logs for the current filter scope.
- [x] CSV export is available at minimum.
- [x] No placeholder export toast remains.

#### UI-AUTH-001: Auth Helper Extension for Citizen and Agent Roles

Status: `DONE`
Owner lane: `Agent-B`

Description: Extend authorization helpers so citizen and agent access checks are explicit and reusable.

Progress: Shared authz helpers now model citizen and agent permissions directly.

Depends on: none

Primary files:
- `app/src/utils/authz.ts`

Checklist:
- [x] Citizen access checks are explicit.
- [x] Agent access checks are explicit.
- [x] Helper logic is testable and reusable.

#### UI-AUTH-002: Citizen and Agent Route Guards

Status: `DONE`
Owner lane: `Agent-B`

Description: Enforce citizen and agent route guards in the router.

Progress: Route-level enforcement now blocks unauthorized role access instead of relying on looser shell assumptions.

Depends on: `UI-AUTH-001`

Primary files:
- `app/src/routes/AppRouter.tsx`

Checklist:
- [x] Citizen routes are guarded explicitly.
- [x] Agent routes are guarded explicitly.
- [x] Unauthorized role access is blocked at route level.

### Sprint 10 - Realtime UX, QA Closure, and Docs

Phase status: `DONE`

Sprint 10 completed the UX layer around realtime behavior and closed the remaining verification and documentation work required to treat the UI track as finished.

Parallel lanes:
- Agent-C
- Agent-QA
- Agent-Docs

#### UI-RT-001: Polling and Freshness Indicators

Status: `DONE`
Owner lane: `Agent-C`

Description: Add near-realtime polling and freshness indicators for dashboard and planning surfaces.

Progress: Dashboard and planning views now refresh automatically and show users whether the information is current.

Depends on: Sprint 9 merge preferred, but not required

Primary files:
- `app/src/hooks/usePlanning.tsx`
- `app/src/hooks/useTickets.tsx`
- `app/src/pages/Dashboard.tsx`

Checklist:
- [x] Dashboard and planning views refresh automatically through polling.
- [x] The UI shows last-refresh and live-status indicators.
- [x] The behavior works without requiring push transport.

#### UI-RT-002: Push Updates with Fallback Preservation

Status: `DONE`
Owner lane: `Agent-C`

Description: Add optional push updates with polling fallback so realtime delivery can improve without breaking baseline behavior.

Progress: The realtime stack now supports server-sent updates with replay-aware reconnect, keepalive behavior, periodic snapshots, and polling fallback across multi-instance deployments.

Depends on: SSE stream availability with short-lived stateless sessions and fallback support

Primary files:
- app and API event integration points
- `docs/specs/realtime-dashboard-push-contract.md`

Checklist:
- [x] Push update transport is available.
- [x] Polling fallback remains available.
- [x] Reconnect and freshness behavior are handled safely.

#### UI-QA-001: Tests for New Admin and Realtime Flows

Status: `DONE`
Owner lane: `Agent-QA`

Description: Add or extend tests for new admin flows, role guards, and refresh logic.

Progress: The test suite now covers the most important happy paths and major failure paths introduced by the new UI work.

Depends on: Sprint 8, Sprint 9, and Sprint 10 feature tasks

Primary files:
- `app/src/tests/**`

Checklist:
- [x] Tests cover the happy path for each new flow.
- [x] Tests cover major error paths for each new flow.
- [x] No net regression remains in the app test suite.

#### UI-DOC-001: UI Documentation Closure

Status: `DONE`
Owner lane: `Agent-Docs`

Description: Update roadmap, routes, feature pages, and operator notes so the UI delivery state is documented accurately.

Progress: Documentation now reflects the final status of the UI completion work instead of the earlier placeholder state.

Depends on: Sprint 8, Sprint 9, and Sprint 10 feature tasks

Primary files:
- `docs/planning/roadmaps/ROADMAP.md`
- `docs/product/FRONTEND_ROUTES.md`
- `docs/product/features/*.md`

Checklist:
- [x] Story statuses reflect actual implementation state.
- [x] New behavior is documented.
- [x] Relevant commands and operator notes are documented.

### Parallel Execution Rules

- One task ID per branch or pull request.
- Keep each pull request scoped to one work package whenever possible.
- Do not modify unrelated modules while executing a task.
- Rebase frequently against the main branch between sprint lanes.
- Mark a task `IN_PROGRESS` at start and `DONE` only after required checks pass.

### Validation Gate for App-Scope Tasks

Run these checks for work packages that touch `app/**`:

```bash
npm run lint --workspace=ecotrack-app
npm run typecheck --workspace=ecotrack-app
npm run test --workspace=ecotrack-app
```

If a task crosses layers such as `app`, `api`, `database`, env, or CI, run the full monorepo validation set: `npm run validate-env:all`, `npm run lint`, `npm run typecheck`, and `npm run test`.

## 6. WebSocket Rollout Phase

Reference spec: `docs/specs/websocket-realtime-step-plan.md`

### Sprint 11 - WebSocket Transport Rollout with Fallback Preservation

Phase status: `DONE`

Sprint 11 completed the final transport upgrade for realtime planning data. The target was a resilient stack that prefers WebSocket delivery while preserving fallback behavior and test coverage.

Parallel lanes:
- 3 feature lanes
- 1 QA lane
- 1 documentation lane

#### WS-RT-001: Planning WebSocket Gateway and Authenticated Handshake

Status: `DONE`
Owner lane: `Agent-A`

Description: Add a planning WebSocket gateway and an authenticated session handshake.

Progress: The backend now exposes an authenticated WebSocket entry point for planning updates.

Depends on: `UI-RT-002`

Primary files:
- `api/src/modules/routes/**`
- `api/src/modules/auth/**`

Checklist:
- [x] Planning WebSocket gateway exists.
- [x] Authenticated handshake flow exists.
- [x] The transport is ready for frontend consumption.

#### WS-RT-002: Gateway Broadcast Bridge

Status: `DONE`
Owner lane: `Agent-A`

Description: Bridge existing planning realtime events into gateway broadcasts.

Progress: Planning service events are now pushed through the gateway so realtime updates use a single transport surface.

Depends on: `WS-RT-001`

Primary files:
- `api/src/modules/routes/planning.service.ts`
- `api/src/modules/routes/**`

Checklist:
- [x] Existing planning events are connected to the gateway.
- [x] Broadcast flow is operational.
- [x] Manager-facing updates can travel through the WebSocket path.

#### WS-RT-003: Frontend WebSocket Hook and Transport Priority

Status: `DONE`
Owner lane: `Agent-B`

Description: Add the frontend WebSocket hook and a transport priority of `WS -> SSE -> polling`.

Progress: The frontend now prefers WebSocket transport but can degrade safely to SSE and then polling.

Depends on: `WS-RT-001`

Primary files:
- `app/src/hooks/**`
- `app/src/pages/Dashboard.tsx`

Checklist:
- [x] Frontend WebSocket hook exists.
- [x] Transport priority is `WS -> SSE -> polling`.
- [x] Dashboard surfaces consume the new transport path.

#### WS-RT-004: Reconnect Resilience and Connection-State Telemetry

Status: `DONE`
Owner lane: `Agent-C`

Description: Add reconnect resilience and connection-state telemetry.

Progress: Reconnect behavior is more robust, and connection state is surfaced for diagnostics and UX clarity.

Depends on: `WS-RT-003`

Primary files:
- `app/src/hooks/**`
- `api/src/modules/routes/**`

Checklist:
- [x] Reconnect behavior is resilient.
- [x] Connection-state telemetry is exposed.
- [x] Fallback continuity is preserved during reconnect events.

#### WS-QA-001: WebSocket and Fallback Test Coverage

Status: `DONE`
Owner lane: `Agent-QA`

Description: Add API and app tests for WebSocket auth, broadcasts, and fallback behavior.

Progress: The realtime stack now has verification coverage across auth, broadcast delivery, and fallback behavior.

Depends on: `WS-RT-001`, `WS-RT-002`, `WS-RT-003`, `WS-RT-004`

Primary files:
- `api/src/tests/**`
- `app/src/tests/**`

Checklist:
- [x] API tests cover WebSocket authentication.
- [x] API and app tests cover broadcast behavior.
- [x] App tests cover fallback behavior.

#### WS-DOC-001: Transport Stack Documentation Update

Status: `DONE`
Owner lane: `Agent-Docs`

Description: Update roadmap, feature docs, and specs for the final realtime transport stack.

Progress: The documentation set now describes the final transport order and rollout state instead of the earlier interim plan.

Depends on: `WS-RT-001`, `WS-RT-002`, `WS-RT-003`, `WS-RT-004`, `WS-QA-001`

Primary files:
- `docs/planning/roadmaps/ROADMAP.md`
- `docs/product/features/Dashboard.md`
- `docs/specs/*.md`

Checklist:
- [x] Roadmap documentation is updated.
- [x] Feature documentation is updated.
- [x] Spec pages reflect the final transport stack.

## 7. Open Workbook-to-Monolith Backlog

Source workbook: `docs/specs/inputs/ECOTRACK_M2_DEV.xlsx`

Detailed one-task-per-section mapping lives in:
- `docs/specs/workbook-monolith-open-tasks.md`

Mapping rules used in this backlog:
- `M1.*` tasks are excluded because they are design-only by project decision.
- Backlog setup task `M1.10` is excluded.
- Microservice, Kafka, and Kubernetes wording is adapted to a modular-monolith delivery target.
- Security and Data specialty work is tracked as a handoff while the Development-only scope freeze remains active.

### M2 - Dev Core Runtime Services

Status: `DONE`
Lane: `Dev Core`
Completed task IDs: `M2.1`, `M2.2`, `M2.4`, `M2.5`, `M2.6`, `M2.7`, `M2.10`, `M2.11`, `M2.12`, `M2.13`, `M2.14`

Description: Deliver the remaining runtime service hardening inside the modular monolith through `api` and `infrastructure`.

Progress: The monolith now exposes root and `/api` health probes, structured trace-aware request logging, OpenTelemetry/Jaeger trace export with business-span coverage, JWT/OAuth token separation, rate limiting with stricter auth abuse ceilings, Prometheus RED/USE metrics for HTTP/runtime visibility, a concurrent IoT ingestion worker with a dedicated validated-event consumer, transactional billing with invoice persistence, three automated negative injection-safety tests on real admin endpoints, a blocking Semgrep SAST CI gate, and a routing circuit breaker with fallback tests.

Checklist:
- [x] Complete the IoT ingestion controller, service, repository, health, and benchmark work.
- [x] Add the routing circuit breaker with timeout, threshold, reset, and fallback coverage.
- [x] Add health and readiness endpoints, centralized logging, tracing, metrics, and gateway guards.

### M3 - Event Workflow Hardening

Status: `DONE`
Lane: `Dev Core`
Open task IDs: none
Completed task IDs: `M3.1`, `M3.2`, `M3.3`, `M3.4`, `M3.6`, `M3.7`, `M3.8`, `M3.9`, `M3.10`, `M3.11`, `M3.12`, `M3.13 (Dev baseline)`, `M3.14`, `M3.15`

Description: Replace broker-cluster assumptions with a monolith event pipeline based on outbox and inbox patterns, workers, and replay-safe controls.

Progress: IoT ingestion now stages raw events in PostgreSQL inside one transaction per request or batch, derives or normalizes the canonical idempotency key for every accepted measurement, records producer metadata on staged rows, processes them through an internal worker with validation, normalization, enrichment, retry handling, and observability, records validated events with an internal event-envelope contract (`event_name`, `routing_key`, `schema_version`, worker producer identity), enforces internal producer and consumer authorization policy, creates durable downstream delivery rows with lease-owner tracking, exposes admin-only replay controls for failed or retryable rows, uses shard-aware queue scheduling to keep same-device processing ordered while scaling across sensors, publishes hop-level telemetry plus per-consumer lag and shard-skew metrics, registers 5 future externalization subjects in an internal schema registry, fans out validated events to both timeseries and rollup consumers, surfaces Development-owned security dashboards and alerts, and ships a Docker-Compose-based chaos harness that measures RTO and RPO gaps for pipeline recovery.

Checklist:
- [x] Implement DB inbox-style staging and validated-event storage where required for the IoT flow.
- [x] Add background worker behavior with retry controls for the IoT processing path.
- [x] Add event schema versioning and backlog observability for the IoT processing path.
- [x] Add monolith-compatible internal event transport metadata and lease-owner tracking for HA-style worker recovery.
- [x] Add exactly-once producer staging semantics for critical IoT ingestion through deterministic idempotency and transactional batch staging.
- [x] Add service-hop dashboards, consumer lag dashboards, and resilience scripts for the monolith event pipeline.
- [x] Add the Development-owned security-signal baseline while keeping full SIEM scope deferred to Security handoff.

### M4 - Platform and Deployment Baseline

Status: `DONE`
Lane: `Dev Platform`
Completed task IDs: `M4.1` to `M4.15` (monolith-adapted baseline)

Description: Replace Kubernetes-first assumptions with a monolith deployment baseline built around Docker Compose, CI/CD, secret templates, backup and restore, and rollout runbooks.

Progress: The monolith deployment baseline now includes Docker Compose workflows, CI/CD validation, managed Cloudflare Pages plus Render plus Neon rollout runbooks, secret-template guidance, rollback and restore documentation, and provider-scoped Terraform scaffolding for the current hosted platform.

Checklist:
- [x] Stabilize the monolith deployment baseline first.
- [x] Add Compose, CI/CD, backup, restore, and rollout operational support.
- [x] Keep Kubernetes deferred while scoping Terraform to the current hosted platform instead of full multi-cloud modules.

### M5 - Frontend Monolith Client Completion

Status: `DONE`
Lane: `Dev App`
Completed task IDs: `M5.3`, `M5.7`, `M5.8`, `M5.10`, `M5.13`, `M5.14`, `M5.15`

Description: Finish the remaining frontend architecture and experience work around state, mapping UX, performance, caching, push UX, telemetry, and component reuse.

Progress: The web client now uses a documented Query-plus-slice state boundary, lazy-loaded dashboard panels, a manager heatmap read model, browser Web Vitals ingestion, Sentry-backed frontend telemetry hooks, and a cross-app design-system contract. The mobile client now owns push device registration, citizen inbox reads, deep-link handling, and mobile runtime/push error telemetry with optional Sentry capture on top of the existing Development-only monolith platform.

Checklist:
- [x] Refine frontend state architecture where gaps remain.
- [x] Complete heatmap UX and Web Vitals improvements.
- [x] Add the agent-web caching policy and offline fallback behavior.
- [x] Add push-notification UX contract, telemetry hooks, and reusable component library improvements.

### M6 - Security Governance and Hardening Handoff

Status: `PARTIAL`
Lane: `Security Handoff`
Open task IDs: `M6.1` to `M6.15`

Description: Keep this module as a security governance, hardening, pentest, and SOC dependency pack outside the current development-only phase.

Progress: Development-owned security baselines, observability hooks, and verification gates are in place, but governance, pentest, SOC, and broader hardening work remain a Security handoff under the active scope freeze.

Checklist:
- [x] Keep Dev-owned integration hooks ready where needed.
- [ ] Hand off security governance and hardening work when the scope freeze is lifted.

### M7 - Data and ML Handoff

Status: `PARTIAL`
Lane: `Data Handoff`
Open task IDs: `M7.1` to `M7.15`

Description: Keep this module as the ML, MLOps, feature-store, and retraining dependency pack for a later phase.

Progress: The current development data model stays future-ready for later model-facing integration, but ML, feature-store, training, and retraining delivery remain outside the active scope.

Checklist:
- [ ] Preserve API and data interfaces needed for future model integration.
- [ ] Hand off ML and data-science implementation work when the scope freeze is lifted.

### M8 - Internal Domain Events and Future Kafka Adapter Points

Status: `DONE`
Lane: `Dev Core`
Completed task IDs: `M8.1` to `M8.10` (monolith-adapted baseline)

Description: Interpret event-architecture tasks as monolith internal domain-event contracts plus outbox workers, while keeping future Kafka adapter points optional.

Progress: The monolith now exposes typed internal event contracts, durable PostgreSQL inbox and outbox-style worker flows, event-sourced collections commands with snapshots, a command/query split for tours, zone analytics and anomaly projections, archive-style connector exports, internal schema-registry coverage, replay-safe delivery pipelines, and future Kafka externalization points without introducing broker infrastructure.

Checklist:
- [x] Define internal domain-event contracts for the monolith.
- [x] Add event-sourced collection-tour write storage and snapshots.
- [x] Split collection command and query responsibilities inside the monolith.
- [x] Add outbox worker behavior where needed.
- [x] Add zone analytics, anomaly-alert, and connector-export projections.
- [x] Preserve optional adapter points for future service extraction.

### M9 - CI/CD and Ops Hardening for a Single Deployable Unit

Status: `DONE`
Lane: `Dev Platform`
Completed task IDs: `M9.1`, `M9.4`, `M9.9`, `M9.10`
Deferred task IDs: `M9.2`, `M9.3`, `M9.5`, `M9.6`, `M9.7`
Handoff task IDs: `M9.8`

Description: Adapt the operations backlog to a single deployable unit with reproducible builds, promotion rules, runtime monitoring, centralized logs, and optional GitOps or IaC templates.

Progress: The monolith release baseline now uses a real GitHub Actions promotion flow with environment-gated deploy jobs, release manifest artifacts, optional migration execution, hosted smoke validation, and a documented rollback-by-ref procedure. Docker builds now carry release metadata, multi-stage hardening, frontend bundle release tagging, and Trivy image scanning in CI. The supported observability path now documents Prometheus, Grafana, Alertmanager, structured log shipping, ELK validation, ownership, and retention expectations for the single deployable unit. Multi-cloud IaC, configuration-management, Kubernetes packaging, GitOps, and Vault-specific rollout remain intentionally deferred or handed off under the current monolith scope.

Checklist:
- [x] Stabilize promotion and deployment workflows for the monolith.
- [x] Add centralized operational visibility and release controls.
- [x] Keep optional IaC and GitOps templates as future-compatible assets while marking out-of-scope items explicitly as deferred or handoff.

### M10 - Non-Functional Quality Expansion

Status: `DONE`
Lane: `Dev QA`
Completed task IDs: `M10.2`, `M10.3`, `M10.4`, `M10.5`, `M10.8`

Description: Expand quality gates beyond the current baseline with performance, mutation, visual-regression, and frontend performance validation.

Progress: Quality lanes now include repo-owned K6 profiles, a focused Stryker gate, Percy snapshots, filesystem Lighthouse reports, a required Semgrep SAST gate in core CI, and targeted negative injection-safety tests on real API endpoints.

Checklist:
- [x] Add load and performance test coverage.
- [x] Add mutation or equivalent robustness checks where practical.
- [x] Add visual-regression and frontend performance checks.
- [x] Finish the remaining automated security scanning lane (`M10.3`).

### M11 - Performance Backlog

Status: `DONE`
Lane: `Dev Performance`
Completed task IDs: `M11.1`, `M11.2`, `M11.3`, `M11.4`, `M11.5`, `M11.6`, `M11.7`, `M11.8`, `M11.9`, `M11.10`

Description: Execute the remaining performance backlog around profiling, SQL tuning, caching, compression, lazy loading, connection pooling, and horizontal scaling readiness.

Progress: The performance backlog is now closed with repo-owned Clinic and autocannon profiling commands, Redis-backed API caching and cache headers, SQL baselines plus new read-path indexes, API compression and edge cache policies, installable PWA assets, and PgBouncer, HAProxy, Kubernetes, and Cloudflare operator templates documented in the performance runbook.

Checklist:
- [x] Profile hot paths across frontend and backend.
- [x] Tune SQL, caching, and transport efficiency.
- [x] Prepare scaling readiness for the monolith runtime.

### M12 - Security Implementation Dependency Set

Status: `PARTIAL`
Lane: `Security Handoff`
Open task IDs: `M12.1` to `M12.10`

Description: Track advanced auth hardening, encryption, headers, secret handling, auditing, and pentest work as a security dependency set for a later specialty phase.

Progress: The current development baseline already includes headers, log redaction, rate limiting, request correlation, Semgrep, and negative-input safety tests, but advanced hardening and specialty validation remain a Security handoff.

Checklist:
- [x] Keep current development implementations as the baseline.
- [ ] Hand off advanced controls and validation to the Security specialty when allowed.

### M13 - Observability Stack

Status: `DONE`
Lane: `Dev Observability`
Completed task IDs: `M13.1` to `M13.8`

Description: Implement the remaining observability stack for the monolith runtime, including tracing, APM, KPIs, alerting, probes, synthetic checks, error tracking, and SLO or SLI reporting.

Progress: The monolith observability lane now includes environment-level OTEL sampling guidance, Prometheus KPI and SLO recording rules, Grafana KPI and reliability dashboards, runbook-backed alert routing, explicit probe ownership, repo-owned hosted synthetic monitoring in CD plus a scheduled workflow, and release-tagged error-tracking guidance for web and mobile Sentry usage.

Checklist:
- [x] Add tracing and APM coverage.
- [x] Add business KPI and alerting visibility.
- [x] Add error tracking.
- [x] Add synthetic checks and SLO or SLI reporting.

### M14 - Documentation Operations Completion

Status: `DONE`
Lane: `Dev Docs`
Completed task IDs: `M14.3`, `M14.4`, `M14.6`

Description: Finish the documentation operations backlog around architecture diagrams, code annotation conventions, and release changelog or versioning practice.

Progress: The architecture overview now includes Mermaid diagrams, the repository has a written code annotation convention with representative TSDoc examples, and release tracking is formalized through a root changelog plus versioning guide.

Checklist:
- [x] Add or refresh architecture diagrams.
- [x] Standardize code annotation conventions where required.
- [x] Formalize release changelog and versioning practice.

### Recommended Execution Order for the Remaining Backlog

1. No active Development delivery module remains open in the roadmap after the `M13` closure.
2. Keep `M9.2`, `M9.3`, `M9.5`, `M9.6`, and `M9.7` as intentional deferred-platform items until the deployment target changes.
3. Keep `M6`, `M7`, and `M12` as formal handoff tracks until the Development-only scope freeze is lifted.

