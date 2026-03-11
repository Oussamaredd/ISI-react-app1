# Citizen Quick Guide

## Goal

Report overflowing containers, track personal impact, and join community challenges.

## Main routes

- Report overflow: `/app/citizen/report`
- Profile and impact: `/app/citizen/profile`
- Challenges: `/app/citizen/challenges`

## Typical flow

1. Open `Citizen Report`, optionally enable GPS to center the map on your position and show nearby containers with shortcuts and arrows, then submit container, description, and optional location/photo.
2. Confirm success message after submission.
3. Open `Citizen Profile` to review points, badges, and history.
4. Open `Citizen Challenges` to enroll and track progress.

## Related APIs

- `POST /api/citizen/reports`
- `GET /api/citizen/profile`
- `GET /api/citizen/history`
- `GET /api/citizen/challenges`
