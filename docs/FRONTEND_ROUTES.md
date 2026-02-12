# Frontend Routes and Behavior

This React 18 app runs on Vite and React Router (`BrowserRouter` in `app/src/main.tsx`). SPA refresh support is preserved via Nginx fallback rewrite (`app/nginx.conf`).

## Route groups

| Path | Auth state | Result |
| --- | --- | --- |
| `/` | Unauthenticated | Marketing landing page |
| `/` | Authenticated | Redirect to `/app/dashboard` |
| `/about`, `/contact`, `/security`, `/features`, `/how-it-works`, `/pricing`, `/support`, `/terms`, `/privacy`, `/cookies` | Any | Public marketing/legal information pages |
| `/auth` | Unauthenticated | Authentication page with existing Google OAuth trigger |
| `/auth` | Authenticated | Redirect to `/app/dashboard` |
| `/app/*` | Unauthenticated | Redirect to `/auth` (with `next` query) |
| `/app/*` | Authenticated | Product app pages |
| `/faq` | Any | Compatibility redirect to `/support` |

Special case:

- `/#<section-id>` remains accessible for authenticated users to support route+scroll links back to marketing sections.
- Route changes reset scroll position to top for public/app pages (hash-only changes are excluded).

## Product routes (`/app/*`)

| Path | Component | Notes |
| --- | --- | --- |
| `/app/dashboard` | `Dashboard` | Main overview |
| `/app/tickets` | `TicketListPage` | Basic ticket list |
| `/app/tickets/advanced` | `AdvancedTicketList` | Search and filtering |
| `/app/tickets/create` | `CreateTickets` | Ticket creation form |
| `/app/tickets/:id/details` | `TicketDetails` | Ticket details |
| `/app/tickets/:id/treat` | `TreatTicketPage` | Ticket treatment flow |
| `/app/admin` | `AdminDashboard` | Requires `admin`/`super_admin` role |

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

## Legacy route redirects (temporary)

The following legacy paths redirect to the `/app/*` namespace:

- `/dashboard` -> `/app/dashboard`
- `/tickets` -> `/app/tickets`
- `/tickets/advanced` -> `/app/tickets/advanced`
- `/tickets/create` -> `/app/tickets/create`
- `/admin` -> `/app/admin`

Additional compatibility redirects are also present for:

- `/tickets/:id/details` -> `/app/tickets/:id/details`
- `/tickets/:id/treat` -> `/app/tickets/:id/treat`

When a legacy route is used:

- A one-time `console.warn` is emitted in development.
- A non-blocking in-app banner is shown after redirect.

Planned removal window for legacy redirects: after one stable release cycle once bookmarks are updated.
