# Frontend Routes and Behavior

This React 18 app runs on Vite and React Router (`BrowserRouter` in `app/src/main.tsx`). SPA refresh support is preserved via Nginx fallback rewrite (`app/nginx.conf`) for both local container runs and the production image.

EcoTrack web is the primary desktop surface for manager and admin work. Citizen and agent web routes are retained as companion, demo, testing, and accessibility flows, while the main citizen and agent product story remains mobile-first.

## Route groups

| Path | Auth state | Result |
| --- | --- | --- |
| `/` | Unauthenticated | Marketing landing page for the EcoTrack citizen-first waste reporting and collection coordination prototype |
| `/` | Authenticated | Redirect to `/app` |
| `/about`, `/contact`, `/security`, `/features`, `/how-it-works`, `/pricing`, `/support`, `/terms`, `/privacy`, `/cookies` | Any | Public marketing/legal information pages aligned to citizen reporting, role-based coordination, prototype scope, and platform policy |
| `/login` | Unauthenticated | Login page (Supabase email/password + Google OAuth button) with a cursor-following spotlight overlay on pointer devices and assertive inline auth error announcements |
| `/signup` | Unauthenticated | Supabase-backed account registration page |
| `/forgot-password` | Unauthenticated | Supabase password reset request page |
| `/reset-password` | Unauthenticated | Supabase password reset completion page with legacy token fallback only for compatibility |
| `/auth/callback` | Any | Exchanges the Supabase PKCE/OAuth code in the browser client, restores any pending post-login route, then redirects to `/app/*`; shows loading/error states and a brief success state with a green checkmark before redirect |
| `/app/*` | Unauthenticated | Redirect to `/login` (with `next` query) |
| `/app/*` | Authenticated | Product app pages |
| `/faq` | Any | Compatibility redirect to `/support` |
| any unknown path | Any | Redirect to `/` |

Special case:

- `/#<section-id>` remains accessible for authenticated users to support route+scroll links back to marketing sections.
- The public landing route (`/`) redirects to `/app` only after the browser restores a valid Supabase session; the auth bootstrap no longer calls `/api/auth/status`.
- Route changes reset scroll position to top for public/app pages (hash-only changes are excluded).
- `/auth/callback` deduplicates concurrent exchange attempts for the same auth `code` during the retry window so router remounts and rapid refreshes do not double-submit the exchange request.
- Lazy route boundaries show a shared `Loading EcoTrack` status screen while route bundles are fetched; the landing page now loads lazily so the authenticated app shell is favored in the default route budget.
- Direct-entry performance contract: `/login`, `/app`, and `/app/dashboard` stay in the eager route shell so audits and first-load navigation do not pay an extra lazy-route fetch before the first auth or dashboard paint.
- Public marketing routes publish route-specific title, description, canonical, Open Graph, Twitter, and structured-data metadata aligned to EcoTrack as a citizen-first collection coordination prototype.
- The public sign-in route (`/login`) publishes standard indexable metadata because it is part of the audited public entry surface.
- Sensitive auth routes (`/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`) keep `noindex` metadata so recovery and callback flows stay available to users without becoming search landing pages.

## Product routes (`/app/*`)

