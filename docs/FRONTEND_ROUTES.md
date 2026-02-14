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
| `/app/tickets` | `TicketListPage` | Basic ticket list with delete action |
| `/app/tickets/advanced` | `AdvancedTicketList` | Search and filtering |
| `/app/tickets/create` | `CreateTickets` | Ticket creation form |
| `/app/tickets/:id/details` | `TicketDetails` | Ticket details with comments pagination via `commentsPage` query param |
| `/app/tickets/:id/treat` | `TreatTicketPage` | Ticket treatment flow |
| `/app/settings` | `SettingsPage` | User profile settings (display name update) |
| `/app/admin` | `AdminDashboard` | Requires `admin`/`super_admin` role |

Authenticated shell behavior:

- All `/app/*` routes render inside a shared sidebar layout.
- Sidebar top: logo.
- Sidebar navigation: Dashboard, ticket routes, optional Admin route.
- Sidebar bottom: account identity row (avatar + name, display-only), Settings, and Sign Out actions.
- Sidebar can be collapsed/expanded with a high-visibility toggle button (state persisted in browser local storage).
- Main content header shows current route context as page name only (without a page icon).
- Sign Out returns users to the landing page (`/`).

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
