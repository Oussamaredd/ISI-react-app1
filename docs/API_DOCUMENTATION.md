# EcoTrack API Documentation

## Overview

EcoTrack exposes a REST API for citizen reporting, agent tour execution, manager planning, support workflows, and admin governance.

- Base URL (local): `http://localhost:3001/api`
- Auth mode: JWT bearer token (`Authorization: Bearer <token>`) with cookie support for web auth flows
- Response format: JSON
- Correlation: `X-Request-Id` is returned on responses and reused from `x-request-id` when provided

## Authentication

Local auth endpoints:

```text
POST /login
POST /signup
POST /auth/exchange
POST /logout
GET /auth/status
GET /auth/me
GET /me
PUT /me
PUT /me/password
POST /forgot-password
POST /reset-password
```

`PUT /me` supports profile updates for `displayName` and optional `avatarUrl` (`http`/`https` URL or image data URL for PNG/JPEG/WEBP).
`PUT /me/password` requires `currentPassword` and strong `newPassword` (12+ chars with uppercase, lowercase, number, and symbol) and is available for local accounts only.

OAuth endpoints:

```text
GET /auth/google
GET /auth/google/callback
```

## Core EcoTrack Domain Endpoints

### Containers and Zones

```text
GET /containers
POST /containers
PUT /containers/:id

GET /zones
POST /zones
PUT /zones/:id
```

### Citizen Reporting and Engagement

```text
GET /citizen-reports
POST /citizen-reports

GET /citizen/profile
GET /citizen/history
GET /citizen/challenges
POST /citizen/challenges/:challengeId/enroll
POST /citizen/challenges/:challengeId/progress
POST /citizen/reports
```

### Agent Tours and Field Execution

```text
GET /tours
POST /tours

GET /tours/agent/me
POST /tours/:tourId/start
POST /tours/:tourId/stops/:stopId/validate

GET /tours/anomaly-types
POST /tours/:tourId/anomalies
GET /tours/:tourId/activity
```

Agent tour execution notes:
- `GET /api/tours/agent/me` returns the current actionable non-terminal tour for the authenticated agent, plus ordered `stops`, itinerary coordinates, and a `routeSummary` block.
- `POST /api/tours/:tourId/start` is safe to repeat while the tour is already `in_progress`; completed tours are rejected.
- `POST /api/tours/:tourId/stops/:stopId/validate` accepts only the active stop for new validations. Repeating the same completed-stop validation returns the latest route state without creating a duplicate collection event.
- The current web workflow uses manual container confirmation plus optional browser geolocation. The optional `qrCode` field remains available for future mobile clients, but it is not required for the platform UI.
- `POST /api/tours/:tourId/anomalies` accepts `severity` values `low`, `medium`, `high`, or `critical`.
- `photoUrl` in anomaly payloads must be a valid `http`/`https` URL when provided.

### Manager Planning and Reports

```text
GET /planning/zones
GET /planning/agents
POST /planning/optimize-tour
POST /planning/create-tour
GET /planning/dashboard
POST /planning/ws-session
POST /planning/stream/session
POST /planning/emergency-collection

POST /planning/reports/generate
GET /planning/reports/history
GET /planning/reports/:reportId/download
POST /planning/reports/:reportId/regenerate
```

Report generation supports:
- `format: "pdf"` for binary PDF download
- `format: "csv"` for Excel-compatible CSV download
- local day-boundary reporting windows (`periodStart` / `periodEnd` should be sent using the manager's local timezone window, not forced UTC midnight)
- `periodStart <= periodEnd` validation
- `selectedKpis` restricted to `tours`, `collections`, `anomalies`
- `emailTo` required when `sendEmail=true`
- `GET /planning/reports/history` returns the 100 most recent exports, including `format`, `sendEmail`, and delivery `status`
- when `sendEmail=true`, the API writes a MIME email artifact to `api/.runtime/report-outbox` in development and updates report `status` to `email_delivered` or `email_delivery_failed`
- `POST /planning/reports/:reportId/regenerate` recalculates metrics and regenerates file content from the source report period/KPIs.

GPS fields (`latitude`, `longitude`) in citizen reporting, container setup, and tour stop validation are validated as latitude/longitude coordinates.
`manualContainerIds` in `POST /planning/optimize-tour` must be an array of UUID strings.
`POST /planning/optimize-tour` excludes containers already assigned to non-terminal tours in the same zone within `+/- 120 minutes` of `scheduledFor`; explicitly supplied `manualContainerIds` still override that schedule deferral.
`orderedContainerIds` in `POST /planning/create-tour` must all belong to the selected `zoneId`.

### Analytics and Gamification

```text
GET /analytics/summary

GET /gamification/leaderboard
POST /gamification/profiles
```

## Support and Admin Endpoints

### Support module

```text
GET /tickets
POST /tickets
GET /tickets/:id
PUT /tickets/:id
DELETE /tickets/:id

GET /tickets/support/categories

GET /tickets/:id/comments
POST /tickets/:id/comments
PUT /tickets/:id/comments/:commentId
DELETE /tickets/:id/comments/:commentId

GET /tickets/:id/activity
```

Authorization notes:
- `tickets.read`: required for ticket read endpoints and ticket comment endpoints.
- `tickets.write`: required for ticket create/update/delete endpoints.
- Ticket write endpoints enforce both `tickets.read` and `tickets.write` permissions.

### Admin module

```text
GET /admin/users
POST /admin/users
PUT /admin/users/:id
DELETE /admin/users/:id

GET /admin/roles
POST /admin/roles
PUT /admin/roles/:id
DELETE /admin/roles/:id

GET /admin/settings
PUT /admin/settings
POST /admin/settings/notifications/test

GET /admin/audit-logs
```

Admin query validation notes:
- `GET /admin/users`: `is_active` must be `"true"` or `"false"` when provided.
- `GET /admin/users`: `created_from` and `created_to` must be valid date values.
- `GET /admin/audit-logs`: `date_from` and `date_to` must be valid date values.
- `GET /admin/audit-logs`: date-only `date_to` queries are treated as inclusive through `23:59:59.999`.
- `POST /admin/roles` and `PUT /admin/roles/:id` accept only known platform permission identifiers.

## Health and Monitoring

```text
GET /health
GET /api/health
GET /api/health/live
GET /api/health/ready
GET /api/health/database

POST /errors
POST /metrics/frontend
GET /metrics
```

## OpenAPI References

- Sprint 0 contract draft: `docs/openapi/ecotrack-sprint0.yaml`
- Domain modules reference: `docs/openapi/ecotrack-domain-modules.yaml`

## Error Shape

Errors follow a normalized structure:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "path": "/api/citizen/reports",
  "method": "POST",
  "timestamp": "2026-02-23T09:30:00.000Z",
  "requestId": "f8e6f9e6-0f58-4be6-9f11-c2807ea7f53e",
  "details": ["containerId must be a UUID"]
}
```

## Notes

- The platform is currently in the Development specialty scope only.
- Security/Data specialty features are tracked as future dependencies and are not implemented in this phase.
