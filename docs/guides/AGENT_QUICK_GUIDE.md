# Agent Quick Guide

## Goal

Execute assigned collection tours, validate stops, and report anomalies.

## Main route

- Agent tour workspace: `/app/agent/tour`

## Typical flow

1. Open `Daily Agent Tour`, review the OpenStreetMap route overview, and confirm the current stop + ETA.
2. Click `Start Tour` once the route is ready; repeated starts do not restart completed tours.
3. Validate only the active stop with collected volume, manual container confirmation, and optional captured device location.
4. Submit anomalies with severity and optional photo URL when blocked/damaged/unsafe conditions are observed.
5. Review the in-page activity timeline for start, validation, and anomaly confirmation.

## Related APIs

- `GET /api/tours/agent/me`
- `POST /api/tours/:tourId/start`
- `POST /api/tours/:tourId/stops/:stopId/validate`
- `POST /api/tours/:tourId/anomalies`
- `GET /api/tours/:tourId/activity`
