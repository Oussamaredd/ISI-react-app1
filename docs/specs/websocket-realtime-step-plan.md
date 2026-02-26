# WebSocket Realtime Step Plan (Post-SSE)

## Purpose

Define the next implementation step to add WebSocket transport on top of the now-stable SSE + polling baseline.

Execution status: completed for Sprint 11 scope (`WS-RT-001..004`, `WS-QA-001`, `WS-DOC-001`).

This plan targets Development scope only and keeps existing SSE behavior as safe fallback.

## Current Baseline

- SSE (`GET /api/planning/stream`) is live with:
  - short-lived stateless stream sessions,
  - replay-aware reconnect cursor support,
  - keepalive + periodic snapshots,
  - polling fallback in the app.

## WebSocket Objectives

1. Add low-latency bidirectional channel for manager dashboard and planning updates.
2. Keep SSE and polling as fallback modes.
3. Reuse existing event payload contracts where possible to avoid contract drift.

## Delivery Strategy

### Phase 1 (recommended)
- Introduce WebSocket transport for push events only (server -> client), while keeping command writes on existing REST endpoints.
- Use WS mainly for faster event fan-out and richer connection diagnostics.

### Phase 2 (optional)
- Add client -> server realtime commands/acks only if a concrete workflow requires it.

## Work Packages

### WS-RT-001 - Gateway Skeleton + Auth
- Add NestJS WebSocket gateway in planning module.
- Handshake auth via short-lived signed WS session token endpoint (`POST /api/planning/ws/session`).
- Authorize manager/admin/super_admin only.

### WS-RT-002 - Event Bridge + Contract Mapping
- Publish same event families as SSE:
  - `planning.dashboard.snapshot`
  - `planning.container.critical`
  - `planning.emergency.created`
  - `planning.tour.updated`
  - keepalive/ping signal
- Keep payload compatibility with current SSE consumers.

### WS-RT-003 - Frontend Transport Layer
- Add `usePlanningRealtimeSocket` hook.
- Transport priority:
  1) WebSocket
  2) SSE
  3) polling
- Reuse query invalidation keys already used by SSE hook.

### WS-RT-004 - Resilience + Observability
- Add reconnect policy with bounded backoff.
- Add connection state telemetry counters (connected, reconnecting, downgraded-to-sse, downgraded-to-polling).

### WS-QA-001 - Tests
- API tests:
  - handshake token auth success/failure
  - role authorization
  - event broadcast semantics
- App tests:
  - WS connected path
  - WS failover to SSE path
  - SSE unavailable failover to polling path

### WS-DOC-001 - Docs + Runbook
- Update roadmap and feature docs after rollout.
- Document transport precedence and operational troubleshooting.

## Agent Parallelization Plan

- Agent-A: `WS-RT-001` + `WS-RT-002`
- Agent-B: `WS-RT-003`
- Agent-C: `WS-RT-004`
- Agent-QA: `WS-QA-001`
- Agent-Docs: `WS-DOC-001`

Run order:
1. Agent-A starts `WS-RT-001`.
2. Agent-B starts hook scaffolding against mocked gateway contract.
3. Agent-A finishes `WS-RT-002` contract bridge.
4. Agent-B integrates live gateway + fallback stack.
5. Agent-C and Agent-QA execute resilience/tests in parallel.
6. Agent-Docs finalizes docs after validation pass.

## Validation Gates

For `api/**` changes:

```bash
npm run lint --workspace=ecotrack-api
npm run typecheck --workspace=ecotrack-api
npm run test --workspace=ecotrack-api
```

For `app/**` changes:

```bash
npm run lint --workspace=ecotrack-app
npm run typecheck --workspace=ecotrack-app
npm run test --workspace=ecotrack-app
```

For cross-layer completion gate:

```bash
npm run validate-env:all
npm run lint
npm run typecheck
npm run test
```

## Exit Criteria

- WebSocket path is stable in dev and verified by tests.
- Automatic fallback works (WS -> SSE -> polling).
- Existing SSE behavior remains non-regressed.
- Docs and roadmap status are updated to reflect transport stack behavior.

## Realtime SLO Targets

- Dashboard freshness target: critical planning updates visible within `<= 10s` under normal network conditions.
- Fallback recovery target: on WS failure, SSE fallback activation within `<= 5s`; if SSE also fails, polling mode remains available without UI lock.
- Availability target: manager dashboard remains readable and actionable even when all push transports are degraded.

## Operations Notes

- Realtime diagnostics endpoint: `GET /api/planning/realtime/health` (requires `ecotrack.analytics.read`).
- Use diagnostics counters to verify connection churn and emitted-event activity during rollout.
