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
3. Use `Manager Reports` to start from a calendar preset, confirm the local-time reporting window, and generate/download/regenerate exports.
4. Track critical indicators on dashboard and trigger emergency collection when needed.

## Planning form behavior

- The schedule input uses the manager's local device time.
- The optimization step uses the selected schedule to avoid containers already reserved on nearby tours in the same zone (within a 2-hour planning window).
- Changing the zone, schedule, or fill threshold clears the previous optimized route so a new route is generated for the updated inputs.
- Agent assignment is optional. If the agent list is unavailable, tours can still be created as unassigned.

## Freshness behavior

- Manager dashboards first mint a short-lived stream session token, then attempt SSE push updates from `GET /api/planning/stream`.
- If SSE is unavailable, UI automatically falls back to polling without blocking workflows.
- Dashboard KPIs auto-refresh every 20 seconds.
- Planning dashboard data auto-refreshes every 20 seconds when manager access is available.
- Planning zone/agent metadata auto-refreshes every 30 seconds.
- Background-tab polling is disabled to reduce unnecessary traffic.

## Manager reports behavior

- `Manager Reports` defaults to the previous calendar month and offers `Month to date`, `Last 30 days`, and `Custom` presets.
- Report date boundaries are built from the manager's local device time, so exports align with the dates shown in the UI.
- Managers can export `PDF` for sharing or `CSV` for spreadsheet/audit workflows.
- History includes recent delivery status (`Ready to download`, `Email delivered`, `Needs attention`) plus search/filter tools for follow-up.
- When `Send report by email` is enabled in development, the API writes the outbound MIME message to `api/.runtime/report-outbox` so delivery can be verified without external SMTP.

## Related APIs

- `POST /api/planning/optimize-tour`
- `POST /api/planning/create-tour`
- `GET /api/planning/dashboard`
- `POST /api/planning/reports/generate`
- `GET /api/planning/reports/history`
- `GET /api/planning/reports/:reportId/download`
- `POST /api/planning/reports/:reportId/regenerate`
