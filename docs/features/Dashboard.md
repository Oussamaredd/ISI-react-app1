# Dashboard Feature

## Overview
The dashboard at `/app/dashboard` is the default operational overview for EcoTrack. It highlights ticket flow and activity for all authenticated users.

For users with `admin` or `super_admin` access, the page also includes a lightweight "Admin center" panel with links into `/app/admin` for governance workflows.

## Current UX Structure
- Hero section with user greeting and live sync indicators.
- KPI cards for total tickets, open queue, completed tickets, and assignment coverage.
- 7-day activity chart comparing created vs updated ticket volume.
- Status distribution with proportional progress bars.
- Recent ticket activity feed with status badges and relative timestamps.
- Support-focused activity feed for recent ticket operations.
- Admin-only panel with quick links to the Admin Center for user management, audit logs, and system settings.

## Navigation Behavior
- Non-admin users see dashboard analytics only.
- Admin users see an additional panel that links to `/app/admin`.
- Global app navigation remains available through the shared sidebar (`AppLayout`).

## Data Contract
Dashboard data comes from:

```http
GET /api/dashboard
```

The response powers:
- `summary`
- `statusBreakdown`
- `recentActivity`
- `recentTickets`

Frontend uses `useDashboard()` in `app/src/hooks/useTickets.tsx` with React Query caching (`staleTime: 5 minutes`) and polling (`refetchInterval: 20 seconds`).
Polling is disabled in background tabs (`refetchIntervalInBackground: false`).

Manager-capable sessions also use `usePlanningRealtimeStream()` (`app/src/hooks/usePlanningRealtimeStream.tsx`) for secured SSE updates. The hook first requests a short-lived opaque stream session token from `POST /api/planning/stream/session` (no request body), then subscribes to `GET /api/planning/stream?stream_session=...` and tracks event IDs for replay-aware reconnect. The API emits periodic dashboard snapshots in addition to event-triggered updates, so clients connected to different instances still receive fresh state without shared in-memory listeners. The hook invalidates `planning-dashboard`, `dashboard`, and `agent-tour` query caches on push events, and automatically falls back to polling when stream connectivity is unavailable.

WebSocket transport is now enabled via `usePlanningRealtimeSocket()` (`app/src/hooks/usePlanningRealtimeSocket.tsx`) and uses `POST /api/planning/ws-session` (no request body) + socket path `/api/planning/ws`. Runtime transport order is: WebSocket first, SSE second, polling fallback last.

## Realtime Transport Operations
- **Precedence**: Dashboard resolves realtime status in strict order: WebSocket (`ws-connected`) -> SSE (`connected`/`reconnecting`/`fallback`) -> polling-safe fallback (`fallback`).
- **WS connected behavior**: When `usePlanningRealtimeSocket()` reports `connected`, `usePlanningRealtimeStream()` is invoked with `enabled=false` so SSE is not used while WebSocket push is healthy.
- **WS failure behavior**: Session/bootstrap retries are capped at 3 attempts per hook lifecycle; after that the hook moves to `fallback` instead of retrying indefinitely. When WebSocket is not connected (`reconnecting` or `fallback`), SSE remains enabled and continues handling push updates when available.
- **Polling-safe mode**: When both push transports are unavailable, status is rendered as `Polling fallback: Push unavailable, polling active`; React Query polling keeps the dashboard usable.

### Troubleshooting
- If status remains `Reconnecting`, verify `/api/planning/ws-session` and `/api/planning/stream/session` are reachable and returning `2xx`.
- If status shows `Polling fallback`, check proxy/load balancer support for WebSocket upgrades and long-lived SSE HTTP connections.
- If manager users never reach push states, confirm account roles include `manager`, `admin`, or `super_admin`.
- Inspect backend realtime counters via `GET /api/planning/realtime/health` (analytics-read permissions required).
- Prometheus exposes centralized-ready realtime series from `/api/metrics` (`ecotrack_realtime_*`) for cross-instance monitoring.
- Run `npm run test:realtime --workspace=ecotrack-app` to validate transport precedence and fallback gates before release.

## Error and Empty States
- Loading state while metrics are being fetched.
- Non-blocking error banner if live metrics fail.
- Per-section empty-state messages when data is not available.

## Relevant Files
- `app/src/pages/Dashboard.tsx`
- `app/src/App.css`
- `api/src/dashboard/dashboard.repository.ts`
- `app/src/tests/Dashboard.test.tsx`
- `app/src/tests/useDashboard.test.tsx`

## Validation Commands
```bash
npm run lint --workspace=ecotrack-app
npm run typecheck --workspace=ecotrack-app
npm run test --workspace=ecotrack-app
```
