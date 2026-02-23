# EcoTrack Development Roadmap (Dev Scope Only)

Last update: 2026-02-23  
Planning horizon: 8 sprints (2 weeks each)

## 1) Scope and Inputs

Inputs used:
- `C:\Users\sofca\Downloads\ECOTRACK_CDC_COMMUN_V2 .docx`
- `C:\Users\sofca\Downloads\ECOTRACK_M2_DEV.xlsx`
- `docs/specs/inputs/ECOTRACK_CDC_COMMUN_V2.docx`
- `docs/specs/inputs/ECOTRACK_M2_DEV.xlsx`
- Current repository implementation (`app`, `api`, `database`, `infrastructure`, `docs`)

In scope (Development specialty):
- Frontend SPA and mobile-first UX
- Backend API and business logic
- Route planning and operational workflows
- Gamification and user engagement flows
- Support and administration modules
- Test automation, CI/CD, documentation

Out of scope for this roadmap:
- Cyber/Security specialty tracks
- Data Science specialty tracks

## 1.1) Non-Breaking Delivery Guardrails (Mandatory)

This roadmap is executed with an additive-first strategy to protect current project logic.

- Add and polish features without removing working flows during transition.
- Keep current routes/endpoints stable until replacement features are validated and signed off.
- Prefer additive API evolution (`new endpoints` or `v2 namespaces`) over in-place contract breaks.
- Use additive database migrations first; avoid destructive schema changes until cutover plans are approved.
- Keep backward-compatible adapters/aliases while moving from ticket-centric to EcoTrack domain naming.
- Require regression checks (lint/typecheck/tests plus targeted user-flow smoke tests) before each merge.
- Track removals/deprecations as explicit, separately approved tasks after parity is reached.

## 2) Current Implementation Baseline

Status scale:
- `DONE`: implemented and usable now
- `PARTIAL`: implemented but not aligned yet with EcoTrack business domain
- `TODO`: not implemented yet

| Capability | Status | Evidence |
| --- | --- | --- |
| Auth flows (signup/login/reset/me) and token exchange | DONE | `api/src/auth/local-auth.controller.ts`, `api/src/auth/auth.controller.ts`, `app/src/pages/auth/LoginPage.tsx` |
| Protected routes and role-based app shell | DONE | `app/src/routes/AppRouter.tsx`, `app/src/routes/guards/RequireAuth.tsx` |
| Support ticket workflows (CRUD + comments + activity) | DONE | `api/src/tickets/tickets.controller.ts`, `app/src/pages/TicketDetails.tsx`, `app/src/pages/AdvancedTicketList.tsx` |
| Admin center (users/hotels/settings/audit logs) | DONE | `app/src/pages/AdminDashboard.tsx`, `api/src/admin/admin.users.controller.ts`, `api/src/admin/admin.settings.controller.ts` |
| Operational dashboard | PARTIAL | `app/src/pages/Dashboard.tsx`, `api/src/dashboard/dashboard.controller.ts` |
| Health and metrics endpoints | PARTIAL | `api/src/health/health.controller.ts`, `api/src/monitoring/monitoring.controller.ts` |
| CI/CD + quality gates | DONE | `.github/workflows/CI.yml`, `.github/workflows/CD.yml` |
| EcoTrack domain modules (containers, zones, tours, citizen reports, gamification) | TODO | Not present in current `app/api/database` domain models |

## 3) Target User Stories and Task Checklists

### Epic A - Domain Reframing and Core API

#### US-DEV-001: EcoTrack domain model
As a product team, we need core EcoTrack entities so all modules share the same business language.

Status: DONE  
Spec refs: `7.1`, `10.1`  
Workbook refs: `M1.1`, `M1.9`, `M2.9`

Checklist:
- [x] Define and validate entity glossary: `Container`, `Zone`, `Tour`, `TourStop`, `CitizenReport`, `CollectionEvent`, `GamificationProfile`.
- [x] Additive schema and migrations for Dev-owned OLTP needs; no destructive DDL before approved cutover.
- [x] Create repository/service/controller modules in API following `controller -> service -> repository`.
- [x] Add API DTOs and validation rules for all new entities.
- [x] Add seed fixtures for local/demo runs.

