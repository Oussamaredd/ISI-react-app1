# DB Schema Namespace Rollout Status

Last updated: 2026-03-06

## Purpose

This document preserves the implementation status that previously lived in `docs/PR_TASKS.md` before `PR_TASKS.md` was repurposed for the active deployment-platform rollout.

Use this file together with:

- `docs/DB_SCHEMA_NAMESPACE_PLAN.md` for the approved target model
- repository history for the exact implementation diffs

## Current Readiness Status

Overall status: `IMPLEMENTED IN DIRTY WORKTREE - DATABASE AND API VALIDATION PASSED WITH KNOWN EXCEPTIONS`

Known readiness exceptions from the original rollout pass:

- the worktree still had broad unrelated local changes across `app`, `api`, `database`, `docs`, environment templates, and `package-lock.json`
- the implementation was completed in-place and not on an isolated branch
- `pg_dump` was not available in the active environment, so no in-workspace pre-migration backup artifact was captured
- PostGIS was not installed in the active dev database, so conditional geometry columns and GiST indexes were intentionally skipped
- no in-repo runtime dependency on legacy `public.<table>` names was found, so no compatibility views were added
- the in-scope API layer compiled, linted, and passed its test suite against the updated database package despite unrelated worktree noise

## Readiness Gate Status

### Worktree Cleanup And Isolation

Status summary:

- `PARTIAL`: implementation went forward successfully, but worktree and branch isolation remained incomplete

Checklist:

- [ ] Decide whether the original unrelated local changes should be committed, stashed, or split before DB work starts.
- [x] Remove overlap risk in `database/schema/index.ts` by reconciling existing local edits before the namespace refactor begins.
- [x] Reconcile the existing local changes in `database/migrations/meta/_journal.json` before adding new migrations.
- [x] Decide whether `database/migrations/0011_legal_captain_universe.sql` is a legitimate baseline migration to keep, rename, or replace.
- [x] Decide whether `database/migrations/meta/0011_snapshot.json` is the accepted baseline snapshot.
- [ ] Confirm the implementation branch is isolated from unrelated app/API/UI work.
- [x] Re-run `git status --short` and confirm there are no unresolved merge conflicts.

### Pre-Implementation Baseline

Status summary:

- `PARTIAL`: the technical baseline was mostly established, but external dependency confirmation and backup capture were incomplete

Checklist:

- [x] Treat `docs/DB_SCHEMA_NAMESPACE_PLAN.md` as the approved namespace design baseline.
- [x] Confirm the current 22-table inventory from the latest accepted database snapshot.
- [ ] Confirm no external consumers depend on hardcoded `public.<table>` names, or explicitly list the ones that do.
- [ ] Capture a dev database backup or restore point before any schema move migration is applied.
- [x] Confirm whether PostGIS is already enabled in the dev database.

## Implementation Task Status

### Task 1 - Phase 0 Inventory And Compatibility Audit

Status summary:

- `DONE`

Checklist:

- [x] Search repo runtime code for hardcoded `public.` references.
- [x] Search migration SQL for hardcoded `public.` references.
- [x] Inventory all current business tables by schema and row count.
- [x] Confirm the expected target schema for each of the 22 current tables.
- [x] Identify any raw SQL, scripts, or manual queries that assume `public`.
- [x] Document whether a temporary compatibility layer will be needed.

### Task 2 - Drizzle Namespace Refactor In Source

Status summary:

- `DONE`

Checklist:

- [x] Add `pgSchema()` definitions for `auth`, `core`, `iot`, `ops`, `incident`, `notify`, `game`, `audit`, `admin`, `export`, and `support`.
- [x] Move `users`, `password_reset_tokens`, `roles`, and `user_roles` to `auth`.
- [x] Move `zones` and `containers` to `core`.
- [x] Move `tours`, `tour_stops`, `tour_routes`, and `collection_events` to `ops`.
- [x] Move `citizen_reports`, `anomaly_types`, and `anomaly_reports` to `incident`.
- [x] Move `gamification_profiles`, `challenges`, and `challenge_participations` to `game`.
- [x] Move `audit_logs` to `audit`.
- [x] Move `system_settings` to `admin`.
- [x] Move `report_exports` to `export`.
- [x] Move `tickets`, `comments`, and `attachments` to `support`.
- [x] Update all Drizzle relations so cross-schema references still compile cleanly.

### Task 3 - Manual Migration For Schema Moves

Status summary:

- `DONE`

Checklist:

- [x] Create one hand-authored migration that creates all target schemas.
- [x] Add `ALTER TABLE ... SET SCHEMA ...` statements for all 22 existing tables.
- [x] Verify cross-schema foreign keys remain valid after table moves.
- [x] Ensure the migration does not drop and recreate tables unnecessarily.
- [x] Keep `public` empty of business tables after the move unless compatibility views are explicitly required.

### Task 4 - Add Missing CDC-Scope Tables

Status summary:

- `DONE`

