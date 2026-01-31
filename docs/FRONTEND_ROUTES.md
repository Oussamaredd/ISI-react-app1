# Frontend Routes and Behavior

This React 18 app runs on Vite 6 with React Router 7 and TanStack Query 5. It lives in the `app/` folder (workspace name `react-app1-app`) and is launched via:

- `npm run dev --workspace=react-app1-app` (frontend only)
- `npm run dev` (root script; builds the database workspace, then starts frontend + API watchers)

API calls use `VITE_API_BASE_URL` (set in `app/.env.example`). Keep it aligned with the Nest server default `http://localhost:3001`.

## Route map

All routes are declared in `src/App.tsx`. Non-authenticated users see only the login prompt; all other routes require authentication. The admin page additionally checks for an `admin` or `super_admin` role (either on `user.role` or within `user.roles`).

| Path | Component | Auth | Notes |
| --- | --- | --- | --- |
| `/` | `LandingPage` | Public | Shown only when not authenticated |
| `/dashboard` | `Dashboard` | Required | Main dashboard view |
| `/tickets` | `TicketListPage` | Required | Basic ticket list |
| `/tickets/advanced` | `AdvancedTicketList` | Required | Filterable/advanced list |
| `/tickets/create` | `CreateTickets` | Required | Ticket creation form |
| `/tickets/:id/details` | `TicketDetails` | Required | Ticket detail view |
| `/tickets/:id/treat` | `TreatTicketPage` | Required | Treat/resolve workflow |
| `/admin` | `AdminDashboard` | Admin only | Blocks access with a simple “Access Denied” panel |

## Navigation and state

- Navigation is rendered by `Navigation` inside `src/App.tsx`; it highlights the active route and only shows the Admin link for admin-capable users.
- Auth state comes from `useAuth` (`AuthProvider` in `src/hooks/useAuth.tsx`), which gates the app and the admin route.
- Data fetching relies on the shared `apiClient` (`src/services/api.tsx`) and query hooks in `src/hooks/useTickets.tsx` and related hook files.

## Key files

- Routing and auth gate: `src/App.tsx`
- Auth context/hooks: `src/hooks/useAuth.tsx`
- Ticket data hooks: `src/hooks/useTickets.tsx`
- API client: `src/services/api.tsx`