#### US-DEV-002: EcoTrack API contract surface
As frontend and integration teams, we need a stable API contract for all core flows.

Status: DONE  
Spec refs: `5.2`, `10.1`  
Workbook refs: `M1.13`, `M14.1`

Checklist:
- [x] Publish OpenAPI sections for auth, containers, zones, tours, analytics summary, gamification (additive API evolution).
- [x] Add pagination/filtering conventions for list endpoints.
- [x] Define consistent error payloads and request-id propagation.
- [x] Add API contract tests for critical endpoints.

#### US-DEV-003: Role model alignment for EcoTrack users
As an admin, I need roles aligned to citizen/agent/manager/admin usage.

Status: DONE  
Spec refs: `3.2`, `4.1` to `4.4`, `5.1`  
Workbook refs: `M5.6`

Checklist:
- [x] Existing RBAC and protected routes.
- [x] Map current roles to EcoTrack role matrix.
- [x] Align permission names with EcoTrack modules.
- [x] Update admin role assignment UX for new role model.

### Epic B - Citizen Experience

#### US-DEV-101: Citizen overflow report
As a citizen, I can report an overflowing container with location and optional photo.

Status: DONE  
Spec refs: `UC-C01`, `10.1`  
Workbook refs: `M2.8`, `M5.2`

Checklist:
- [x] Implement `CitizenReport` create flow (API + UI).
- [x] Add duplicate-report rule (same container/time window).
- [x] Store timestamp and geolocation with each report.
- [x] Add citizen confirmation state after report submission.

#### US-DEV-102: Citizen profile, history, and impact
As a citizen, I can view report history, points, badges, leaderboard position, and personal impact.

Status: DONE  
Spec refs: `UC-C02`, `5.2`  
Workbook refs: `M5.2`, `M5.11`

Checklist:
- [x] Build citizen profile page with history timeline.
- [x] Add points/badges/leaderboard summary widgets.
- [x] Add personal impact metrics display.
- [x] Add API endpoints for profile and history queries.

#### US-DEV-103: Collective challenges
As a citizen, I can join and track collective challenges.

Status: DONE  
Spec refs: `UC-C03`, `5.2`  
Workbook refs: `M5.2`, `M14.7`

Checklist:
- [x] Create challenge catalog endpoint and UI.
- [x] Implement challenge enrollment and participation tracking.
- [x] Compute challenge results and rewards.
- [x] Expose challenge progress in citizen profile.

### Epic C - Agent Mobile-First Operations

#### US-DEV-201: Daily tour reception
As an agent, I can receive and start my optimized daily tour from a mobile-first interface.

Status: DONE  
Spec refs: `UC-A01`, `9.1`  
Workbook refs: `M5.4`, `M5.9`

Checklist:
- [x] Build agent tour page with ordered stops and ETA.
- [x] Add map itinerary rendering for active tour.
- [x] Add "start tour" action and live tour state transitions.
- [x] Ensure mobile-first responsive behavior.

#### US-DEV-202: Collection validation at stop
As an agent, I can validate a collection at each stop with volume information.

Status: DONE  
Spec refs: `UC-A02`  
Workbook refs: `M5.4`, `M5.9`

Checklist:
- [x] Add stop validation API and UI actions.
- [x] Add QR scan fallback to manual selection.
- [x] Persist volume, timestamp, actor, and position.
- [x] Auto-advance to next stop after validation.

#### US-DEV-203: Agent anomaly report
As an agent, I can report anomalies encountered during a tour.

Status: DONE  
Spec refs: `UC-A03`  
Workbook refs: `M5.4`

Checklist:
- [x] Add anomaly type catalog.
- [x] Add anomaly report create flow with comments/photo.
- [x] Trigger manager-facing alert event.
- [x] Include anomaly in tour activity history.

### Epic D - Manager Planning and Monitoring

#### US-DEV-301: Create optimized tour
As a manager, I can create a tour by zone and fill-rate threshold and run optimization.

Status: DONE  
Spec refs: `UC-G01`, `5.2`, `10.1`  
Workbook refs: `M2.15`, `M5.9`

