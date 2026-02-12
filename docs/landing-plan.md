# Landing Page Default + Dedicated Auth Route Plan (Bridgemind-Style)

## Scope and Constraints
- Keep app stack as Vite + React SPA with `react-router-dom`.
- Keep auth logic unchanged:
  - No OAuth flow changes.
  - No provider/callback/token handling changes.
  - Existing backend callback contract remains as-is.
- Do not change environment variables.
- Routing/layout/UI composition refactor is allowed.
- Styling target: shadcn/ui + Tailwind, with optional Framer Motion and Lucide icons.

## Current State Findings

### What was inspected
- Routing entry and host SPA behavior:
  - `app/src/main.tsx:15` mounts `BrowserRouter`.
  - `app/nginx.conf:16` uses SPA fallback (`try_files ... /index.html`).
- App routing/auth gate:
  - `app/src/App.tsx:79` defines app routes.
  - `app/src/App.tsx:126` renders login UI before routes when unauthenticated.
- Auth wiring:
  - `app/src/hooks/useAuth.tsx:22` checks `/api/auth/status`.
  - `app/src/components/LoginButton.tsx:16` links to `/api/auth/google`.
- Backend callback contract (must remain unchanged):
  - `api/src/auth/auth.controller.ts:44` handles `/auth/google/callback`.
  - `api/src/auth/auth.utils.ts:90` redirects frontend with `?auth=true|false`.
- Behavior confirmation:
  - `cd app; npx vitest src/tests/Routing.test.tsx -t "renders login screen when not authenticated" --run` confirms current unauthenticated first screen is `AUTHENTIFICATION PROCESS` (`app/src/tests/Routing.test.tsx:32`).

### Why landing is not the default today
1. Auth gate blocks routing:
   - `app/src/App.tsx:126` returns login screen early when not logged in, so public routes never render.
2. Route tree is nested in authenticated shell:
   - `app/src/App.tsx:64` (`AuthenticatedApp`) contains `Routes`.
3. Root route currently redirects to dashboard:
   - `app/src/App.tsx:100` sends `/` to `/dashboard`.
4. Existing landing route is not in public tree:
   - `app/src/App.tsx:99` defines `/landing` inside authenticated route container.
5. Existing `LandingPage` also hard-redirects when authenticated:
   - `app/src/pages/LandingPage.tsx:10` uses `window.location.href = '/dashboard'`.
6. Docs drift exists:
   - `docs/FRONTEND_ROUTES.md:16` says `/` is public landing, but runtime behavior differs.

### Additional technical constraints observed
- shadcn baseline appears missing:
  - No `app/components.json`.
  - No `app/src/components/ui/*`.
  - No `app/src/lib/utils.ts` `cn()` helper.
- Current global CSS (`app/src/App.css`) styles raw elements (`button`, `a`, etc.), which should be scoped to avoid conflicts with shadcn components.

## Target UX Spec

Goal: `/` is a marketing-first landing with strong Bridgemind-like composition, while auth remains on `/auth` and app product routes remain protected under `/app/*`.

### Landing composition beats
1. Announcement bar (optional)
- Top strip with concise message + inline link CTA.

2. Sticky blurred navbar
- Desktop:
  - Left: brand/logo.
  - Center: section links (`Features`, `How it works`, `Pricing`, `FAQ`).
  - Right: `Log in` text link + primary `Get Started`.
- Mobile:
  - shadcn `Sheet` menu with section links and auth actions.
- Scroll behavior:
  - Starts transparent, becomes blurred/outlined after scroll threshold.

3. Hero section
- Eyebrow badge pill (trust/status message).
- Large headline with gradient-emphasis words.
- Supporting paragraph.
- Two CTAs:
  - Primary: `Get Started`.
  - Secondary: `View Pricing` or `See How It Works`.
- Small social proof line below CTAs.

4. Logo cloud / marquee
- Partner/integration style logos in subtle grayscale.
- Optional marquee loop with pause on hover.

5. Features bento grid
- Asymmetric layout (hero feature card + smaller utility cards).
- Glass cards, icon accents, short value copy.

6. How it works
- 3-step sequence with simple connector visuals.

7. Pricing cards
- 2-3 simple tiers.
- Optional monthly/annual toggle.

8. FAQ accordion
- Collapsible items with clear copy.

9. Final CTA section
- Distinct gradient block, concise headline, single primary action.

10. Multi-column footer
- Product/company/resources/legal columns + small copyright row.

## BridgeMind-Style Design System (Vite SPA)

### Color tokens (explicit)
Define as CSS variables in `app/src/index.css` and mirror in Tailwind theme extension.

