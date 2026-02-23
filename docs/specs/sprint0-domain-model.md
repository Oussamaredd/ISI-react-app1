# Sprint 0 Domain Model (EcoTrack)

## Entity Glossary

- `Zone`: geographic or operational area grouping containers.
- `Container`: physical collection point with state, fill level, and location.
- `Tour`: planned collection route for an assigned agent and schedule window.
- `TourStop`: ordered stop in a tour, bound to a specific container.
- `CitizenReport`: citizen-submitted overflow/issue report tied to a container.
- `CollectionEvent`: agent confirmation of collection activity at a stop/container.
- `GamificationProfile`: engagement profile storing points, badges, and progress.

## Role Matrix Mapping

- `citizen`: report issues, consult container and personal gamification views.
- `agent`: execute tours, validate collections, submit operational reports.
- `manager`: supervise zones/tours and consult analytics views.
- `admin`: global administration with full management capabilities.
- `super_admin`: elevated admin operations and platform control.

## Permission Naming Alignment

EcoTrack module permissions are additive and live beside legacy names:

- `ecotrack.containers.read|write`
- `ecotrack.zones.read|write`
- `ecotrack.tours.read|write`
- `ecotrack.citizenReports.read|write`
- `ecotrack.gamification.read|write`
- `ecotrack.analytics.read`
