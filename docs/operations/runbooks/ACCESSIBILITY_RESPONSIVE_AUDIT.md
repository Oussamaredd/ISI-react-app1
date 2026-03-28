# Accessibility And Responsive Audit

Last updated: 2026-03-28

Scope: Development-only release-critical flows across web and mobile.

## Automated Evidence

Web:

- `app/src/tests/e2e.key-journeys.test.tsx`
- `app/src/tests/LoginPage.test.tsx`
- `app/src/tests/Dashboard.test.tsx`
- `app/src/tests/ManagerReportsPage.test.tsx`
- `app/src/tests/SettingsPage.test.tsx`
- `app/src/tests/SystemSettings.test.tsx`

Mobile:

- `mobile/src/tests/LoginScreen.test.tsx`
- `mobile/src/tests/ReportScreen.test.tsx`
- `mobile/src/tests/ManagerHomeScreen.test.tsx`
- `mobile/src/tests/AgentHomeScreen.test.tsx`
- `mobile/src/tests/SessionProvider.test.tsx`
- `mobile/src/tests/ReactQueryLifecycleProvider.test.tsx`

## Checklist Status

- [x] Keyboard-only flows reach the primary actions on landing, login, planning, reports, and role home screens.
- [x] Critical forms expose stable visible labels rather than placeholder-only identification.
- [x] Validation and async failure messages are surfaced through explicit `role="alert"` or equivalent mobile helper text.
- [x] Dashboard and report screens expose loading, empty, retry, and degraded states instead of silent failures.
- [x] Admin settings now announce save, reset, dispatch, and failure outcomes through explicit live-region messaging.
- [x] Mobile login, reporting, manager, and agent flows expose actionable labels and status copy in workflow context.

## Manual Release Spot Checks

Run these checks before closing a release candidate:

- Landing: tab from top navigation into the primary CTA and verify escape paths back to `/`.
- Login: submit an invalid credential pair and verify the failure is announced without relying on color alone.
- Dashboard: confirm loading, degraded, and realtime state chips are visible and readable at narrow and desktop widths.
- Planning: confirm optimization status and skipped-container explanations remain readable on tablet and desktop widths.
- Reports: confirm history loading, empty, error, retry, generate, and download states all remain reachable by keyboard.
- Admin settings: confirm save, reset, and test-dispatch actions announce success or failure without relying on toast visuals only.
- Mobile login: validate field labels, validation copy, password toggle, forgot-password action, and sign-up navigation.
- Mobile reporting: validate search, selection, submission, success copy, and point-award messaging.
- Mobile manager: validate loading, report generation, download/share feedback, and history visibility.
- Mobile agent: validate start, GPS attach, stop validation, anomaly submission, and manager-alert confirmation messaging.

## Notable Contracts

- Web login uses explicit alert banners for auth failures.
- Web dashboard keeps a polite live status chip for realtime transport state.
- Manager reports preserve loading, empty, and retry states in the history panel.
- Admin settings preserve both visible toast feedback and non-visual live-region feedback.
- Mobile release checks are paired with `docs/operations/runbooks/MOBILE_PRODUCT_READINESS.md`.
