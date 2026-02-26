# Manager Quick Guide

## Goal

Plan optimized tours, monitor operations, and publish monthly reports.

## Main routes

- Planning wizard: `/app/manager/planning`
- Report center: `/app/manager/reports`
- Dashboard overview: `/app/dashboard`

## Typical flow

1. Open `Tour Planning Wizard`, select zone/schedule/threshold, and run optimization.
2. Adjust route order if needed and assign to an agent.
3. Use `Manager Reports` to generate, download, or regenerate period reports.
4. Track critical indicators on dashboard and trigger emergency collection when needed.

## Freshness behavior

- Manager dashboards first mint a short-lived stream session token, then attempt SSE push updates from `GET /api/planning/stream`.
- If SSE is unavailable, UI automatically falls back to polling without blocking workflows.
- Dashboard KPIs auto-refresh every 20 seconds.
- Planning dashboard data auto-refreshes every 20 seconds when manager access is available.
- Planning zone/agent metadata auto-refreshes every 30 seconds.
- Background-tab polling is disabled to reduce unnecessary traffic.

## Related APIs

- `POST /api/planning/optimize-tour`
- `POST /api/planning/create-tour`
- `GET /api/planning/dashboard`
- `POST /api/planning/reports/generate`
- `GET /api/planning/reports/history`
