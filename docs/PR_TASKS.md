# PR Tasks Tracker (Roadmap Execution)

Source of truth:
- `docs/ROADMAP.md`

Rule:
- Work sprint by sprint.
- Do not start next sprint until current sprint is fully complete.

## Current Sprint Gate Check

Last check date: 2026-02-23

| Sprint | Stories | Current status from roadmap | Gate |
| --- | --- | --- | --- |
| Sprint 0 | `US-DEV-001`, `US-DEV-002`, `US-DEV-003` | `DONE`, `DONE`, `DONE` | COMPLETE |
| Sprint 1 | `US-DEV-001`, `US-DEV-002` | Continuation delivered (`DONE`, `DONE`) | COMPLETE |
| Sprint 2 | `US-DEV-101`, `US-DEV-102`, `US-DEV-103` | `DONE`, `DONE`, `DONE` | COMPLETE |
| Sprint 3 | `US-DEV-201`, `US-DEV-202`, `US-DEV-203` | `DONE`, `DONE`, `DONE` | COMPLETE |
| Sprint 4 | `US-DEV-301`, `US-DEV-302` | `DONE`, `DONE` | COMPLETE |
| Sprint 5 | `US-DEV-103`, `US-DEV-401`, `US-DEV-402`, `US-DEV-403` | `DONE`, `DONE`, `DONE`, `DONE` | COMPLETE |
| Sprint 6 | `US-DEV-303`, `US-DEV-501`, `US-DEV-502` | `DONE`, `DONE`, `DONE` | COMPLETE |
| Sprint 7 | `US-DEV-503` (+ carry-over) | `DONE` | COMPLETE |

Active sprint: **None (all planned sprints complete)**

---

## Sprint 0 PR Tasks (Active)

Exit criteria (from roadmap):
- Approved domain model
- API contract draft
- Role mapping

### US-DEV-001 - EcoTrack domain model
- [x] Define and validate entity glossary: `Container`, `Zone`, `Tour`, `TourStop`, `CitizenReport`, `CollectionEvent`, `GamificationProfile`.
- [x] Additive schema and migrations for Dev-owned OLTP needs; no destructive DDL before approved cutover.
- [x] Create repository/service/controller modules in API following `controller -> service -> repository`.
- [x] Add API DTOs and validation rules for all new entities.
- [x] Add seed fixtures for local/demo runs.

### US-DEV-002 - EcoTrack API contract surface
- [x] Publish OpenAPI sections for auth, containers, zones, tours, analytics summary, gamification (additive API evolution).
- [x] Add pagination/filtering conventions for list endpoints.
- [x] Define consistent error payloads and request-id propagation.
- [x] Add API contract tests for critical endpoints.

### US-DEV-003 - Role model alignment for EcoTrack users
- [x] Existing RBAC and protected routes.
- [x] Map current roles to EcoTrack role matrix.
- [x] Align permission names with EcoTrack modules.
- [x] Update admin role assignment UX for new role model.

### Sprint 0 completion checks
- [x] `US-DEV-001` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] `US-DEV-002` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] `US-DEV-003` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] Sprint 0 marked complete, then unlock Sprint 1

---

## Sprint 1 PR Tasks

Status: `COMPLETE`.

Planned stories:
- `US-DEV-001` (continuation)
- `US-DEV-002` (continuation)

Sprint 1 exit criteria (from roadmap):
- Containers/zones base APIs + initial UI routes

Unlock checklist:
- [x] Sprint 0 completion checks are all done
- [x] Active sprint switched to Sprint 1 in this file

Completion checklist:
- [x] Containers base APIs available
- [x] Zones base APIs available
- [x] Initial citizen-facing routes available in app shell

---

## Sprint 2 PR Tasks

Status: `COMPLETE`.

Planned stories:
- `US-DEV-101`
- `US-DEV-102`
- `US-DEV-103`

Sprint 2 exit criteria (from roadmap):
- End-to-end report flow and profile history

Completion checklist:
- [x] `US-DEV-101` report create flow + duplicate guard + confirmation
- [x] `US-DEV-102` profile/history/impact endpoints + UI
- [x] `US-DEV-103` challenge catalog + enrollment + progress + rewards

---

## Sprint 3 PR Tasks

Status: `COMPLETE`.

Planned stories:
- `US-DEV-201`
- `US-DEV-202`
- `US-DEV-203`

Sprint 3 exit criteria (from roadmap):
- Agent can receive, execute, and report on tours

### US-DEV-201 - Daily tour reception
- [x] Build agent tour page with ordered stops and ETA.
- [x] Add map itinerary rendering for active tour.
- [x] Add "start tour" action and live tour state transitions.
- [x] Ensure mobile-first responsive behavior.