| Path | Component | Notes |
| --- | --- | --- |
| `/app` | `AppHomePage` | Shared authenticated role hub; stays lightweight after sign-in and only points users into live workflows when they explicitly open them |
| `/app/dashboard` | `Dashboard` | Primary manager/admin desktop monitoring surface; requires `manager`/`admin`/`super_admin`, otherwise redirects to `/app`. In the low-cost MVP baseline it only opens realtime while the dashboard tab is visible, prefers websocket push, keeps SSE disabled by default, and falls back to 5-minute polling. |
| `/app/citizen/report` | `CitizenReportPage` | Requires `citizen`/`admin`/`super_admin`; web citizen companion flow for reporting issues on existing mapped containers with typed issue selection and latest known seeded/simulated context |
| `/app/citizen/profile` | `CitizenProfilePage` | Requires `citizen`/`admin`/`super_admin`; web follow-up surface for citizen history, current report status, and prototype impact visibility |
| `/app/citizen/challenges` | `CitizenChallengesPage` | Requires `citizen`/`admin`/`super_admin`; otherwise shows Access Denied. Deferred behind `VITE_CITIZEN_CHALLENGES_ENABLED` / `CITIZEN_CHALLENGES_ENABLED` and off by default for the low-cost MVP surface. |
| `/app/agent/tour` | `AgentTourPage` | Requires `agent`/`admin`/`super_admin`; otherwise shows Access Denied. This retained web companion surface supports demo, accessibility, and recovery use cases while mobile remains the primary field-execution lane. Refresh reloads server tour state, while persisted-route rebuild remains a manager-only action. The page is zone-assigned, shows the zone depot/start location, loads all paginated mapped containers for that assigned zone to verify route coverage, and renders only the routed stop sequence on the map with numbered operational markers. When the page is showing an overdue or cached tour snapshot, it also offers `Reload Without Cache` recovery. |
| `/app/manager/planning` | `ManagerPlanningPage` | Primary manager desktop planning surface for route optimization, zone-safe assignment, and manual persisted-route rebuild for the last created tour. The page requires a zone before it lists assignable agents, labels zones by zone name for clarity, and shows the server-side nearest-neighbor + 2-opt optimization summary for the capped four-stop route. |
| `/app/manager/tours` | `ManagerToursPage` | Manager tour operations list for reviewing scheduled tours and rebuilding any persisted route |
| `/app/manager/reports` | `ManagerReportsPage` | Monthly report generation/download/history; email delivery stays disabled until the recipient field contains one plausible address. Deferred behind `VITE_MANAGER_REPORTS_ENABLED` / `PLANNING_REPORTS_ENABLED` and off by default for the low-cost MVP surface. |
| `/app/support` | `SupportPage` | Unified support workspace with Advanced, Simple, and Create views; requires support-workspace access (`agent`/`manager`/`admin`/`super_admin`), otherwise redirects to public `/support` |
| `/app/tickets` | `Navigate` redirect | Compatibility redirect to `/app/support#simple` for support-workspace roles; citizen-only sessions fall back to public `/support` |
| `/app/tickets/advanced` | `Navigate` redirect | Compatibility redirect to `/app/support#advanced` for support-workspace roles; citizen-only sessions fall back to public `/support` |
| `/app/tickets/create` | `Navigate` redirect | Compatibility redirect to `/app/support#create` for support-workspace roles; citizen-only sessions fall back to public `/support` |
| `/app/tickets/:id/details` | `TicketDetails` | Ticket details with comments pagination via `commentsPage` query param; requires support-workspace access, otherwise redirects to public `/support` |
| `/app/tickets/:id/treat` | `TreatTicketPage` | Ticket treatment flow; requires support-workspace access, otherwise redirects to public `/support` |
| `/app/settings` | `SettingsPage` | Account settings workspace for display name updates, profile photo upload/removal, password changes for local accounts, and account/security overview panels |
| `/app/admin` | `AdminDashboard` | Web-only oversight and configuration surface; requires `admin`/`super_admin` role. Deferred behind `VITE_ADMIN_WORKSPACE_ENABLED` / `ADMIN_WORKSPACE_ENABLED` and off by default for the low-cost MVP surface. |

Authenticated shell behavior:

- All `/app/*` routes render inside a shared sidebar layout.
- Protected `/app/*` routes keep the shared session gate visible only while the local Supabase session is restoring, then either open the workspace or fall through to `/login`.
- The shared `/app` role hub does not prefetch citizen profile data on mount; citizen follow-up pages such as `/app/citizen/profile` and `/app/citizen/challenges` load their live data only when opened.
- The role hub and route copy reinforce the intended split: citizens and agents are mobile-first, while managers and admins are web-first.
- Sidebar top: logo link on the left and sidebar toggle on the right.
- Sidebar navigation is priority-ordered with the shared role hub first.
- Primary navigation can include Role Hub, Manager Dashboard, Agent Tour, Tour Planning, Tour Operations, Citizen Reporting, Impact & History, and support/settings depending on role. Manager Reports, Challenges, and Admin Center appear only when their feature flags are enabled.
- Sidebar bottom: Settings, a role-aware Support link (internal support workspace for support-workspace roles, public `/support` for citizen-only sessions), optional Admin Center, and Sign Out actions.
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
- Dashboard query refresh is visibility-aware: when the browser tab is hidden, websocket/SSE activity is suspended and the page resumes on-demand refresh only after the dashboard becomes visible again.
- The citizen follow-up loop currently exposes truthful web visibility through report submission confirmation, history status, resolved-report counts, and prototype impact estimates. Route linkage is not yet exposed directly to citizen web users.
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
- The offline/cache service worker is disabled during local Vite dev so HMR, `/src/*`, `/@vite/*`, and optimized dependency modules stay network-only and cannot drift out of sync with the active dev server.

## Frontend edge behavior (`app/nginx.conf`)

- `GET /health` is handled at the frontend edge and proxied to the backend health endpoint so the frontend container can act as the public entry point during Docker-based deployments.
- `/api` and `/api/*` are reverse proxied to the backend container, preserving forwarded headers.
- Realtime planning endpoints keep dedicated proxy rules:
  - `/api/planning/ws` enables websocket upgrade headers and long read/write timeouts.
  - `/api/planning/stream` disables proxy buffering/cache so SSE delivery is not delayed when the transport is explicitly enabled; the low-cost MVP baseline keeps SSE disabled by default.
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
Public landing copy now describes EcoTrack as a citizen-first waste reporting and collection coordination prototype, with citizen reports as the primary operational signal, simulated measurements as secondary support, manager/admin web workspaces as the main desktop surfaces, and citizen/agent web routes retained as companion experiences.

## Marketing/legal info pages

| Path | Primary intent |
| --- | --- |
| `/about` | Product overview and prototype framing |
| `/contact` | Contact and request routing |
| `/security` | Security practices summary |
| `/features` | Product capabilities summary across citizen reporting, coordination, planning, and execution |
| `/how-it-works` | Workflow overview from citizen signal to validated collection and follow-up |
| `/pricing` | Prototype scope and public framing compatibility route |
| `/support` | Support model and escalation guidance |
| `/terms` | Terms summary |
| `/privacy` | Privacy commitments for account, report, and telemetry data |
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
