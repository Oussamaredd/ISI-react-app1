# Frontend Routes and Behavior

This React 18 app runs on Vite and React Router (`BrowserRouter` in `app/src/main.tsx`). SPA refresh support is preserved via Nginx fallback rewrite (`app/nginx.conf`) for both local container runs and the production image.

## Route groups

| Path | Auth state | Result |
| --- | --- | --- |
| `/` | Unauthenticated | Marketing landing page |
| `/` | Authenticated | Redirect to `/app` |
| `/about`, `/contact`, `/security`, `/features`, `/how-it-works`, `/pricing`, `/support`, `/terms`, `/privacy`, `/cookies` | Any | Public marketing/legal information pages |
| `/login` | Unauthenticated | Login page (local email/password + Google OAuth button) with a cursor-following spotlight overlay on pointer devices and assertive inline auth error announcements |
| `/signup` | Unauthenticated | Local account registration page |
| `/forgot-password` | Unauthenticated | Password reset request page |
| `/reset-password` | Unauthenticated | Local password reset page |
| `/auth/callback` | Any | Exchanges one-time auth code, restores any pending post-login route, then redirects to `/app/*`; shows loading/error states and a brief success state with a green checkmark before redirect |
| `/app/*` | Unauthenticated | Redirect to `/login` (with `next` query) |
| `/app/*` | Authenticated | Product app pages |
| `/faq` | Any | Compatibility redirect to `/support` |
| any unknown path | Any | Redirect to `/` |

Special case:

- `/#<section-id>` remains accessible for authenticated users to support route+scroll links back to marketing sections.
- Route changes reset scroll position to top for public/app pages (hash-only changes are excluded).
- `/auth/callback` deduplicates concurrent exchange attempts for the same auth `code` during the retry window so router remounts and rapid refreshes do not double-submit the exchange request.
- Lazy route boundaries show a shared `Loading EcoTrack` status screen while route bundles are fetched; the landing page now loads lazily so the authenticated app shell is favored in the default route budget.

## Product routes (`/app/*`)

| Path | Component | Notes |
| --- | --- | --- |
| `/app` | `AppHomePage` | Shared authenticated app home for all users; intended host for chatbot and role-specific guidance |
| `/app/dashboard` | `Dashboard` | Live operational overview; requires `manager`/`admin`/`super_admin`, otherwise redirects to `/app` |
| `/app/citizen/report` | `CitizenReportPage` | Requires `citizen`/`admin`/`super_admin`; otherwise shows Access Denied |
| `/app/citizen/profile` | `CitizenProfilePage` | Requires `citizen`/`admin`/`super_admin`; otherwise shows Access Denied |
| `/app/citizen/challenges` | `CitizenChallengesPage` | Requires `citizen`/`admin`/`super_admin`; otherwise shows Access Denied |
| `/app/agent/tour` | `AgentTourPage` | Requires `agent`/`admin`/`super_admin`; otherwise shows Access Denied |
| `/app/manager/planning` | `ManagerPlanningPage` | Manager route optimization, assignment, and manual persisted-route rebuild for the last created tour |
| `/app/manager/tours` | `ManagerToursPage` | Manager tour operations list for reviewing scheduled tours and rebuilding any persisted route |
| `/app/manager/reports` | `ManagerReportsPage` | Monthly report generation/download/history; email delivery stays disabled until the recipient field contains one plausible address |
| `/app/support` | `SupportPage` | Unified support workspace with Advanced, Simple, and Create views |
| `/app/tickets` | `Navigate` redirect | Compatibility redirect to `/app/support#simple` |
| `/app/tickets/advanced` | `Navigate` redirect | Compatibility redirect to `/app/support#advanced` |
| `/app/tickets/create` | `Navigate` redirect | Compatibility redirect to `/app/support#create` |
| `/app/tickets/:id/details` | `TicketDetails` | Ticket details with comments pagination via `commentsPage` query param |
| `/app/tickets/:id/treat` | `TreatTicketPage` | Ticket treatment flow |
| `/app/settings` | `SettingsPage` | Account settings workspace for display name updates, profile photo upload/removal, password changes for local accounts, and account/security overview panels |
| `/app/admin` | `AdminDashboard` | Requires `admin`/`super_admin` role |

Authenticated shell behavior:

