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
GET /me
POST /forgot-password
POST /reset-password
```

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

### Manager Planning and Reports

```text
GET /planning/zones
GET /planning/agents
POST /planning/optimize-tour
POST /planning/create-tour
GET /planning/dashboard
POST /planning/emergency-collection

POST /planning/reports/generate
GET /planning/reports/history
POST /planning/reports/:reportId/regenerate
```

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
POST /tickets/:id/assign-hotel
```

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

## Health and Monitoring

```text
GET /health
GET /health/database

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