### US-DEV-202 - Collection validation at stop
- [x] Add stop validation API and UI actions.
- [x] Add QR scan fallback to manual selection.
- [x] Persist volume, timestamp, actor, and position.
- [x] Auto-advance to next stop after validation.

### US-DEV-203 - Agent anomaly report
- [x] Add anomaly type catalog.
- [x] Add anomaly report create flow with comments/photo.
- [x] Trigger manager-facing alert event.
- [x] Include anomaly in tour activity history.

### Sprint 3 completion checks
- [x] `US-DEV-201` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] `US-DEV-202` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] `US-DEV-203` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] Sprint 3 marked complete, then activate Sprint 4

---

## Sprint 4 PR Tasks

Status: `COMPLETE`.

Planned stories:
- `US-DEV-301`
- `US-DEV-302`

Sprint 4 exit criteria (from roadmap):
- Manager can create/assign tours and monitor operations

### US-DEV-301 - Create optimized tour
- [x] Build tour creation wizard (date, zone, threshold, candidate containers).
- [x] Implement optimization service (initial heuristic, then tuned algorithm).
- [x] Show route order, distance, duration, and manual adjustment.
- [x] Add assignment workflow to agent user.

### US-DEV-302 - Real-time manager dashboard
- [x] Introduce EcoTrack KPIs in parallel with ticket KPIs; cut over only after parity sign-off.
- [x] Add container state map and critical thresholds.
- [x] Add emergency collection trigger flow.

### Epic D continuation - US-DEV-303 monthly report export
- [x] Add report generation endpoint for selected period/KPIs.
- [x] Add PDF export download flow.
- [x] Add email-send option from manager UI.
- [x] Add report history and regeneration action.

### Sprint 4 completion checks
- [x] `US-DEV-301` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] `US-DEV-302` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] Sprint 4 marked complete, then activate Sprint 5

---

## Sprint 5 PR Tasks (Active)

Status: `COMPLETE`.

Planned stories:
- `US-DEV-103` (hardening)
- `US-DEV-401`
- `US-DEV-402`
- `US-DEV-403`

Sprint 5 exit criteria (from roadmap):
- Citizen engagement and admin threshold workflows live

### US-DEV-401 - Support module alignment
- [x] Add EcoTrack support categories while keeping legacy aliases until migration closure.
- [x] Add FAQ module wiring in app navigation.
- [x] Define chatbot integration contract (if retained in scope).

### US-DEV-402 - Admin backoffice alignment
- [x] Add threshold configuration per container type/zone.
- [x] Add notification recipient/channel management.

### US-DEV-403 - Gamification engine
- [x] Implement point attribution rules for citizen actions.
- [x] Implement badge rules and issuance.
- [x] Implement leaderboard aggregation and ranking API.
- [x] Connect gamification updates to citizen UX.

### Sprint 5 completion checks
- [x] `US-DEV-401` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] `US-DEV-402` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] `US-DEV-403` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] Sprint 5 marked complete, then activate Sprint 6

---

## Sprint 6 PR Tasks

Status: `COMPLETE`.

Planned stories:
- `US-DEV-303`
- `US-DEV-501`
- `US-DEV-502`

Sprint 6 exit criteria (from roadmap):
- Monthly reports + cross-device/accessibility validation

### US-DEV-501 - Responsive and accessible UI baseline
- [x] Add accessibility audit checklist to PR flow.
- [x] Validate keyboard/screen-reader patterns on critical flows.
- [x] Validate responsive layouts for citizen/agent/manager surfaces.
- [x] Fix identified WCAG 2.1 AA issues.

### US-DEV-502 - Automated quality gates
- [x] Existing lint/typecheck/test pipelines in CI.
- [x] Add E2E coverage for citizen/agent/manager key journeys.
- [x] Add API contract tests for new EcoTrack endpoints.
- [x] Maintain coverage target above 60% for Dev deliverable.

### Sprint 6 completion checks
- [x] `US-DEV-501` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] `US-DEV-502` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] Sprint 6 marked complete, then activate Sprint 7

---

## Sprint 7 PR Tasks

Status: `COMPLETE`.

Planned stories:
- `US-DEV-503`

Sprint 7 exit criteria (from roadmap):
- Stable release candidate, docs updated, final demo-ready

### US-DEV-503 - Documentation and runbooks for Dev scope
- [x] Update docs from ticket-centric to EcoTrack-centric language.
- [x] Publish OpenAPI references for new domain modules.
- [x] Add end-user quick guides for citizen/agent/manager.

### Sprint 7 completion checks
- [x] `US-DEV-503` marked `DONE` in `docs/ROADMAP.md` tracking board
- [x] Sprint 7 marked complete

---

## Update Process Per PR

1. Link the PR to one or more tasks above.
2. Check completed task boxes in this file.
3. If a story is complete, update status in `docs/ROADMAP.md` tracking board.
4. Re-run sprint gate check: only then move to next sprint.