- All `/app/*` routes render inside a shared sidebar layout.
- Sidebar top: logo link on the left and sidebar toggle on the right.
- Sidebar navigation is priority-ordered with the shared Workspace hub first.
- Primary navigation can include Workspace, Dashboard, Agent Tour, Tour Planning, Tour Operations, Manager Reports, Report Overflow, Citizen Profile, and Challenges depending on role.
- Sidebar bottom: Settings, Support, optional Admin Center, and Sign Out actions.
- Sidebar toggle behavior:
  - Desktop (`min-width: 721px`): docked sidebar that expands/collapses and pushes content; collapsed state persists in browser local storage.
  - Desktop expanded state: toggle is anchored at the right side of the sidebar top row (logo remains visible on the left).
  - Desktop collapsed state: logo stays visible in the collapsed top slot; toggle is revealed in that same logo slot on hover/focus (no left/right jump during collapse/expand transitions).
  - Mobile (`max-width: 720px`): overlay drawer with dimmed backdrop; supports close via toggle, `Esc`, backdrop click, and route navigation.
  - Accessibility: toggle uses `aria-expanded` + `aria-controls`; mobile drawer traps focus while open, sets initial focus into the drawer, restores focus to toggle on close, and prevents background scroll.
- Main content header is sticky and keeps both the page name and account identity (avatar + name) visible while scrolling.
- When a profile photo is configured, the shell account chip reuses that avatar; otherwise it falls back to the default user glyph.
- The page title in the sticky header is derived from the active route, including support/ticket compatibility routes and role-specific workspace pages.
- Non-dashboard `/app/*` workspace pages use full main-section width (`width: 100%`) with container-aware responsive styles, so grid/tab/detail layouts reflow when sidebar width changes (expanded vs compressed), not only on viewport breakpoints.
- Sign Out returns users to the landing page (`/`).
- Role-protected app surfaces use a shared Access Denied presentation pattern (`app-access-denied`).
- Unauthorized authenticated requests for `/app/dashboard` are redirected back to `/app` instead of rendering the dashboard.
- `/app/dashboard` now lazy-loads non-critical analytics panels and a manager heatmap panel after the shell and KPI strip have rendered.
- Settings form behavior:
  - Display name changes are validated client-side before submission.
  - Profile photos accept PNG, JPEG, or WEBP uploads up to 1 MB and are stored as profile/avatar URLs or data URLs.
  - Removing a profile photo clears the stored avatar preview and returns the shell/header avatar to its fallback state.
  - Password changes are available only for `local` accounts; Google SSO accounts are shown provider guidance instead.
- Login/auth error messaging:
  - OAuth and credential failures are announced through assertive `role="alert"` banners.
  - Email and password inputs reference the active auth error banner via `aria-describedby` so screen readers keep the failure context attached to the form controls.

PWA install behavior:

- Browsers that emit `beforeinstallprompt` can show an install banner that lets authenticated users install the app shell for faster relaunch and offline access to cached tours and maps.
- Dismissing the install banner is session-scoped and the banner is suppressed once the app is already running in standalone mode.

## Frontend edge behavior (`app/nginx.conf`)

- `GET /health` is handled at the frontend edge and proxied to the backend health endpoint so the frontend container can act as the public entry point during Docker-based deployments.
- `/api` and `/api/*` are reverse proxied to the backend container, preserving forwarded headers.
- Realtime planning endpoints keep dedicated proxy rules:
  - `/api/planning/ws` enables websocket upgrade headers and long read/write timeouts.
  - `/api/planning/stream` disables proxy buffering/cache so SSE delivery is not delayed.
- Static asset caching is tiered:
  - `/assets/*` uses long-lived immutable caching.
  - `/branding/*` and application icons use shorter cache windows with stale-while-revalidate support.
  - `/manifest.json` must revalidate quickly.
  - `/ecotrack-map-sw.js` is served `no-cache`.
- All remaining paths fall back to `/index.html` so direct browser refreshes keep SPA routing intact.

## Landing sections and hash navigation

Landing section IDs:

- `hero`
- `logos`
- `features`
- `how-it-works`
- `pricing`
- `faq`
- `final-cta`

Landing in-page navigation still uses `/#<section-id>` for section jump behavior.
Footer links now use dedicated content pages (for example `/pricing`, `/terms`, `/privacy`) instead of hash anchors.
Hash navigation is resolved on landing mount with sticky header offset support (`useLandingSectionScroll` + `scroll-margin-top`).

## Marketing/legal info pages

| Path | Primary intent |
| --- | --- |
| `/about` | Company overview |
| `/contact` | Contact and request routing |
| `/security` | Security practices summary |
| `/features` | Product capabilities summary |
| `/how-it-works` | Workflow overview |
| `/pricing` | Commercial model summary |
| `/support` | Support model and escalation guidance |
| `/terms` | Terms summary |
| `/privacy` | Privacy commitments |
| `/cookies` | Cookie usage summary |

## Removed legacy paths

Legacy top-level routes are no longer part of the supported route surface:

- `/auth`
- `/dashboard`
- `/tickets`
- `/tickets/advanced`
- `/tickets/create`
- `/tickets/:id/details`
- `/tickets/:id/treat`
- `/admin`

Requests to these paths now follow the global unknown-route behavior (`*` -> `/`).