- `--bg: #06080f` (base canvas)
- `--surface: rgba(14, 18, 30, 0.72)` (glass panels)
- `--surface-strong: rgba(12, 16, 26, 0.9)` (elevated sections)
- `--border: rgba(148, 163, 184, 0.22)`
- `--text: #f3f7ff`
- `--text-muted: #9ba9bf`
- `--accent: #4f8cff`
- `--accent-strong: #2f6df8`
- `--accent-soft: #8ab4ff`

### Shape and sizing tokens
- Radius:
  - `--radius-sm: 12px`
  - `--radius-md: 16px`
  - `--radius-lg: 24px`
  - `--radius-pill: 999px`
- Button heights:
  - Primary and secondary CTA height: `44px` desktop, `42px` mobile.
- Container width:
  - `max-w-[1200px]` with consistent horizontal padding.

### Glassmorphism rules
- Panel fill: `var(--surface)`.
- Backdrop blur: `blur(12px)` to `blur(18px)`.
- Border: `1px solid var(--border)`.
- Shadow: soft blue-tinted ambient (`0 10px 40px rgba(39, 97, 255, 0.18)`).
- Avoid full opacity surfaces unless section contrast requires it.

### Background recipe (explicit layering)
Apply to landing root in this order:
1. Black base layer: solid `var(--bg)`.
2. Radial glow layer: 2-3 radial gradients (top-center blue, side cyan, bottom subtle).
3. Subtle grid overlay:
   - `repeating-linear-gradient` horizontal and vertical 1px lines.
   - Opacity kept low (3-7%).
4. Vignette:
   - Radial darkening from center to edges to focus hero text.

### Typography scale
- H1:
  - `font-weight: 700/800`
  - `font-size: clamp(2.5rem, 6vw, 5.25rem)`
  - `line-height: 1.03`
  - Slight negative tracking.
- H2:
  - `font-weight: 700`
  - `font-size: clamp(1.8rem, 3.5vw, 3rem)`
  - `line-height: 1.1`
- Body:
  - `font-size: clamp(1rem, 1.2vw, 1.125rem)`
  - `line-height: 1.6`
  - Muted variant uses `--text-muted`.

## Motion & Interactions Spec

### Framer Motion reveal variants
- Section reveal:
  - Initial: `opacity: 0`, `y: 24`, `filter: blur(6px)`.
  - In-view: `opacity: 1`, `y: 0`, `filter: blur(0)`.
  - Transition: `0.5-0.65s`, ease `[0.22, 1, 0.36, 1]`.
- Stagger container:
  - `staggerChildren: 0.08-0.12`.

### Hover and focus interactions
- Cards:
  - Hover lift `translateY(-4px to -6px)`.
  - Border accent increase + soft glow.
- Buttons:
  - Primary hover glow and subtle scale (`1.01`).
  - Secondary uses border/alpha shift.
- Links:
  - Underline fade-in or opacity transition.

### Navbar scroll state
- At top:
  - Transparent background, minimal border.
- After threshold (`window.scrollY > 16`):
  - Blurred glass surface + visible border + compact vertical padding.

### Reduced motion support
- Use `useReducedMotion()` from Framer Motion.
- If reduced motion:
  - Disable translate/blur transitions.
  - Keep opacity-only transitions under `0.2s`.
  - Disable marquee auto-scroll.

## Routing & Layout Plan

### Execution priority
- Phase 1 routing/guard refactor is the delivery priority and must complete before any landing UI build.
- Rationale: this resolves the core bug first (`/` incorrectly showing auth screen) and unblocks parallel UI work with stable route contracts.
- Phase 2 starts only after Phase 1 route matrix tests are green.

### Route groups and guards
- Public marketing routes:
  - `/` (landing shell with sections)
  - Optional `/pricing` and `/faq` if dedicated pages are needed.
- Auth route:
  - `/auth` only, uses existing login trigger component and flow.
- Protected product routes:
  - `/app/*` namespace (`/app/dashboard`, `/app/tickets`, etc.).
- Guard rules:
  - `RequireGuest` for `/auth`.
  - `RequireAuth` for `/app/*`.

### Default behavior
- `GET /`:
  - Unauthenticated: show landing.
  - Authenticated: redirect to `/app/dashboard`.
- `GET /auth`:
  - Unauthenticated: show auth page.
  - Authenticated: redirect to `/app/dashboard`.
- `GET /app/*`:
  - Unauthenticated: redirect to `/auth` (optional `next` query).

### Section-based navigation behavior (Bridgemind-style)
- Canonical section IDs on `/`:
  - `hero`, `logos`, `features`, `how-it-works`, `pricing`, `faq`, `final-cta`.
- From `/`:
  - Navbar links perform smooth scroll to in-page section anchors.
- From non-root routes (`/auth`, `/app/*`, optional `/pricing`):
  - Navbar links navigate to `/#<section-id>` and then scroll to anchor.
  - Implement with hash-based routing + scroll handler on landing mount.
