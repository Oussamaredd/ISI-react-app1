# Mobile Layer Integration Contract (Dev Scope)

Last updated: 2026-03-11

## Purpose

Define the stable integration surface for the `mobile` layer inside the EcoTrack monorepo. The mobile layer is a React Native / Expo application, adapted from the `poemapp` starter shell, and it consumes EcoTrack platform APIs for citizen, agent, and manager use cases with GPS geolocation.

Scope note:
- This contract is Development-scope only.
- It does not add Cyber-Security or Data-Science specialty deliverables.

## Monorepo Placement

- `mobile` will be a sibling workspace to `app`, `api`, `database`, and `infrastructure`.
- `mobile` is a client layer, not a server layer:
  - it consumes API contracts
  - it owns native navigation, local device adapters, and client state
  - it must not read the database directly
  - it must not embed backend or infrastructure secrets
- `mobile` must not import runtime code from `app`, `api`, `database`, or `infrastructure`.

## Integration Principles

- Keep the platform as source of truth for business state (`tours`, `tour_stops`, `collection_events`, `citizen_reports`, `report_exports`).
- Keep mobile integration additive: new API endpoints are allowed, but existing platform endpoints remain backward compatible.
- Use correlation IDs end-to-end: forward `x-request-id` from the mobile client edge to platform APIs when request middleware is added.
- Prefer idempotent write semantics in mobile client flows:
  - Deduplicate retries at the mobile client edge where retries are user- or network-driven.
  - Avoid duplicate submissions for `validate stop`, `citizen report`, and `anomaly report`.
- Treat the `poemapp` starter as a UI shell only:
  - keep the Expo Router navigation model
  - keep the React Native Paper component approach when it fits EcoTrack UX
  - replace demo auth, fake credentials, and local-only flow assumptions with EcoTrack API-backed flows

## Mobile Auth Entry Expectations

- `/login` remains a dedicated mobile-first auth surface and must not reuse the in-app content shell intended for authenticated screens.
- The sign-in form should stay minimal: logo, primary welcome/title copy, credentials, inline validation, password visibility control, and one primary action.
- Mobile auth may expose self-service `citizen` signup and forgot-password request flows when the backend auth endpoints are available.
- `agent` and `manager` accounts remain platform/admin-provisioned unless a future product decision explicitly adds mobile self-service onboarding for those roles.
- Successful sign-in must redirect by resolved role (`citizen`, `agent`, `manager`) using the authenticated session payload, not stale pre-login state.
- Cold starts must not destroy a previously valid local session just because the initial auth-status revalidation hits a transient transport failure; secure storage should retain the last confirmed session snapshot until the platform explicitly rejects it.

## Canonical Use Case Endpoint Mapping

| CDC use case | Platform endpoint | Required fields | GPS fields |
| --- | --- | --- | --- |
| `UC-C01` Citizen overflow report | `POST /api/citizen/reports`, `GET /api/containers` | `containerId`, `reportType`, optional `description`/`photoUrl` | optional `latitude`, `longitude` (validated) |
| `UC-C02` Citizen profile/history | `GET /api/citizen/profile`, `GET /api/citizen/history` | auth context | none |
| `UC-C03` Citizen challenges | `GET /api/citizen/challenges`, `POST /api/citizen/challenges/:challengeId/enroll`, `POST /api/citizen/challenges/:challengeId/progress` | `challengeId` and action payload | none |
| `UC-A01` Agent receives daily tour | `GET /api/tours/agent/me`, `POST /api/tours/:tourId/start`, `GET /api/tours/:tourId/activity` | `tourId` for start | tour stop container coordinates and route geometry provided by API |
| `UC-A02` Agent validates collection | `POST /api/tours/:tourId/stops/:stopId/validate` | `volumeLiters` (+ optional `containerId`/`qrCode`) | optional `latitude`, `longitude` (validated) |
| `UC-A03` Agent anomaly report | `GET /api/tours/anomaly-types`, `POST /api/tours/:tourId/anomalies` | `anomalyTypeId` (+ optional details) | link via `tourStopId` when location traceability is needed |
| `UC-G01` Manager optimized tour | `POST /api/planning/optimize-tour`, `POST /api/planning/create-tour` | `zoneId`, `scheduledFor`, thresholds/route payload | container coordinates used in optimization |
| `UC-G02` Manager monitoring | `GET /api/planning/dashboard`, `GET /api/planning/stream`, `POST /api/planning/ws/session` | auth context | map points include container coordinates |
| `UC-G03` Manager monthly report | `POST /api/planning/reports/generate`, `GET /api/planning/reports/history`, `GET /api/planning/reports/:id/download`, `POST /api/planning/reports/:id/regenerate` | period + KPI selection | none |

