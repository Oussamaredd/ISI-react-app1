# Citizen First-Report Onboarding Spec

Last updated: 2026-04-17

## Purpose

Define the formal Development-scope onboarding contract for authenticated citizens entering the shared web host at `/app`.

This spec closes the current gap between:

- the shared authenticated host contract in `docs/product/FRONTEND_ROUTES.md`
- citizen reporting and engagement use cases in `UC-C01`, `UC-C02`, and `UC-C03`
- the existing mapped-container citizen report flow already implemented in `app`, `api`, and `database`

## Scope

- Applies to the web `app` workspace only.
- Governs citizen first-run behavior at `/app`.
- Reuses the existing web citizen report flow at `/app/citizen/report`.
- Reuses existing citizen follow-up surfaces at `/app/citizen/profile` and `/app/citizen/challenges`.
- Treats web as a citizen companion surface; mobile remains the primary citizen experience when device capabilities matter.
- Does not redesign the mapped-container report flow into a different product pattern.
- Does not add Cyber-Security or Data-Science specialty implementation.

## Governing References

- `docs/specs/SOURCE_OF_TRUTH.md`
- `docs/specs/source-of-truth.dev.json`
- `docs/specs/cdc-traceability-matrix.dev.json`
- `docs/specs/mobile-platform-integration-contract.md`
- `docs/product/FRONTEND_ROUTES.md`
- `docs/product/guides/CITIZEN_QUICK_GUIDE.md`
- `docs/api/API_DOCUMENTATION.md`

## Existing Contracts Reused

- Shared authenticated web host: `/app`
- Citizen report route: `/app/citizen/report`
- Citizen profile/history route: `/app/citizen/profile`
- Citizen challenges route: `/app/citizen/challenges`
- Citizen report API: `POST /api/citizen/reports`
- Citizen profile API: `GET /api/citizen/profile`
- Citizen history API: `GET /api/citizen/history`
- Citizen challenges API: `GET /api/citizen/challenges`

## Web `/app` First-Run Contract

When an authenticated session has citizen access and the citizen has not yet completed onboarding:

- `/app` must prioritize a citizen onboarding treatment ahead of the generic shared workspace launcher.
- The onboarding treatment must present one dominant primary action: `Report an issue`.
- That primary action must route into the existing web report surface at `/app/citizen/report`.
- The onboarding copy must stay lightweight and explain that the first milestone is one valid report on an already mapped container.
- The onboarding copy should explicitly avoid presenting web as the primary citizen channel; it must frame web as a companion or fallback path.
- Secondary actions may appear only after the primary action area and should stay lightweight.
- Non-citizen roles must keep the current shared `/app` behavior.
- Multi-role users that also have citizen access may still see their other role lanes, but the citizen first-report treatment takes priority at the top of `/app` until the citizen first-report milestone is complete.

## Primary First Action

The primary first action is:

- submit the first valid citizen report on an existing mapped container through the current report flow

The report flow stays responsible for:

- mapped-container selection
- typed issue selection
- optional descriptive details
- optional web geolocation capture when relevant

## Onboarding Completion Criteria

The completion rule is derived from existing domain data:

- a citizen is considered onboarded once `GET /api/citizen/profile` reports `impact.reportsSubmitted >= 1`

Implementation rules:

- do not add a dedicated onboarding persistence field
- do not add a separate onboarding table
- do not introduce API or database changes if the existing profile or report history contract can derive the milestone cleanly

If the citizen progress snapshot cannot be loaded:

- `/app` should fall back to a safe citizen entry treatment that still keeps `Report an issue` available
- the UI must avoid claiming the citizen is onboarded when the milestone cannot be verified

## Empty, Blocked, and Recovery States

The onboarding or report guidance layer must make these states explicit:

| State | Required behavior |
| --- | --- |
| unauthenticated or session expired | protected web routes keep existing auth redirect behavior and preserve the requested destination |
| no citizen access | do not show citizen onboarding; preserve shared `/app` behavior and existing citizen route guards |
| GPS unavailable or denied | explain that web GPS is optional and the citizen can still select an existing mapped container manually |
| no nearby containers | web onboarding must not depend on a nearby-only flow; recovery is the full mapped-container selection flow |
| invalid or nonexistent container | explain that the selected mapped container is no longer available and the citizen must reload or choose another mapped container |
| duplicate recent report | explain that the citizen already reported the same issue recently and direct them toward history or profile instead of pretending a second new report was created |
| failed submission | show explicit retry guidance without replacing the report flow with a new experience |

## Returning-Citizen Behavior

After the first successful valid report:

- `/app` must no longer show the full first-run onboarding treatment
- `/app` should switch the citizen lane to a lighter returning-user experience
- the returning-user experience keeps one primary report action
- profile/history follow-up and challenges remain accessible as secondary actions
- onboarding-heavy instructional copy should not be repeated once the first-report milestone is complete

## Surface Boundaries

### Web

- owns the shared `/app` onboarding behavior defined in this spec
- may add lightweight report-page guidance where current state messaging is insufficient

### Mobile

- keeps its own citizen-first entry under Expo tabs
- remains governed by `docs/specs/mobile-platform-integration-contract.md`
- is not forced into parity with the shared web `/app` host because mobile does not use that host model

### API and Database

- continue to expose the existing citizen report, profile, history, and challenge contracts
- should not receive dedicated onboarding persistence for this feature unless derived completion becomes impossible

## Non-Goals

- no separate onboarding workflow engine
- no Security/Data specialty onboarding deliverables
- no report-flow redesign into a mobile-style map-first web experience
- no change to non-citizen `/app` routing policy

## Traceability

- `UC-C01` Citizen overflow report
- `UC-C02` Citizen profile/history
- `UC-C03` Citizen challenges