Checklist:

- [x] Add `core.container_types`.
- [x] Add `iot.sensor_devices`.
- [x] Add `iot.measurements`.
- [x] Add `admin.alert_rules`.
- [x] Add `incident.alert_events`.
- [x] Add `notify.notifications`.
- [x] Add `notify.notification_deliveries`.
- [x] Add only OLTP storage/query structures; do not add DW, ETL, ML, or ingestion pipeline artifacts.

### Task 5 - Additive Changes To Existing Tables

Status summary:

- `PARTIAL`

Checklist:

- [ ] Add `boundary_geom` to `core.zones` if PostGIS is enabled. Blocked because PostGIS was unavailable in the active dev database.
- [ ] Add `location_geom` and `container_type_id` to `core.containers`. Partial because `container_type_id` was added, but `location_geom` was skipped because PostGIS was unavailable.
- [x] Decide whether `latitude` and `longitude` remain temporarily during backfill.
- [ ] Add `route_geom` to `ops.tour_routes` if PostGIS is enabled. Blocked because PostGIS was unavailable in the active dev database.
- [x] Add `started_at` and `completed_at` to `ops.tours`.
- [x] Keep helpdesk tables isolated in `support` and do not fold them into CDC core domains.
- [x] Keep `support.attachments` intact; only note optional later reuse for incident media.

### Task 6 - Optional Compatibility Layer

Status summary:

- `DONE - NOT NEEDED`

Checklist:

- [x] Confirm whether any real dependency still requires legacy `public.<table>` names.
- [x] If needed, add temporary read-only `public` views for legacy consumers. Not needed; none were added.
- [x] Do not add writable compatibility triggers unless there is a proven blocker.
- [x] Define a deprecation window for the compatibility views. Not needed; no views were added.
- [x] Add a removal task for those views in the next cleanup PR. Not needed; no views were added.

### Task 7 - Indexes, Partitioning, And Practical Constraints

Status summary:

- `DONE`

Checklist:

- [x] Add only operational indexes needed for dashboard and API queries.
- [x] Add composite indexes aligned with filter and sort patterns for active alerts, latest measurements, active tours, and export history.
- [x] Add GiST indexes for geometry columns if PostGIS columns are introduced. Not applicable in that pass because no PostGIS columns were introduced.
- [x] Design `iot.measurements` for monthly range partitioning on `measured_at`.
- [x] Avoid broad retrofitting of PostgreSQL enums during the namespace move.
- [x] Keep status fields practical: use app enums or narrow checks first, DB enums only where stable.

### Task 8 - Snapshot, Migration Metadata, And Validation

Status summary:

- `DONE`

Checklist:

- [x] Refresh the Drizzle snapshot only after source definitions and manual migration SQL are aligned.
- [x] Update migration journal metadata only after migration order is final.
- [x] Run `npm run build --workspace=ecotrack-database`.
- [x] Run `npm run typecheck --workspace=ecotrack-database`.
- [x] Run `npm run db:migrate --workspace=ecotrack-database`.
- [x] Verify no business tables remain in `public`.
- [x] Verify row counts match before and after the schema move.
- [x] Verify representative inserts and reads for `auth`, `ops`, `incident`, `notify`, and `iot`.

### Task 9 - App And API Smoke Validation After DB Cutover

Status summary:

- `DONE`

Notes:

- database smoke validation completed
- the API layer compiled, linted, and passed test validation against the updated database package

Checklist:

- [x] Verify auth login and role-protected routes still work.
- [x] Verify citizen report creation still persists successfully.
- [x] Verify tour creation, assignment, start, and stop validation still persist.
- [x] Verify anomaly reporting still persists and can be queried.
- [x] Verify manager dashboard reads still return containers, alerts, and report exports.
- [x] Verify support tickets, comments, and attachments still work with the isolated `support` schema.

## Exit Criteria Status

Status summary:

- `PARTIAL`: the namespace rollout itself was implemented and validated, but branch/worktree isolation and some preflight safeguards were not fully completed

Checklist:

- [ ] Worktree was clean or intentionally isolated before schema implementation started.
- [x] Namespace refactor matches `docs/DB_SCHEMA_NAMESPACE_PLAN.md`.
- [x] Required new in-scope tables are present.
- [x] No out-of-scope DW, ETL, ML, or cyber artifacts were added.
- [x] Database migration path is hand-authored where needed and reviewable.
- [x] Required database validation commands passed.
- [x] App and API smoke checks passed after cutover.
- [x] Any temporary `public` compatibility views are documented with a removal deadline. No compatibility views were needed.

## Follow-Up Items Still Open

- isolate the DB namespace work from unrelated worktree changes if a clean historical branch or PR record is still needed
- capture an external-consumer confirmation for legacy `public.<table>` naming if that evidence is still required
- introduce PostGIS-backed geometry columns later if and when the approved data scope requires them
- create a proper backup or restore-point procedure for future database rollout work where tooling is available