## Data Contract Notes

- Latitude/longitude are validated at API boundary for:
  - container creation/update payloads
  - citizen report payloads
  - tour stop validation payloads
- Citizen report flow is map-first on mobile:
  - the citizen must locate a mapped container inside the app
  - GPS can center the map on the citizen position and highlight the nearest 3-5 nearby containers
  - the mobile map may expose nearby shortcuts and viewport-synced offscreen arrow indicators for that same nearest set while the citizen pans or zooms, collapsing overlapping indicators and resolving taps to the nearest container in that overlap
  - selecting a container from GPS-ranked shortcuts, search results, nearby shortcuts, nearby cards, or offscreen arrows recenters the map on that container and opens its info popup immediately
  - tapping a map marker recenters on that container, opens the same compact popup immediately, and keeps it visible until the citizen taps elsewhere on the map or another container
  - that popup is intentionally compact and limited to the container name plus the color-coded fill-progress tag
  - `GET /api/containers` may include `fillLevelPercent`, which mobile surfaces as container progress with green `<50%`, warning `50-75%`, and red `>75%` states
  - location remains optional; search and reporting still work when the citizen skips GPS
  - optional photo evidence can be captured before live location is available; the composer keeps that photo state and asks the citizen to refresh location before final submit when needed
  - search can look up containers by code/label/zone through `GET /api/containers`
  - after container selection, the primary report entry point lives in the map controls or selected-container card, and the issue details plus optional photo evidence are completed in a mobile bottom-sheet composer instead of a separate CRUD screen
- Duplicate citizen reports are rejected when the same container already has a citizen report inside the last hour.
- Mobile should surface that duplicate window before submit whenever recent citizen history already proves the conflict.
- Invalid or deleted containers raise an exception at the API boundary and must be handled in the mobile client.
- `photoUrl` is optional for citizen and anomaly submissions:
  - citizen reports accept `http`/`https` URLs or image data URLs produced by the installed mobile app camera flow
  - anomaly submissions remain URL-based until their mobile upload path is expanded
- Citizen report creation also queues a zone-scoped manager notification so operations can pick up the incident from the notification pipeline.
- Citizen history responses may include snapshot-backed `containerCode` / `containerLabel` values so old reports stay readable after container lifecycle changes.
- Report export format is explicit and normalized:
  - `pdf` for binary PDF
  - `csv` for Excel-compatible downloads

## Starter-to-EcoTrack Mapping

| `poemapp` starter surface | EcoTrack target meaning | Architecture action |
| --- | --- | --- |
| `app/login.tsx` | EcoTrack sign-in | Replace demo credential check with EcoTrack auth/session exchange against platform APIs |
| `app/(tabs)/index.tsx` | Citizen home/dashboard | Rebrand to EcoTrack citizen dashboard and fetch live API-backed data |
| `app/(tabs)/signalement-conteneur.tsx` | Citizen report submission | Map to `POST /api/citizen/reports` |
| `app/(tabs)/gamification.tsx` | Citizen challenges/gamification | Map to citizen challenge endpoints |
| `app/(tabs)/historique.tsx` | Citizen history/impact | Map to citizen history/profile surfaces |
| `app/(tabs)/horaire.tsx` | Collection schedule/calendar | Map to agent/citizen schedule surfaces depending on role strategy |

## Recommended Client Boundary Pattern

- Mobile should use client-focused services/hooks to orchestrate calls to platform APIs.
- The concrete mobile boundary should live under `mobile/src/api` and be imported through the `@api/*` alias so screens stay decoupled from raw fetch calls.
- Keep platform endpoint responses intact in cached state where practical to simplify debugging and replay.
- On native platforms, wire query focus and connectivity state to Expo `AppState` and network reachability so refetch-on-foreground and refetch-on-reconnect behave consistently.
- Store upstream platform resource IDs in mobile state/storage only as reconciliation references:
  - `tourId`, `stopId`, `collectionEventId`, `citizenReportId`, `reportExportId`.
- Keep device integrations behind narrow adapters:
  - location
  - camera/photo picker
  - notifications
  - secure token storage

## Non-Goals In This Phase

- No separate mobile microservice.
- No direct database access from mobile.
- No separate geofencing engine yet.
- No security-specialty controls (MFA policy engines, SIEM pipelines, threat scoring) in this contract.
- No data-science models/pipelines in this contract.
