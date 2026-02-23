# Agent Quick Guide

## Goal

Execute assigned collection tours, validate stops, and report anomalies.

## Main route

- Agent tour workspace: `/app/agent/tour`

## Typical flow

1. Open `Daily Agent Tour` and click `Start Tour`.
2. Validate each active stop with collected volume and optional QR/manual fallback.
3. Submit anomalies when blocked/damaged/unsafe conditions are observed.
4. Review the in-page activity timeline for tour event confirmation.

## Related APIs

- `GET /api/tours/agent/me`
- `POST /api/tours/:tourId/start`
- `POST /api/tours/:tourId/stops/:stopId/validate`
- `POST /api/tours/:tourId/anomalies`
- `GET /api/tours/:tourId/activity`
