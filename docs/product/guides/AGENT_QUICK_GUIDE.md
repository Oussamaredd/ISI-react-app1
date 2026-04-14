# Agent Quick Guide

## Goal

Execute assigned collection tours, validate stops, and report anomalies.

## Main route

- Agent tour workspace: `/app/agent/tour`

## Typical flow

1. Open `Daily Agent Tour`, review the Leaflet route map, and confirm the current stop + ETA.
   The route status badge tells you whether the page is using a stored road route or a stored fallback route.
   The Route Overview panel also shows the assigned zone depot/start location and how many mapped containers exist in that zone.
2. Click `Start Tour` once the route is ready; repeated starts do not restart completed tours.
3. Validate only the active stop with collected volume, manual container confirmation, and optional captured device location.
4. Submit anomalies with severity and optional photo URL when blocked/damaged/unsafe conditions are observed.
5. If connectivity drops, the page can fall back to a recent cached tour payload (including persisted API route geometry) and previously viewed map tiles. Overdue or stale cached runs are intentionally discarded instead of being reused indefinitely.
6. Review the in-page activity timeline for start, validation, and anomaly confirmation.
7. The map draws only the current routed stop sequence. Zone containers are still loaded in the background so the page can flag any coverage mismatch between the assigned route and the mapped zone inventory.

## Recovery notes

- `Refresh Tour Data` reloads the latest agent assignment from the API. It does not rebuild persisted geometry.
- `Reload Without Cache` is shown when the page is using cached tour data or the assigned run is overdue.
- Persisted-route rebuild remains a manager/admin action through manager planning/tour operations.

## Related APIs

- `GET /api/tours/agent/me`
- `POST /api/tours/:tourId/start`
- `POST /api/tours/:tourId/stops/:stopId/validate`
- `POST /api/tours/:tourId/anomalies`
- `GET /api/tours/:tourId/activity`
