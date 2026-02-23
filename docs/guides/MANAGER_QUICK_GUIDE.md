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

## Related APIs

- `POST /api/planning/optimize-tour`
- `POST /api/planning/create-tour`
- `GET /api/planning/dashboard`
- `POST /api/planning/reports/generate`
- `GET /api/planning/reports/history`
