# Citizen Quick Guide

## Goal

Report overflowing containers, track personal impact, and join community challenges.

## Main routes

- Report overflow: `/app/citizen/report`
- Profile and impact: `/app/citizen/profile`
- Challenges: `/app/citizen/challenges`

## Typical flow

1. Open `Citizen Report`, use search or the floating GPS map control to locate a mapped container, review the color-coded fill progress (green under 50%, warning at 50-75%, red above 75%), and tap a container from GPS-ranked shortcuts, search results, nearby lists, map markers, or offscreen arrows to recenter on it and open its info popup instantly. The popup stays open until you tap elsewhere or choose another container, and it only shows the container name plus its progress tag. Offscreen arrows still jump to the nearest container in an overlap cluster. Once a container is selected, open the composer from the map or selected-container area, then submit the issue details with optional location/photo evidence.
2. If you add photo evidence before live location is available, the composer keeps the photo and prompts you to refresh location before final submit.
3. Confirm success message after submission.
4. Open `Citizen Profile` to review points, badges, and history.
5. Open `Citizen Challenges` to enroll and track progress.

## Related APIs

- `POST /api/citizen/reports`
- `GET /api/citizen/profile`
- `GET /api/citizen/history`
- `GET /api/citizen/challenges`
