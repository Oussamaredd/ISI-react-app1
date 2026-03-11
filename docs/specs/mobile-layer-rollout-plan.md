# Mobile Layer Rollout Plan

Last updated: 2026-03-11

## Goal

Add an in-repo `mobile` layer for EcoTrack using React Native / Expo, with the existing `poemapp` starter as the initial shell for navigation and UI composition.

## Starter Assessment

Observed in `poemapp`:
- Expo Router app with a root stack and tab navigation.
- React Native Paper UI foundation.
- AsyncStorage-backed demo login state.
- Citizen-friendly tab surfaces (`dashboard`, `container report`, `gamification`, `history`, `schedule`).

Implication:
- The starter is suitable for EcoTrack citizen-first mobile UX.
- It is not production-ready as-is because auth, data fetching, env handling, branding, and API integration are still stubbed or hardcoded.

## Architecture Decisions For Phase 1

- Treat `mobile` as a fifth monorepo layer alongside `app`, `api`, `database`, and `infrastructure`.
- Keep `mobile` as a client-only layer. It consumes APIs and device capabilities, but never imports server/runtime code from other layers.
- Keep the existing `api` and `database` ownership model unchanged. Mobile integration is additive at the client edge.
- Use Expo Router as the navigation baseline for the first mobile iteration.
- Use `EXPO_PUBLIC_*` env keys only for mobile public config, with `EXPO_PUBLIC_API_BASE_URL` as the canonical API base key.

## Delivery Phases

### Phase 1: Architecture and Contracts

- Update repo architecture docs to recognize `mobile` as a first-class layer.
- Update env rules to cover Expo public env files.
- Lock the adaptation strategy for `poemapp` so future work does not copy demo logic directly into EcoTrack.

### Phase 2: Workspace Bootstrap

- Create `mobile/package.json` as `ecotrack-mobile`.
- Copy the minimal starter shell from `poemapp`:
  - Expo config
  - router structure
  - assets that are still useful after rebranding
  - baseline lint/typecheck/test scripts
- Remove demo-only credentials, fake local auth, and starter branding during import.

### Phase 3: Platform Integration

- Replace AsyncStorage-only auth with EcoTrack token/session handling.
- Introduce a typed mobile API client for auth, citizen reports, gamification, history, and schedule flows.
- Add role-aware routing so citizen-first flows land first without blocking future agent/manager expansion.
- Move device features behind adapters for location, media capture, notifications, and secure storage.

Current status:
- Implemented in `mobile` with an internal `@api` service boundary.
- Local email/password auth now uses the live backend login and status contracts.
- Citizen dashboard, reports, challenges, and history are connected to live API state.
- Role-aware branches now exist for citizen tabs, agent summary, and manager summary.
- Agent mobile operations now cover assigned-tour start, active-stop validation with optional device GPS capture, anomaly submission, and recent route activity.
- Manager mobile operations now cover report generation, history, regenerate, and authenticated export download/share.
- React Query lifecycle is bound to Expo app focus and network reachability so query refresh behavior stays consistent on native clients.

### Phase 4: Quality Gates

- Add mobile workspace lint, typecheck, and test commands to repo automation.
- Add env validation coverage for `mobile/.env.example` and `mobile/.env.local` once those files exist.
- Add CI path filtering so mobile changes do not force unrelated platform jobs.

## Route Adaptation Plan

| `poemapp` route | EcoTrack target |
| --- | --- |
| `login` | EcoTrack auth entry |
| `(tabs)/index` | citizen dashboard |
| `(tabs)/signalement-conteneur` | citizen report creation |
| `(tabs)/gamification` | citizen challenges |
| `(tabs)/historique` | citizen history / personal impact |
| `(tabs)/horaire` | schedule / collection calendar |

## Known Risks

- Expo/native clients cannot rely on the browser proxy contract used by `app`; mobile needs a directly reachable API origin.
- The starter currently stores auth state in AsyncStorage only; secure token storage needs a stricter replacement.
- If we later want shared client contracts between `app` and `mobile`, that should be a separate shared package rather than direct cross-imports.

## Next Implementation Step

Finalize the role-specific schedule/calendar strategy without widening the client boundary beyond `screen -> client/service -> API`. Keep the `@api` boundary stable and avoid reintroducing demo credentials, local-only auth logic, or direct cross-layer imports.
