# Advanced Ticket List Feature

## Overview
The advanced ticket list is the triage view inside the unified support workspace (`/app/support#advanced`), with compatibility redirect support from `/app/tickets/advanced`.

## Current UX
- Search by ticket title.
- Status filter (`All`, `Open`, `Completed`).
- Page size selector (`10`, `20`, `50`, `100`).
- URL-synced filter state for refresh/share/back-forward behavior.
- Empty, loading, and error states.
- Direct actions to treat a ticket.

## API Contract
```http
GET /api/tickets
```

Query parameters currently used by the page:
- `q`
- `status`
- `limit`
- `offset`
- `assignee_id` (optional, reserved for role-scoped flows)

## Notes
- The advanced list is fully support-category based with no legacy domain scoping.
- Support category is displayed as a ticket context column.

## Relevant Files
- `app/src/pages/AdvancedTicketList.tsx`
- `app/src/pages/SupportPage.tsx`
- `app/src/hooks/useTickets.tsx`
- `app/src/tests/AdvancedTicketList.test.tsx`

## Validation Commands
```bash
npm run lint --workspace=ecotrack-app
npm run typecheck --workspace=ecotrack-app
npm run test --workspace=ecotrack-app
```
