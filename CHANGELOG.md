# Changelog

All notable changes to this repository are documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

Historical work completed before 2026-03-11 was not backfilled release-by-release. This file is the authoritative release log from that date forward.

## [Unreleased]

### Added
- An in-repo `mobile` Expo workspace with live auth/session restore, citizen reporting/history/challenges flows, agent tour execution actions, manager report export actions, secure storage, media/location adapters, and mobile-specific tests.
- Mobile API base helper scripts for LAN, Android emulator, iOS simulator, and tunnel-based Expo startup.
- Repository-local git hook installation plus automated doc-sync validation support for commits and CI.
- C4-style Mermaid architecture diagrams in `docs/ARCHITECTURE_OVERVIEW.md`.
- A code annotation convention guide in `docs/CODE_ANNOTATION_CONVENTIONS.md`.
- A release and versioning guide in `docs/RELEASE_VERSIONING.md`.
- Additional API and app regression coverage around citizen reporting, manager planning, permissions, tickets, and agent tour behavior.

### Changed
- Root documentation now reflects the five-layer monorepo contract, mobile developer workflow, env handling, and validation commands.
- CDC and mobile integration specs now trace the mobile agent and manager operational flows, including report history/download/regenerate and agent anomaly/activity support.
- CI and infrastructure scripts now cover repo-local hook bootstrap, doc-sync validation, mobile API base resolution, and expanded env validation behavior.
- Auth callback and reset-password client flows, request correlation handling, and citizen report validation/storage contracts were tightened across the web and API layers.
- Release tracking now uses the root `CHANGELOG.md` plus annotated Git tags for future deliveries.

## [1.0.0] - 2026-03-11

### Added
- The documented release baseline for the EcoTrack monorepo across `app`, `mobile`, `api`, `database`, `infrastructure`, and `docs`.
- A formal release/versioning process for future tagged deliveries.
