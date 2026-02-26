# Frontend Routes and Behavior

This React 18 app runs on Vite and React Router (`BrowserRouter` in `app/src/main.tsx`). SPA refresh support is preserved via Nginx fallback rewrite (`app/nginx.conf`).

## Route groups

| Path | Auth state | Result |
| --- | --- | --- |
| `/` | Unauthenticated | Marketing landing page |
| `/` | Authenticated | Redirect to `/app/dashboard` |
| `/about`, `/contact`, `/security`, `/features`, `/how-it-works`, `/pricing`, `/support`, `/terms`, `/privacy`, `/cookies` | Any | Public marketing/legal information pages |
| `/login` | Unauthenticated | Login page (local email/password + Google OAuth button) with a cursor-following spotlight overlay on pointer devices |
| `/signup` | Unauthenticated | Local account registration page |
| `/forgot-password` | Unauthenticated | Password reset request page |
| `/reset-password` | Unauthenticated | Local password reset page |
| `/auth/callback` | Any | Exchanges one-time auth code, then redirects to `/app/*`; shows loading/error states and a brief success state with a green checkmark before redirect |
| `/app/*` | Unauthenticated | Redirect to `/login` (with `next` query) |
| `/app/*` | Authenticated | Product app pages |
| `/faq` | Any | Compatibility redirect to `/support` |
| any unknown path | Any | Redirect to `/` |

Special case:

- `/#<section-id>` remains accessible for authenticated users to support route+scroll links back to marketing sections.
- Route changes reset scroll position to top for public/app pages (hash-only changes are excluded).

## Product routes (`/app/*`)

| Path | Component | Notes |
| --- | --- | --- |
| `/app/dashboard` | `Dashboard` | Main overview |
| `/app/citizen/report` | `CitizenReportPage` | Requires `citizen`/`admin`/`super_admin`; otherwise shows Access Denied |
| `/app/citizen/profile` | `CitizenProfilePage` | Requires `citizen`/`admin`/`super_admin`; otherwise shows Access Denied |
| `/app/citizen/challenges` | `CitizenChallengesPage` | Requires `citizen`/`admin`/`super_admin`; otherwise shows Access Denied |
| `/app/agent/tour` | `AgentTourPage` | Requires `agent`/`admin`/`super_admin`; otherwise shows Access Denied |
| `/app/manager/planning` | `ManagerPlanningPage` | Manager route optimization and assignment |
| `/app/manager/reports` | `ManagerReportsPage` | Monthly report generation/download/history |
| `/app/support` | `SupportPage` | Unified support workspace with Advanced, Simple, and Create views |
| `/app/tickets` | `Navigate` redirect | Compatibility redirect to `/app/support#simple` |
| `/app/tickets/advanced` | `Navigate` redirect | Compatibility redirect to `/app/support#advanced` |
| `/app/tickets/create` | `Navigate` redirect | Compatibility redirect to `/app/support#create` |
| `/app/tickets/:id/details` | `TicketDetails` | Ticket details with comments pagination via `commentsPage` query param |
| `/app/tickets/:id/treat` | `TreatTicketPage` | Ticket treatment flow |
| `/app/settings` | `SettingsPage` | User profile settings (display name update) |
| `/app/admin` | `AdminDashboard` | Requires `admin`/`super_admin` role |

Authenticated shell behavior:

- All `/app/*` routes render inside a shared sidebar layout.
- Sidebar top: logo.
- Sidebar navigation is priority-ordered with Dashboard first.
- Sidebar bottom: account identity row (avatar + name, display-only), Settings, Support, optional Admin Center, and Sign Out actions.
- Sidebar can be collapsed/expanded with a high-visibility toggle button (state persisted in browser local storage).
- Main content header shows current route context as page name only (without a page icon).
- Sign Out returns users to the landing page (`/`).
- Role-protected app surfaces use a shared Access Denied presentation pattern (`app-access-denied`).

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
