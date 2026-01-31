# PR / Task Backlog (Generated January 31, 2026)

## Notes
- Reviewed repo structure, docs, app, api, database, infrastructure, and workflows.
- Skipped `node_modules/` and generated artifacts.

## P0 - Security and access control
- [ ] PR: Remove committed secrets and rotate credentials
  - Why: real secrets appear in `.env` and `api/.env.example`.
  - Scope: replace with placeholders, rotate Google OAuth secrets and session/JWT keys, add secret scanning in CI.
  - Files: `.env`, `api/.env.example`, `docs/SECURITY.md`, `.github/workflows/ci-cd.yml`

- [ ] PR: Fix auth bypass and add logout + current-user endpoints
  - Why: `useAuth` sets `isAuthenticated` on `?auth=true`; `LogoutButton` calls `/api/auth/logout` which is missing.
  - Scope: remove query-string bypass, add `/api/auth/logout` to clear cookie, add `/api/auth/me` (or update frontend to rely on `/api/auth/status`), align docs and UI.
  - Files: `app/src/hooks/useAuth.tsx`, `app/src/components/LogoutButton.tsx`, `api/src/auth/*`, `docs/API_DOCUMENTATION.md`

- [ ] PR: Enforce auth/roles on protected API routes
  - Why: docs say auth required but `tickets` and `hotels` endpoints are open.
  - Scope: add auth guard, map OAuth users to DB users/roles, include roles in auth response or token.
  - Files: `api/src/auth/*`, `api/src/tickets/*`, `api/src/hotels/*`, `database/src/schema.ts`

## P1 - API and frontend parity
- [ ] PR: Align ticket list filters and pagination
  - Why: `AdvancedTicketList` sends filters but API ignores them; `total` is page size only.
  - Scope: implement filtering (status, priority, hotelId, assigneeId, search), return total count, support UUID ids; update UI to stop `parseInt` on hotel id.
  - Files: `api/src/tickets/tickets.service.ts`, `api/src/tickets/tickets.controller.ts`, `app/src/pages/AdvancedTicketList.tsx`

- [ ] PR: Implement comment update/delete and activity endpoints (or remove UI)
  - Why: UI calls `/tickets/:id/comments/:commentId` and `/tickets/:id/activity` but API does not implement them; UI expects comment author details not returned.
  - Scope: add update/delete comment endpoints and activity feed (or remove UI + hooks), include author display name/email in comment DTOs.
  - Files: `api/src/tickets/*`, `app/src/pages/TicketDetails.tsx`, `app/src/hooks/useTickets.tsx`

- [ ] PR: Implement dashboard endpoint (or remove dashboard hooks)
  - Why: `useDashboard` calls `/api/dashboard` which does not exist.
  - Scope: add dashboard endpoint + query in API or remove feature from frontend/docs.
  - Files: `api/src/*`, `app/src/hooks/useTickets.tsx`, `docs/features/Dashboard.md`

- [ ] PR: Decide on admin feature scope and align
  - Why: admin hooks + UI call `/api/admin/*` but API has no admin module.
  - Scope: either implement admin endpoints (users, roles, hotels, audit logs, settings) or hide admin UI behind a feature flag and remove unused hooks.
  - Files: `app/src/hooks/adminHooks.tsx`, `app/src/pages/AdminDashboard.tsx`, `api/src/*`

- [ ] PR: Implement error/metrics endpoints (or remove client calls)
  - Why: frontend posts to `/api/errors` and `/api/metrics/frontend`, and docs mention `/metrics` but API does not implement them.
  - Scope: add endpoints and persistence or remove the client integrations.
  - Files: `app/src/utils/errorHandlers.tsx`, `app/src/utils/performanceMonitoring.tsx`, `api/src/*`, `docs/API_DOCUMENTATION.md`

## P2 - Cleanup and correctness
- [ ] PR: Remove or fix unused/broken utilities
  - Why: several files are unused and contain errors (React Query wrapper, animations, perf monitoring).
  - Scope: delete or implement properly; remove dead exports.
  - Files: `app/src/utils/queryClient.tsx`, `app/src/utils/performanceMonitoring.tsx`, `app/src/utils/animations.tsx`, `app/src/hooks/useApi.tsx`, `app/src/components/ErrorBoundary.tsx`, `app/src/LandingApp.tsx`, `shared/config.ts`

- [ ] PR: Remove backup and temp files
  - Why: `.backup`, `.bak`, and `temp.txt` files create noise and risk stale logic.
  - Scope: delete backups or move to docs.
  - Files: `app/src/pages/Dashboard.tsx.backup`, `app/src/pages/LandingPage.tsx.backup`, `app/src/components/admin/HotelEditModal.tsx.bak`, `app/src/components/admin/temp.txt`, `package.json.backup`, `package.minimal.json`

- [ ] PR: Fix mojibake/encoding in docs and UI strings
  - Why: multiple files show garbled characters (e.g., "–", "✅").
  - Scope: normalize to UTF-8 or replace with ASCII; update affected docs and UI labels.
  - Files: `README.md`, `docs/*.md`, `app/src/*.tsx`

- [ ] PR: Rationalize lockfiles
  - Why: root workspaces use `package-lock.json` but `app/package-lock.json` also exists.
  - Scope: keep a single lockfile (prefer root) and update CI accordingly.
  - Files: `app/package-lock.json`, `package-lock.json`, CI workflows

## P3 - CI/CD reliability
- [ ] PR: Fix workflow inconsistencies and missing scripts
  - Why: `ci-cd.yml` calls `npm run test:performance` (missing), docker job references `./Dockerfile` (not present), CD workflow does not set `VITE_BASE` correctly.
  - Scope: remove unused jobs or add scripts, update Dockerfile path, use `env:` for Vite base, de-duplicate CI workflows.
  - Files: `.github/workflows/CI.yml`, `.github/workflows/ci-cd.yml`, `.github/workflows/CD.yml`, `infrastructure/Dockerfile`

## P4 - Tests
- [ ] PR: Add API tests and coverage gates
  - Why: CI runs API tests but repo has only frontend tests.
  - Scope: add tests for auth, tickets, hotels; configure coverage thresholds.
  - Files: `api/src/**/*`, `api/package.json`