Checklist:
- [x] Build tour creation wizard (date, zone, threshold, candidate containers).
- [x] Implement optimization service (initial heuristic, then tuned algorithm).
- [x] Show route order, distance, duration, and manual adjustment.
- [x] Add assignment workflow to agent user.

#### US-DEV-302: Real-time manager dashboard
As a manager, I can monitor container states and critical alerts in real time.

Status: DONE  
Spec refs: `UC-G02`, `5.1`, `5.2`  
Workbook refs: `M5.1`, `M3.5`

Checklist:
- [x] Existing dashboard and KPI framework.
- [x] Introduce EcoTrack KPIs in parallel with ticket KPIs; cut over only after parity sign-off.
- [x] Add container state map and critical thresholds.
- [x] Add emergency collection trigger flow.

#### US-DEV-303: Monthly report export
As a manager, I can generate and export monthly operational reports.

Status: DONE  
Spec refs: `UC-G03`  
Workbook refs: `M14.7`

Checklist:
- [x] Add report generation endpoint for selected period/KPIs.
- [x] Add PDF export download flow.
- [x] Add email-send option from manager UI.
- [x] Add report history and regeneration action.

### Epic E - Shared Product Modules

#### US-DEV-401: Support module alignment
As operations users, we keep a support module (tickets/faq/chat support) aligned with EcoTrack terminology.

Status: DONE  
Spec refs: `5.2` (Support)  
Workbook refs: `M5.2`, `M14.7`

Checklist:
- [x] Existing support ticket CRUD/comments/activity.
- [x] Add EcoTrack support categories while keeping legacy aliases until migration closure.
- [x] Add FAQ module wiring in app navigation.
- [x] Define chatbot integration contract (if retained in scope).

#### US-DEV-402: Admin backoffice alignment
As an admin, I can manage users, roles, and alert thresholds relevant to EcoTrack.

Status: DONE  
Spec refs: `UC-AD01`, `UC-AD02`, `5.2`  
Workbook refs: `M14.7`

Checklist:
- [x] Existing admin users/roles/settings/audit modules.
- [x] Add threshold configuration per container type/zone.
- [x] Add notification recipient/channel management.
- [x] Add EcoTrack-specific admin metrics on overview.

#### US-DEV-403: Gamification engine
As product owners, we need a complete gamification module (points, badges, challenges, leaderboard).

Status: DONE  
Spec refs: `5.2`, `UC-C01`, `UC-C02`, `UC-C03`  
Workbook refs: `M5.2`, `M14.7`

Checklist:
- [x] Implement point attribution rules for citizen actions.
- [x] Implement badge rules and issuance.
- [x] Implement leaderboard aggregation and ranking API.
- [x] Connect gamification updates to citizen UX.

### Epic F - Quality, Delivery, and Documentation

#### US-DEV-501: Responsive and accessible UI baseline
As end users, the app works on desktop/tablet/mobile with accessible interaction patterns.

Status: DONE  
Spec refs: `9.1`, `13.2`  
Workbook refs: `M5.5`, `M10.6`

Checklist:
- [x] Add accessibility audit checklist to PR flow.
- [x] Validate keyboard/screen-reader patterns on critical flows.
- [x] Validate responsive layouts for citizen/agent/manager surfaces.
- [x] Fix identified WCAG 2.1 AA issues.

#### US-DEV-502: Automated quality gates
As the dev team, we enforce tests and quality thresholds for releases.

Status: DONE  
Spec refs: `9.1`, `12.2`, `13.2`  
Workbook refs: `M2.3`, `M5.12`, `M10.1`, `M10.7`

Checklist:
- [x] Existing lint/typecheck/test pipelines in CI.
- [x] Add E2E coverage for citizen/agent/manager key journeys.
- [x] Add API contract tests for new EcoTrack endpoints.
- [x] Maintain coverage target above 60% for Dev deliverable.

#### US-DEV-503: Documentation and runbooks for Dev scope
As contributors, we need current docs for API, setup, usage, and release operations.

Status: DONE  
Spec refs: `12.2`, `13.2`  
Workbook refs: `M14.1`, `M14.2`, `M14.5`, `M14.7`, `M14.8`

