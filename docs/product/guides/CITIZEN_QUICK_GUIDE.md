# Citizen Quick Guide

## Goal

Report container issues, follow what happened afterward, and join community challenges.

EcoTrack is mobile-first for citizens. The web citizen flow remains available as a companion, demo, testing, and accessibility surface when mobile-only device features are unavailable.

## Main routes

- Shared citizen entry: `/app`
- Report a container issue: `/app/citizen/report`
- Profile and impact: `/app/citizen/profile`
- Challenges: `/app/citizen/challenges`

## Typical flow

1. After sign-in, open `/app`. If this is your first citizen report, EcoTrack prioritizes a focused onboarding card with one primary action: `Report an issue`.
2. Open `Citizen Reporting`, locate an existing mapped container, review the latest known status or fill context, and submit the matching typed issue. On web, GPS is optional; if location is unavailable, continue with manual mapped-container selection.
3. Confirm the success message after submission. If the same typed issue was already reported by another citizen recently, EcoTrack records your confirmation against the existing signal instead of creating a duplicate manager alert.
4. Return to `/app` for the lighter citizen lane, then open `Impact & History` to review report status, resolved-report totals, and current follow-up visibility.
5. Open `Citizen Challenges` to enroll and track progress.

## Current feedback-loop truth

- The current web citizen follow-up surface shows the report confirmation, history status, and resolved-report totals.
- Prototype impact estimates are visible, but they are still seeded/prototype calculations rather than proof from deployed hardware.
- Direct route or tour linkage is not yet exposed to citizens; `Impact & History` is the nearest truthful follow-up surface today.

## Related APIs

- `POST /api/citizen/reports`
- `GET /api/citizen/profile`
- `GET /api/citizen/history`
- `GET /api/citizen/challenges`
