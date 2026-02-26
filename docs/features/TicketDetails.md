# Ticket Details Feature

## Overview
`/app/tickets/:id` is the support-ticket detail page for viewing one ticket, its comments, and timeline activity.

## Current Behavior
- Shows core ticket fields: title, description, priority, status, support category, created/updated dates.
- Supports comment CRUD with permission checks.
- Displays activity feed entries for ticket creation and comment events.
- Uses paginated comments via query params (`commentsPage`).

## API Endpoints Used
- `GET /api/tickets/:id`
- `GET /api/tickets/:id/comments?page=<n>&pageSize=<n>`
- `POST /api/tickets/:id/comments`
- `PUT /api/tickets/:id/comments/:commentId`
- `DELETE /api/tickets/:id/comments/:commentId`
- `GET /api/tickets/:id/activity`

## Domain Notes
- Ticket scope is represented by `supportCategory`.
- No legacy location-assignment metadata is used.

## Relevant Files
- `app/src/pages/TicketDetails.tsx`
- `app/src/hooks/useTickets.tsx`
- `api/src/tickets/tickets.controller.ts`
- `api/src/tickets/tickets.repository.ts`

## Validation Commands
```bash
npm run lint --workspace=ecotrack-app
npm run typecheck --workspace=ecotrack-app
npm run test --workspace=ecotrack-app
npm run lint --workspace=ecotrack-api
npm run typecheck --workspace=ecotrack-api
npm run test --workspace=ecotrack-api
```