- Sticky header offset:
  - Use `scroll-margin-top` on section wrappers to account for navbar height.
- Active section highlighting:
  - Optional `IntersectionObserver` to update active nav link.

### Deep-link and refresh support
- Keep `BrowserRouter` in `app/src/main.tsx`.
- Keep Nginx rewrite fallback (`app/nginx.conf:16`).
- Ensure hash anchors continue to work with SPA reload and direct links.

### Legacy route compatibility
- Maintain temporary redirects:
  - `/dashboard` -> `/app/dashboard`
  - `/tickets` -> `/app/tickets`
  - `/tickets/advanced` -> `/app/tickets/advanced`
  - `/tickets/create` -> `/app/tickets/create`
  - `/admin` -> `/app/admin`
- Add deprecation guidance for migrated routes:
  - Emit one-time `console.warn` in development when a legacy route is used (include old path and new path).
  - Optionally show a non-blocking in-app notice after redirect ("Bookmark updated: use /app/...").
  - Track planned removal window in docs (`docs/FRONTEND_ROUTES.md`) so bookmark updates can be communicated.

## Component/File Structure Plan

### Routing and layout files
- `app/src/App.tsx` (refactor)
  - Keep providers only.
  - Mount `AppRouter`.
- `app/src/routes/AppRouter.tsx` (new)
  - Central route map for public/auth/protected + legacy redirects.
- `app/src/routes/guards/RequireAuth.tsx` (new)
- `app/src/routes/guards/RequireGuest.tsx` (new)
- `app/src/layouts/PublicLayout.tsx` (new)
- `app/src/layouts/AuthLayout.tsx` (new)
- `app/src/layouts/AppLayout.tsx` (new)

### Landing components (sections folder pattern)
- `app/src/pages/landing/LandingPage.tsx` (new or move/refactor from current file)
- `app/src/components/landing/Navbar.tsx` (new)
- `app/src/components/landing/AnnouncementBar.tsx` (new, optional)
- `app/src/components/landing/sections/HeroSection.tsx` (new)
- `app/src/components/landing/sections/LogoMarqueeSection.tsx` (new)
- `app/src/components/landing/sections/FeaturesBentoSection.tsx` (new)
- `app/src/components/landing/sections/HowItWorksSection.tsx` (new)
- `app/src/components/landing/sections/PricingSection.tsx` (new)
- `app/src/components/landing/sections/FaqSection.tsx` (new)
- `app/src/components/landing/sections/FinalCtaSection.tsx` (new)
- `app/src/components/landing/sections/FooterSection.tsx` (new)

### Optional landing background overlays
- `app/src/components/landing/background/GradientGlow.tsx` (new)
- `app/src/components/landing/background/GridOverlay.tsx` (new)
- `app/src/components/landing/background/Vignette.tsx` (new)

### Auth and utility files
- `app/src/pages/auth/AuthPage.tsx` (new)
  - Reuse existing `LoginButton`.
- `app/src/hooks/useLandingSectionScroll.ts` (new)
  - Parse hash on mount and hash changes.
  - Provide route+scroll helper for navbar links.
- `app/src/hooks/useNavbarScrollState.ts` (new)
  - Detect top vs scrolled nav style state.

### shadcn setup files (if still missing)
- `app/components.json` (new)
- `app/src/lib/utils.ts` (new)
- `app/src/components/ui/button.tsx` (new)
- `app/src/components/ui/sheet.tsx` (new)
- `app/src/components/ui/accordion.tsx` (new)
- `app/src/components/ui/badge.tsx` (new)
- `app/src/components/ui/separator.tsx` (new)
- `app/src/components/ui/switch.tsx` (optional for pricing toggle)

### Styling files
- `app/src/index.css` (refactor)
  - Add design tokens and reusable utility classes for background recipe.
- `app/src/App.css` (refactor or trim)
  - Remove global element-level overrides that conflict with shadcn.

## Implementation Task Checklist

### Phase 0 - repo audit and reproduce
- [x] Confirm current root-cause lines in `App.tsx` and `LandingPage.tsx`.
- [x] Verify auth callback redirect contract is unchanged.
- [x] Confirm current test expectation for login-first boot.
- [x] Freeze route transition matrix before refactor.

