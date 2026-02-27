# Mobile Platform Integration Contract (Dev Scope)

Last updated: 2026-02-27

## Purpose

Define the stable integration surface for a future mobile microservice that will consume EcoTrack platform APIs for citizen, agent, and manager use cases with GPS geolocation.

Scope note:
- This contract is Development-scope only.
- It does not add Cyber-Security or Data-Science specialty deliverables.

## Integration Principles

- Keep the platform as source of truth for business state (`tours`, `tour_stops`, `collection_events`, `citizen_reports`, `report_exports`).
- Keep mobile microservice integration additive: new adapter endpoints are allowed, but existing platform endpoints remain backward compatible.
- Use correlation IDs end-to-end: forward `x-request-id` from mobile edge to platform APIs.
- Prefer idempotent write semantics in mobile orchestration:
  - Deduplicate retries at the microservice edge.
  - Avoid duplicate submissions for `validate stop`, `citizen report`, and `anomaly report`.

## Canonical Use Case Endpoint Mapping

| CDC use case | Platform endpoint | Required fields | GPS fields |
| --- | --- | --- | --- |
| `UC-C01` Citizen overflow report | `POST /api/citizen/reports` | `containerId`, `description` | optional `latitude`, `longitude` (validated) |
| `UC-C02` Citizen profile/history | `GET /api/citizen/profile`, `GET /api/citizen/history` | auth context | none |
| `UC-C03` Citizen challenges | `GET /api/citizen/challenges`, `POST /api/citizen/challenges/:challengeId/enroll`, `POST /api/citizen/challenges/:challengeId/progress` | `challengeId` and action payload | none |
| `UC-A01` Agent receives daily tour | `GET /api/tours/agent/me`, `POST /api/tours/:tourId/start` | `tourId` for start | tour stop container coordinates provided by API |
| `UC-A02` Agent validates collection | `POST /api/tours/:tourId/stops/:stopId/validate` | `volumeLiters` (+ optional `containerId`/`qrCode`) | optional `latitude`, `longitude` (validated) |
| `UC-A03` Agent anomaly report | `POST /api/tours/:tourId/anomalies` | `anomalyTypeId` (+ optional details) | link via `tourStopId` when location traceability is needed |
| `UC-G01` Manager optimized tour | `POST /api/planning/optimize-tour`, `POST /api/planning/create-tour` | `zoneId`, `scheduledFor`, thresholds/route payload | container coordinates used in optimization |
| `UC-G02` Manager monitoring | `GET /api/planning/dashboard`, `GET /api/planning/stream`, `POST /api/planning/ws/session` | auth context | map points include container coordinates |
| `UC-G03` Manager monthly report | `POST /api/planning/reports/generate`, `GET /api/planning/reports/:id/download` | period + KPI selection | none |

## Data Contract Notes

- Latitude/longitude are validated at API boundary for:
  - container creation/update payloads
  - citizen report payloads
  - tour stop validation payloads
- Report export format is explicit and normalized:
  - `pdf` for binary PDF
  - `csv` for Excel-compatible downloads

## Recommended Microservice Adapter Pattern

- Mobile microservice should expose client-focused endpoints and orchestrate calls to platform APIs.
- Keep platform endpoint responses intact in storage/events to simplify replay and debugging.
- Store upstream platform resource IDs in the adapter layer for reconciliation:
  - `tourId`, `stopId`, `collectionEventId`, `citizenReportId`, `reportExportId`.

## Non-Goals In This Phase

- No mobile-native runtime inside this repo.
- No separate geofencing engine yet.
- No security-specialty controls (MFA policy engines, SIEM pipelines, threat scoring) in this contract.
- No data-science models/pipelines in this contract.
