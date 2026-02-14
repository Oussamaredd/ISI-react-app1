# Dashboard Feature

## Overview
The dashboard at `/app/dashboard` is a read-only operational overview for EcoTrack. It highlights ticket flow and activity without providing in-page navigation links that redirect users to other pages.

## Current UX Structure
- Hero section with user greeting and live sync indicators.
- KPI cards for total tickets, open queue, completed tickets, and assignment coverage.
- 7-day activity chart comparing created vs updated ticket volume.
- Status distribution with proportional progress bars.
- Recent ticket activity feed with status badges and relative timestamps.
- Hotel workload panel showing the most active properties.

## Navigation Behavior
- The dashboard content itself does not include quick-action links such as "View Tickets" or "Create Ticket".
- No dashboard content element triggers route redirection.
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
- `hotels`

Frontend uses `useDashboard()` in `app/src/hooks/useTickets.tsx` with React Query caching (`staleTime: 5 minutes`).

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