### Phase 1 - routing fixes (landing default + dedicated auth route)
- [x] Treat Phase 1 as the blocking priority; do not start landing UI sections until this phase is complete.
- [x] Introduce `AppRouter` and move route tree out of authenticated-only branch.
- [x] Create `RequireAuth` and `RequireGuest` guard wrappers.
- [x] Set `/` to public landing for unauthenticated users.
- [x] Redirect authenticated `/` and `/auth` to `/app/dashboard`.
- [x] Create `/auth` page using existing login button and current flow.
- [x] Move product pages to `/app/*`.
- [x] Add legacy redirects from old top-level app routes.
- [x] Add legacy-route deprecation warnings/notices on redirect (dev console warning + optional one-time UI notice).
- [x] Add hash-aware landing scroll handling for route+scroll navigation.
- [x] Add/expand integration tests during Phase 1 (not deferred):
  - `/` unauthenticated -> landing, `/` authenticated -> `/app/dashboard`.
  - `/auth` unauthenticated -> auth page, `/auth` authenticated -> `/app/dashboard`.
  - `/app/*` unauthenticated -> `/auth`.
  - Legacy paths (`/dashboard`, `/tickets`, etc.) redirect to `/app/*`.

### Phase 2 - landing UI build (Bridgemind-style sections and visuals)
- [x] Phase 2 prerequisite: complete shadcn setup first (`components.json`, `src/lib/utils.ts`, and required `src/components/ui/*` primitives).
- [x] Initialize shadcn primitives (button, sheet, accordion, badge, separator; optional switch) before building any landing section.
- [x] Build optional `AnnouncementBar` with compact height and inline CTA.
- [x] Build sticky `Navbar` with:
  - Center section links.
  - Top-right `Log in` and `Get Started`.
  - Mobile `Sheet` menu.
  - Scroll state transition (transparent to blurred surface).
- [x] Build `HeroSection` with:
  - Badge pill.
  - Gradient-emphasis headline.
  - Two CTA row.
  - Social proof micro-line.
- [x] Build landing background layers:
  - Base dark canvas.
  - Radial glow overlays.
  - Subtle grid overlay.
  - Vignette overlay.
- [x] Build `LogoMarqueeSection`:
  - Static logo row fallback.
  - Optional marquee animation with reduced-motion fallback.
- [x] Build `FeaturesBentoSection`:
  - Asymmetric card layout.
  - Glass cards with accent icon chips and hover glow.
- [x] Build `HowItWorksSection`:
  - 3 step cards with connector/sequence cues.
- [x] Build `PricingSection`:
  - 2-3 pricing cards.
  - Optional monthly/annual toggle.
- [x] Build `FaqSection` using shadcn `Accordion`.
- [x] Build `FinalCtaSection` with gradient treatment and primary CTA.
- [x] Build `FooterSection` with multi-column link groups.
- [x] Wire all section IDs and smooth-scroll behavior for nav links.

### Phase 3 - QA: accessibility, responsive, and route+scroll edge cases
- [x] Validate keyboard and focus states for nav, sheet, buttons, and accordion.
- [x] Validate responsive breakpoints for nav, hero, bento, pricing, and footer.
- [x] Validate section navigation:
  - In-page scroll on `/`.
  - Route+scroll from `/auth` and `/app/*` to landing sections.
  - Correct sticky-header offset using `scroll-margin-top`.
- [x] Validate auth route matrix:
  - `/` unauthenticated -> landing.
  - `/` authenticated -> `/app/dashboard`.
  - `/auth` unauthenticated -> auth page.
  - `/auth` authenticated -> `/app/dashboard`.
  - `/app/*` unauthenticated -> `/auth`.
- [x] Validate reduced-motion behavior (Framer Motion fallback paths).
- [x] Validate refresh/deep-link behavior for both route paths and hash anchors.

### Phase 4 - cleanup, verification, and docs sync
- [x] Remove obsolete login-first rendering branch from `App.tsx`.
- [x] Remove/trim old landing/auth styles in `App.css` that are no longer used.
- [x] Update tests (`Routing.test.tsx`, `App.integration.test.tsx`) to new defaults.
- [x] Run `npm run lint --workspace=ecotrack-app`.
- [x] Run `npm run test --workspace=ecotrack-app`.
- [x] Run `npm run build --workspace=ecotrack-app`.
- [x] Update `docs/FRONTEND_ROUTES.md` with final public/auth/protected route map.

## Acceptance Criteria
- Running locally opens marketing landing at `/` when unauthenticated.
- Navbar top-right includes `Log in` and `Get Started`.
- `Log in` routes to `/auth`, which still uses existing Google OAuth flow unchanged.
- Protected app pages live under `/app/*` and require auth.
- Landing section links scroll correctly on `/`, and route+scroll correctly from non-root routes.
- No env variable changes.
- Build/lint/tests pass.

## Optional Enhancements (later)
- Add analytics events for section impressions and CTA clicks.
- Add SPA meta management for title/description/Open Graph per route.
- Add entrance choreography presets for per-section motion profiles.
- Add testimonials/case-study section between features and pricing.
- Add runtime feature flag to switch marquee animation on/off.

