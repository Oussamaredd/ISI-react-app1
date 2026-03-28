# Mobile Product Readiness

Last updated: 2026-03-28

This runbook defines the Development-only release lane for the Expo client.

## Canonical Command

```bash
npm run quality:mobile-readiness
```

The lane runs:

- `npm run lint --workspace=ecotrack-mobile`
- `npm run typecheck --workspace=ecotrack-mobile`
- `npm run test:coverage --workspace=ecotrack-mobile`
- `node infrastructure/scripts/validate-mobile-readiness.mjs`

## What The Verifier Checks

- the mobile workspace keeps a dedicated coverage lane
- required release dependencies remain repo-owned
- `mobile/.env.example` documents API base, Sentry, environment, and release-version keys
- NetInfo and AppState still drive TanStack Query offline and reconnect behavior
- crash capture, error boundary wiring, and session-to-Sentry tagging remain enabled
- aggregate telemetry still forwards release-aware mobile failures to `/api/errors`
- mobile release tagging stays aligned with the web `VITE_RELEASE_VERSION` model
- key screen and session regression tests remain present

## Evidence Paths

- local: `tmp/quality/mobile-readiness/summary.json`
- CI/CD: `tmp/ci/quality/mobile-readiness/summary.json`

## Offline And Degraded-Network Evidence

- `mobile/src/providers/ReactQueryLifecycleProvider.tsx`
- `mobile/src/tests/ReactQueryLifecycleProvider.test.tsx`
- `mobile/src/tests/SessionProvider.test.tsx`
- `mobile/src/tests/http.advanced.test.ts`

## Crash Capture And Session Tagging

- `mobile/src/providers/AppProviders.tsx` initializes runtime error tracking, the error boundary, and the mobile Sentry session bridge.
- `mobile/src/monitoring/sentry.ts` uses `EXPO_PUBLIC_RELEASE_VERSION` plus role and provider tags.
- `mobile/src/monitoring/clientTelemetry.ts` forwards aggregate mobile failures with release and platform metadata.

## Release Reminder

This lane is a Development release gate. It does not authorize new Security or Data scope.
