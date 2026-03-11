# CDC Traceability Matrix (Development Specialty)

Last updated: 2026-03-11

Canonical machine-readable source: `docs/specs/cdc-traceability-matrix.dev.json`

This matrix tracks Development-specialty CDC use cases only. Cyber-Security and Data-Science tracks remain explicit handoffs in this phase.

| Use case | Status | API contract(s) | Automated evidence | Current gap |
| --- | --- | --- | --- | --- |
| `UC-C01` Citizen overflow report | implemented | `POST /api/citizen/reports` | `app/src/tests/e2e.key-journeys.test.tsx` | none |
| `UC-C02` Citizen profile/history | implemented | `GET /api/citizen/profile`, `GET /api/citizen/history` | `api/src/tests/citizen-operations.test.ts`, `app/src/tests/CitizenProfilePage.test.tsx` | none |
| `UC-C03` Citizen challenges | implemented | `GET /api/citizen/challenges`, `POST /api/citizen/challenges/:challengeId/enroll`, `POST /api/citizen/challenges/:challengeId/progress` | `api/src/tests/citizen-operations.test.ts`, `app/src/tests/CitizenChallengesPage.test.tsx` | none |
| `UC-A01` Agent receives/starts tour | implemented | `GET /api/tours/agent/me`, `POST /api/tours/:tourId/start` | `api/src/tests/tours-agent-operations.test.ts`, `app/src/tests/e2e.key-journeys.test.tsx` | none |
| `UC-A02` Agent validates stop | implemented | `POST /api/tours/:tourId/stops/:stopId/validate` | `api/src/tests/tours-agent-operations.test.ts`, `app/src/tests/e2e.key-journeys.test.tsx`, `mobile/src/tests/agentActivity.test.ts` | none |
| `UC-A03` Agent anomaly report | implemented | `POST /api/tours/:tourId/anomalies` | `api/src/tests/tours-agent-operations.test.ts`, `app/src/tests/e2e.key-journeys.test.tsx`, `mobile/src/tests/agentActivity.test.ts` | none |
| `UC-G01` Manager optimize/create tour | implemented | `POST /api/planning/optimize-tour`, `POST /api/planning/create-tour` | `api/src/tests/planning-operations.test.ts`, `app/src/tests/e2e.key-journeys.test.tsx` | none |
| `UC-G02` Manager monitoring/realtime | implemented | `GET /api/planning/dashboard`, `GET /api/planning/stream`, `POST /api/planning/stream/session`, `POST /api/planning/ws-session`, `POST /api/planning/ws/session` | `api/src/tests/planning-stream.controller.test.ts`, `api/src/tests/planning.gateway.test.ts`, `app/src/tests/usePlanningRealtimeSocket.test.tsx`, `app/src/tests/usePlanningRealtimeStream.test.tsx`, `app/src/tests/Dashboard.realtimeTransport.test.tsx` | none |
| `UC-G03` Manager monthly reports | implemented | `POST /api/planning/reports/generate`, `GET /api/planning/reports/history`, `GET /api/planning/reports/:id/download`, `POST /api/planning/reports/:id/regenerate` | `api/src/tests/planning-operations.test.ts`, `api/src/tests/report-artifact.utils.test.ts`, `app/src/tests/ManagerReportsPage.test.tsx`, `mobile/src/tests/reporting.test.ts` | none |
| `UC-AD01` Admin users/roles | implemented | `GET /api/admin/users`, `POST /api/admin/users`, `GET /api/admin/roles`, `POST /api/admin/roles` | `api/src/tests/admin-operations.test.ts`, `app/src/tests/UserCreateModal.test.tsx`, `app/src/tests/AdminTicketManagement.test.tsx` | none |
| `UC-AD02` Admin settings/audit | implemented | `GET /api/admin/settings`, `POST /api/admin/settings/notifications/test`, `GET /api/admin/audit-logs` | `api/src/tests/admin-operations.test.ts`, `app/src/tests/AuditLogs.test.tsx` | none |