Checklist:
- [x] Existing baseline README/API/docs structure.
- [x] Update docs from ticket-centric to EcoTrack-centric language.
- [x] Publish OpenAPI references for new domain modules.
- [x] Add end-user quick guides for citizen/agent/manager.

## 4) Sprint-by-Sprint Plan (Recommended)

| Sprint | Main target | Planned stories | Exit criteria |
| --- | --- | --- | --- |
| Sprint 0 | Domain framing and API contracts | `US-DEV-001`, `US-DEV-002`, `US-DEV-003` | Approved domain model, API contract draft, role mapping |
| Sprint 1 | Core domain CRUD and navigation foundations | `US-DEV-001`, `US-DEV-002` | Containers/zones base APIs + initial UI routes |
| Sprint 2 | Citizen reporting MVP | `US-DEV-101`, `US-DEV-102` | End-to-end report flow and profile history |
| Sprint 3 | Agent tour execution MVP | `US-DEV-201`, `US-DEV-202`, `US-DEV-203` | Agent can receive, execute, and report on tours |
| Sprint 4 | Manager planning MVP | `US-DEV-301`, `US-DEV-302` | Manager can create/assign tours and monitor operations |
| Sprint 5 | Gamification + support/admin alignment | `US-DEV-103`, `US-DEV-401`, `US-DEV-402`, `US-DEV-403` | Citizen engagement and admin threshold workflows live |
| Sprint 6 | Reporting and quality hardening | `US-DEV-303`, `US-DEV-501`, `US-DEV-502` | Monthly reports + cross-device/accessibility validation |
| Sprint 7 | Release candidate and docs completion | `US-DEV-503` + carry-over | Stable release candidate, docs updated, final demo-ready |

## 5) Tracking Board

Use this section during sprint planning/review.

| Story ID | Owner | Sprint | Status (`TODO`/`PARTIAL`/`IN_PROGRESS`/`DONE`) | Notes |
| --- | --- | --- | --- | --- |
| US-DEV-001 |  | 0 | DONE | Domain entities, schema, API layers, DTOs, and seed fixtures delivered additively |
| US-DEV-002 |  | 0 | DONE | OpenAPI draft, list pagination/filtering, standardized errors, and contract tests added |
| US-DEV-003 |  | 0 | DONE | Role matrix mapped to citizen/agent/manager/admin with EcoTrack permission aliases |
| US-DEV-101 |  | 1 | DONE | Citizen report flow, duplicate prevention, geolocation, and confirmation implemented |
| US-DEV-102 |  | 1 | DONE | Citizen profile/history APIs and impact/gamification widgets implemented |
| US-DEV-103 |  | 1 | DONE | Challenge catalog, enrollment/progress tracking, and reward computation implemented |
| US-DEV-201 |  | 3 | DONE | Agent tour page, itinerary map, start action, and mobile-first flow implemented |
| US-DEV-202 |  | 3 | DONE | Stop validation endpoints/UI with QR fallback, persisted collection events, and auto-advance |
| US-DEV-203 |  | 3 | DONE | Anomaly type catalog/reporting with manager alert audit event and tour activity integration |
| US-DEV-301 |  | 4 | DONE | Manager wizard, optimization heuristic, route adjustment, and assignment workflow implemented |
| US-DEV-302 |  | 4 | DONE | Parallel EcoTrack KPIs, critical map/thresholds, and emergency trigger flow implemented |
| US-DEV-303 |  | 6 | DONE | Report generation, PDF download, email option, and report history/regeneration implemented |
| US-DEV-401 |  | 5 | DONE | Support categories/aliases, FAQ app nav wiring, and chatbot contract published |
| US-DEV-402 |  | 5 | DONE | Threshold and recipient/channel management delivered in admin settings with dashboard metrics |
| US-DEV-403 |  | 5 | DONE | Citizen report actions award points/badges and feed existing leaderboard/profile UX |
| US-DEV-501 |  | 6 | DONE | Keyboard/screen-reader/responsive checks automated for citizen, agent, and manager key flows |
| US-DEV-502 |  | 6 | DONE | CI now runs key-journey E2E coverage with API contract expansion and >=60% coverage gate |
| US-DEV-503 |  | 7 | DONE | Docs updated to EcoTrack wording with OpenAPI refs and citizen/agent/manager quick guides |
