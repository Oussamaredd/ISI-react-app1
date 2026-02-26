# Real-Time Dashboard Push Contract (UI-RT-002)

## Purpose

Define the implementation contract to complete `UI-RT-002` with server push updates for manager/dashboard surfaces, while keeping polling fallback from `UI-RT-001`.

This spec is Development-scope only and does not add Cyber-Security or Data-Science specialty deliverables.

## Decision

- Transport: **SSE (Server-Sent Events)** for phase 1.
- Fallback: existing React Query polling remains active as the reliability fallback.
- Optional phase 2: WebSocket can be added later only if bi-directional signaling is required.

Why SSE first:
- One-way server-to-client updates match the dashboard use case.
- Simpler infra and client logic than WebSocket for current requirements.
- Native browser support with straightforward reconnect behavior.

## Scope

### In scope
- Push updates for manager-facing operational monitoring.
- Push-triggered cache invalidation/update for existing dashboard/planning queries.
- Reconnect behavior with `Last-Event-ID` support.
- Polling fallback preserved.

### Out of scope
- Bidirectional command channels.
- Specialty security/data pipelines.
- Replacing existing REST endpoints.

## API Contract (Proposed)

### Endpoint

- `POST /api/planning/stream/session`
  - Purpose: mint a short-lived opaque stream session token for SSE bootstrap.
  - Auth: existing app auth/session guard (`Authorization` bearer and/or cookie session).
  - Optional request field: `lastEventId` to request replay from the server retention window.
  - Example response: `{ "sessionToken": "<opaque-token>", "expiresInSeconds": 60 }`
- `GET /api/planning/stream`
- Auth: existing app auth/session guard.
- Auth transport: short-lived opaque `stream_session` query parameter only.
- Role access: `manager`, `admin`, `super_admin`.
- Response headers:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`

Required query parameter:
- `stream_session=<opaque-session-token>`

Optional replay query parameter:
- `last_event_id=<event-id>`

### SSE Event Envelope

Each emitted event uses standard SSE fields:

```text
id: <monotonic-event-id>
event: <event-name>
data: <json-string>
```

### Event Types

1. `planning.dashboard.snapshot`
   - Full or partial snapshot for manager dashboard cards.
2. `planning.container.critical`
   - Critical container state change.
3. `planning.emergency.created`
   - Emergency collection triggered.
4. `planning.tour.updated`
   - Tour status/assignment/order update relevant to manager monitoring.
5. `system.keepalive`
   - Heartbeat to keep connection active.

### Payload Schemas

#### `planning.dashboard.snapshot`

```json
{
  "timestamp": "2026-02-23T13:10:00.000Z",
  "ecoKpis": {
    "containers": 132,
    "zones": 12,
    "tours": 18
  },
  "thresholds": {
    "criticalFillPercent": 80
  },
  "criticalContainersCount": 7
}
```

#### `planning.container.critical`

```json
{
  "timestamp": "2026-02-23T13:10:04.000Z",
  "container": {
    "id": "ctr_123",
    "status": "critical",
    "code": "optional",
    "label": "optional",
    "zoneName": "optional",
    "fillLevelPercent": 92,
    "latitude": "optional",
    "longitude": "optional"
  }
}
```

Notes:
- `id` and `status` are required.
- Remaining container fields are optional and may be omitted when not available in the triggering workflow payload.

#### `planning.emergency.created`

```json
{
  "timestamp": "2026-02-23T13:11:30.000Z",
  "emergency": {
    "id": "emg_789",
    "containerId": "ctr_123",
    "reason": "Triggered by manager dashboard critical threshold",
    "createdBy": "manager_01"
  }
}
```

#### `planning.tour.updated`

```json
{
  "timestamp": "2026-02-23T13:12:00.000Z",
  "tour": {
    "id": "tour_456",
    "status": "in_progress",
    "assignedAgentId": "agent_22",
    "zoneId": "zone_north"
  }
}
```

#### `system.keepalive`

```json
{
  "timestamp": "2026-02-23T13:12:10.000Z"
}
```

## Frontend Contract

### New hook

- `usePlanningRealtimeStream(enabled: boolean)`
- Responsibilities:
  - request short-lived stream session token from `POST /api/planning/stream/session`.
  - open `EventSource` for `/api/planning/stream?stream_session=...` when enabled.
  - handle `onmessage`/named events and invalidate relevant React Query keys:
    - `planning-dashboard`
    - `dashboard`
    - optionally `agent-tour` for tour/emergency signals
  - track latest SSE `id` and submit it on reconnect (`lastEventId` and `last_event_id`) to support replay.
  - reconnect with jittered backoff on transient disconnect.
  - close cleanly on unmount.

### UI behavior

- Keep existing polling indicators from `UI-RT-001`.
- Add stream state labels:
  - `connected`
  - `reconnecting`
  - `fallback` (stream unavailable, polling only)
- Do not block page usage when stream is down.

## Backend Architecture Placement

- Controller: `api/src/planning/planning.controller.ts` (new stream route).
- Service: `api/src/planning/planning.service.ts` (stream orchestration and event fan-out).
- Repository stays read/query only; no stream logic in controller-only code paths.

If internal event bus utility is introduced, place it under `api/src/planning/` and keep contracts explicit.

## Reliability Rules

- Send `system.keepalive` every 20-30 seconds.
- Use event IDs to support replay/resume via reconnect cursor (`Last-Event-ID`/`last_event_id`).
- On repeated stream failure, frontend remains on polling mode without hard error.

## Acceptance Criteria

1. Manager dashboard reflects push-triggered updates within a few seconds when stream is connected.
2. If stream disconnects, UI remains functional and polling keeps data fresh.
3. Route guards still gate manager surfaces.
4. No existing dashboard/planning API contracts are broken.

## Test Plan

### API
- Stream endpoint auth/role tests (allowed vs denied).
- SSE format tests (`event`, `id`, `data` present).
- Keepalive emission test.

### App
- Hook test: connect, receive event, invalidate query keys.
- Hook test: disconnect and fallback state.
- Dashboard test: stream connected badge and fallback badge rendering.

## Rollout Plan

1. Implement stream endpoint + keepalive.
2. Emit `planning.dashboard.snapshot` first.
3. Wire frontend hook and query invalidation.
4. Add other event types incrementally.
5. Validate with full app/api lint + typecheck + test.

## Dependencies/Handoffs

- Infrastructure must allow long-lived HTTP connections for SSE in deployed environment.
- If infra/proxy constraints block SSE, switch to WebSocket under the same event payload contracts.
