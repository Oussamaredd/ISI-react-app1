# Citizen Quick Guide

## Goal

Report container issues, track personal impact, and join community challenges.

## Main routes

- Shared citizen entry: `/app`
- Report a container issue: `/app/citizen/report`
- Profile and impact: `/app/citizen/profile`
- Challenges: `/app/citizen/challenges`

## Typical flow

1. After sign-in, open `/app`. If this is your first citizen report, EcoTrack prioritizes a focused onboarding card with one primary action: `Report an issue`.
2. Open `Citizen Report`, locate an existing mapped container, review the latest known status or fill context, and submit the matching typed issue. On web, GPS is optional; if location is unavailable, continue with manual mapped-container selection.
3. Confirm the success message after submission. If the same typed issue was already reported by another citizen recently, EcoTrack records your confirmation without spamming a second manager alert.
4. Return to `/app` for the lighter citizen lane, then open `Citizen Profile` to review points, badges, and history.
5. Open `Citizen Challenges` to enroll and track progress.

## Related APIs

- `POST /api/citizen/reports`
- `GET /api/citizen/profile`
- `GET /api/citizen/history`
- `GET /api/citizen/challenges`
