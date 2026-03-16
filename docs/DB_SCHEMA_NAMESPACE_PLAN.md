# DB Schema Namespace Plan

Last updated: 2026-03-03

Related status doc:

- `docs/DB_SCHEMA_NAMESPACE_STATUS.md`

## Scope And Assumptions

This plan is based on:

- `docs/specs/inputs/ECOTRACK_CDC_COMMUN_V2.docx`, especially CDC sections 4.x (use cases), 5.2 (Development modules), 7.1 to 7.2 (business concepts and OLTP constraints), and 10.1 (expected API surface).
- `AGENTS.md`, especially the Temporary Specialty Scope Freeze limiting active implementation to Development plus partial Dev/Data for storage/query only.
- The current database model in `database/schema/index.ts`, `database/migrations/meta/0011_snapshot.json`, and the latest migration `database/migrations/0011_legal_captain_universe.sql`.

Current database facts:

- 22 live tables in the latest snapshot.
- All tables are in the default `public` schema.
- No custom `pgSchema()` usage in Drizzle today.
- No PostgreSQL enums defined in Drizzle today.
- No database views in the current schema plan.

Explicitly out of scope for this document:

- Data Warehouse star schema design.
- ETL/ELT, dbt, Airflow, Kafka, MQTT broker, or ingestion pipeline design.
- ML prediction tables or feature stores.
- Cyber-security controls, network zones, or infrastructure hardening design.

This document intentionally avoids relationship diagrams and cardinality descriptions. It is a namespace, migration, and additive-entity plan only.

## CDC-Driven Namespace Layout

Target rule: keep `public` empty for business tables after migration; reserve it only for temporary backward-compatibility views if Phase 3 is needed.

| Schema | Purpose | CDC driver | Immediate contents |
| --- | --- | --- | --- |
| `auth` | Authentication, identity, and RBAC | CDC 4.4, 5.2, 10.1 auth | `users`, `password_reset_tokens`, `roles`, `user_roles` |
| `core` | Core operational master data and geospatial assets | CDC 7.1 containers/zones, 10.1 containers/zones, PostGIS note | `zones`, `containers`, new `container_types` |
| `iot` | OLTP storage for sensor registry and measurements only | CDC UC-T02, 7.1 IoT measurements, 10.1 measurement history | new `sensor_devices`, new `measurements` |
| `ops` | Tour planning, execution, route output, and collection events | CDC UC-A01, UC-A02, UC-G01, 10.1 tours | `tours`, `tour_stops`, `tour_routes`, `collection_events` |
| `incident` | Citizen reports, anomaly catalog, anomaly handling, alert events | CDC UC-C01, UC-A03, UC-G02 | `citizen_reports`, `anomaly_types`, `anomaly_reports`, new `alert_events` |
| `notify` | Notification intent and per-channel delivery tracking | CDC notifications, UC-C01, UC-G01, UC-AD02 | new `notifications`, new `notification_deliveries` |
| `game` | Citizen engagement, points, badges, and challenges | CDC UC-C02, UC-C03, 5.2 gamification | `gamification_profiles`, `challenges`, `challenge_participations` |
| `audit` | Immutable business traceability | CDC 7.2 traceability, UC-AD01, 5.2 administration | `audit_logs` |
| `admin` | Platform configuration and operational settings | CDC UC-AD02, 5.2 administration | `system_settings`, new `alert_rules` |
| `export` | Report generation history and export artifacts | CDC UC-G03, 10.1 analytics/report generation | `report_exports` |
| `support` | Internal helpdesk only, isolated from CDC core flows | CDC 5.2 support module, but not a CDC core domain | `tickets`, `comments`, `attachments` |

## Existing Table Mapping

| Current table | Target schema.table | Decision | Notes |
| --- | --- | --- | --- |
| `users` | `auth.users` | Move as-is | Keep current table name to minimize auth/service churn. |
| `password_reset_tokens` | `auth.password_reset_tokens` | Move as-is | No rename needed; token lifecycle stays auth-local. |
| `roles` | `auth.roles` | Move as-is | RBAC catalog belongs with identity, not admin settings. |
| `user_roles` | `auth.user_roles` | Move as-is | Keep join table name unchanged for low migration risk. |
| `audit_logs` | `audit.audit_logs` | Move as-is | Centralize traceability away from auth and admin config. |
| `system_settings` | `admin.system_settings` | Move as-is | Platform config belongs in `admin`, not `public`. |
| `tickets` | `support.tickets` | Move as-is | Explicitly non-core to the CDC operational model. |
| `comments` | `support.comments` | Move as-is | Keep helpdesk collaboration isolated. |
| `attachments` | `support.attachments` | Move as-is | Keep helpdesk-scoped now; optionally widen later for incident media reuse. |
| `zones` | `core.zones` | Move as-is | Add PostGIS boundary column in Phase 2; table name can stay stable. |
| `containers` | `core.containers` | Move as-is | Add PostGIS point column and a `container_type_id` in Phase 2. |
| `tours` | `ops.tours` | Move as-is | Existing lifecycle table stays the planning/execution anchor. |
| `tour_stops` | `ops.tour_stops` | Move as-is | Existing stop execution data stays in ops. |
| `tour_routes` | `ops.tour_routes` | Move as-is | Keep table name; add spatial route column later if PostGIS is enabled. |
| `citizen_reports` | `incident.citizen_reports` | Move as-is | CDC citizen issue flow belongs in incident handling. |
| `collection_events` | `ops.collection_events` | Move as-is | Collection execution remains an ops event. |
| `gamification_profiles` | `game.gamification_profiles` | Move as-is | Keep name to avoid unnecessary app and API refactors. |
| `challenges` | `game.challenges` | Move as-is | Challenge catalog is game-local. |
| `challenge_participations` | `game.challenge_participations` | Move as-is | Preserve current join/event naming. |
| `anomaly_types` | `incident.anomaly_types` | Move as-is | Incident type catalog should sit with anomalies. |
| `anomaly_reports` | `incident.anomaly_reports` | Move as-is | Agent anomaly flow maps directly to incident handling. |
| `report_exports` | `export.report_exports` | Move as-is | Export history remains separate from analytics read models. |

## Non-Table Additions Needed On Existing Tables

These are additive column-level changes that should happen alongside Phase 2, but they do not require new top-level entities:

- `core.zones`: add a PostGIS polygon or multipolygon column for zone boundaries (`boundary_geom`), keeping `code` as the external business identifier.
- `core.containers`: add a PostGIS point column for physical position (`location_geom`), keep current `latitude` and `longitude` only as temporary legacy fields during backfill, and add `container_type_id`.
- `ops.tour_routes`: keep the existing JSON payload for API compatibility, but add a spatial route column (`route_geom`) once PostGIS is enabled and the app is ready to query by geometry.
- `ops.tours`: add execution timestamps (`started_at`, `completed_at`) before inventing any separate tour-tracking table.
- `incident.citizen_reports` and `incident.anomaly_reports`: keep current `photo_url` for the first migration; only generalize media storage later if the attachment reuse pressure becomes real.

## New In-Scope Entities To Add

The following additions stay inside OLTP storage/query scope and directly support the CDC needs that are not covered by the current 22-table model.

### `core.container_types`

1. Purpose: store reusable container categories so alert thresholds can be configured by container type, as required by CDC admin alert configuration.
2. `id`: UUID primary key.
3. `code`: stable business code used in admin screens and imports.
4. `label`: human-readable type name.
5. `waste_stream`: high-level classification such as household, recyclable, or glass.
6. `nominal_capacity_liters`: default expected capacity for dashboard normalization.
7. `default_fill_alert_percent`: default alert threshold for warning state.
8. `default_critical_alert_percent`: default alert threshold for critical state.
9. `color_code`: UI hint for maps and legends.
10. `is_active`: soft activation flag for deprecated types.
11. `created_at`: timestamptz creation timestamp.
12. `updated_at`: timestamptz last-change timestamp.

### `iot.sensor_devices`

1. Purpose: register the physical sensor assigned to a container without designing the ingestion pipeline itself.
2. `id`: UUID primary key.
3. `container_id`: current attached container reference.
4. `device_uid`: vendor or hardware unique identifier.
5. `hardware_model`: sensor model reference for support and compatibility checks.
6. `firmware_version`: latest reported firmware string.
7. `install_status`: active, inactive, maintenance, or retired.
8. `battery_percent`: last known battery value for field support visibility.
9. `last_seen_at`: last successful telemetry timestamp observed by the app stack.
10. `installed_at`: activation or field installation timestamp.
11. `created_at`: timestamptz creation timestamp.
12. `updated_at`: timestamptz last-change timestamp.

### `iot.measurements`

1. Purpose: persist the container measurement history required by the CDC dashboard and container APIs.
2. `id`: high-volume surrogate key optimized for append-heavy writes.
3. `sensor_device_id`: source sensor reference when known.
4. `container_id`: resolved container reference for operational queries.
5. `measured_at`: business measurement timestamp from the device payload.
6. `fill_level_percent`: normalized fill percentage used by dashboards and alerts.
7. `temperature_c`: optional sensor temperature reading from the CDC payload example.
8. `battery_percent`: optional battery reading captured with the measurement.
9. `signal_strength`: optional radio quality indicator for support triage.
10. `measurement_quality`: app-computed quality flag such as valid, suspect, or rejected.
11. `source_payload`: compact raw payload snapshot for troubleshooting and replay-safe audits.
12. `received_at`: ingestion timestamp at the database boundary.

### `admin.alert_rules`

1. Purpose: store admin-configured alert thresholds, notification routing, and channel activation without mixing that logic into `system_settings`.
2. `id`: UUID primary key.
3. `scope_type`: rule scope such as global, zone, container_type, or container.
4. `scope_key`: the business identifier or UUID that defines the scoped target.
5. `warning_fill_percent`: warning threshold used before critical escalation.
6. `critical_fill_percent`: critical threshold for imminent overflow.
7. `anomaly_type_code`: optional anomaly code that triggers the same rule path.
8. `notify_channels`: configured channels such as email, push, or SMS.
9. `recipient_role`: target recipient role such as manager or admin.
10. `is_active`: runtime switch for rule enablement.
11. `created_at`: timestamptz creation timestamp.
12. `updated_at`: timestamptz last-change timestamp.

### `incident.alert_events`

1. Purpose: persist actual alert occurrences so the dashboard can show critical containers and acknowledgement state.
2. `id`: UUID primary key.
3. `rule_id`: originating alert rule reference when the event is rule-driven.
4. `container_id`: affected container reference when applicable.
5. `zone_id`: affected zone reference for manager filtering.
6. `event_type`: overflow risk, stale sensor, anomaly escalation, or similar operational category.
7. `severity`: normalized warning or critical level.
8. `triggered_at`: first time the alert condition became true.
9. `current_status`: open, acknowledged, silenced, resolved, or expired.
10. `acknowledged_by_user_id`: user who took ownership when applicable.
11. `resolved_at`: closure timestamp when the alert is no longer active.
12. `payload_snapshot`: JSONB snapshot of the values that triggered the alert.

### `notify.notifications`

1. Purpose: record the logical notification intent for citizen, agent, manager, and admin messaging across CDC flows.
2. `id`: UUID primary key.
3. `event_type`: business trigger such as citizen_report_received, tour_assigned, or alert_raised.
4. `entity_type`: source domain type used to rebuild context in the app.
5. `entity_id`: source domain identifier.
6. `audience_scope`: user, role, zone-manager, or broadcast target selector.
7. `title`: short notification title rendered in UI or templates.
8. `body`: normalized message body stored before channel fan-out.
9. `preferred_channels`: ordered list of channels requested for delivery.
10. `scheduled_at`: when the notification becomes eligible for send.
11. `status`: queued, processing, sent, partially_sent, or cancelled.
12. `created_at`: timestamptz creation timestamp.

### `notify.notification_deliveries`

1. Purpose: track per-channel delivery attempts without duplicating the logical notification payload.
2. `id`: UUID primary key.
3. `notification_id`: parent notification reference.
4. `channel`: email, push, SMS, or in-app delivery channel.
5. `recipient_address`: destination email, device token alias, or phone hash.
6. `provider_message_id`: external provider correlation ID when available.
7. `delivery_status`: pending, sent, delivered, failed, or bounced.
8. `attempt_count`: number of send attempts made for this channel.
9. `last_attempt_at`: timestamp of the most recent delivery attempt.
10. `delivered_at`: timestamp of confirmed delivery when known.
11. `error_code`: compact failure reason for retries and support.
12. `created_at`: timestamptz creation timestamp.

## Migration Plan (Drizzle-Friendly)

### Phase 0: Pre-Checks And Inventory

1. Freeze the target model in a branch and treat `database/migrations/meta/0011_snapshot.json` as the current inventory source of truth.
2. Capture a table inventory and row counts before any change:
   - `select table_schema, table_name from information_schema.tables where table_schema not in ('pg_catalog', 'information_schema') order by table_schema, table_name;`
   - `select schemaname, relname, n_live_tup from pg_stat_user_tables order by schemaname, relname;`
3. Search all app, API, and database runtime code for hardcoded `public.` references before moving anything.
4. Search migrations for hardcoded `public.` references; the current repo already has them in generated foreign-key SQL, so do not assume a clean diff.
5. Confirm whether any reporting scripts, raw SQL, or ad hoc admin queries outside this repo depend on `public.<table>` names.
6. Decide whether PostGIS is already enabled in the dev database; if not, schedule it explicitly for Phase 2 rather than mixing it into the namespace move.
7. Take a backup or restore point of the dev database before the first schema move migration.

### Phase 1: Introduce Schemas And Move Tables Safely

1. Add `pgSchema()` definitions in `database/schema/index.ts` for `auth`, `core`, `iot`, `ops`, `incident`, `notify`, `game`, `audit`, `admin`, `export`, and `support`.
2. Rebind each existing table definition from `pgTable('table_name', ...)` to `<schema>.table('table_name', ...)` while keeping table names unchanged.
3. Do not rely on a generated destructive diff for schema relocation; hand-author the migration SQL for this phase.
4. In the migration, create schemas first:
   - `create schema if not exists auth;`
   - Repeat for each target schema.
5. Move tables with `alter table <current> set schema <target>;` using a controlled order, but keep the moves in a single migration window so the app is not half-switched.
6. After table moves, verify every moved table exists exactly once and that foreign keys still resolve across schemas.
7. Regenerate the Drizzle metadata snapshot only after the hand-authored migration matches the updated `pgSchema()` source.
8. Keep `public` free of business tables after this phase unless Phase 3 compatibility views are required.

### Phase 2: Add Minimal CDC-Required Structures Missing Today

1. Add `core.container_types` and backfill a default type before enforcing `core.containers.container_type_id` on all live rows.
2. Add `iot.sensor_devices` as the registry for fielded sensors, but keep ingestion transport out of scope.
3. Add `iot.measurements` as the append-heavy measurement history table required by CDC container history and real-time dashboard flows.
4. Add `admin.alert_rules` so alert thresholds and channel routing are stored explicitly instead of buried in `system_settings`.
5. Add `incident.alert_events` so overflow-risk and operational alerts become queryable and acknowledgeable.
6. Add `notify.notifications` and `notify.notification_deliveries` for reliable cross-channel notification tracking.
7. If PostGIS is approved in the database layer, enable it here and add spatial columns to `core.zones`, `core.containers`, and `ops.tour_routes`.
8. Backfill spatial columns from the current latitude, longitude, and route JSON payloads before the app starts reading from them.
9. Add only the indexes required for the first operational dashboards; do not add analytical rollup tables or materialized views in this phase.

### Phase 3: Optional Backward-Compatibility Layer (Only If Needed)

1. PostgreSQL does not support Oracle-style synonyms, so the compatibility option is temporary `public` views only.
2. Only create these views if a real dependency on legacy `public.<table>` names is discovered in Phase 0.
3. Prefer read-only views such as `create view public.users as select * from auth.users;` for reporting compatibility.
4. Do not add writable compatibility triggers unless there is a hard blocker; they add operational risk and blur the cutover.
5. Publish a short deprecation window: one sprint or 30 calendar days maximum.
6. Track each compatibility view in the migration notes and remove all of them in the next scheduled database migration after consumer updates land.

### Phase 4: Validation Checklist

1. Schema presence:
   - Query `information_schema.tables` and confirm every business table is in the target schema and no business table remains in `public`.
2. Row-count parity:
   - Compare `pg_stat_user_tables` counts before and after the move for all 22 current tables.
3. Referential sanity:
   - Run smoke queries against auth, ops, incident, game, and support tables to confirm cross-schema foreign keys still work.
4. Spatial sanity:
   - If PostGIS was enabled, verify non-null geometry counts and run one basic spatial query per new geometry column.
5. Notification and alert sanity:
   - Insert one `incident.alert_events` row and one `notify.notifications` row in dev to verify inserts, indexes, and timestamp defaults.
6. Measurement sanity:
   - Insert sample `iot.measurements` rows and verify the latest-per-container query returns within expected latency.
7. Drizzle package checks for actual code changes:
   - `npm run build --workspace=ecotrack-database`
   - `npm run typecheck --workspace=ecotrack-database`
   - `npm run db:migrate --workspace=ecotrack-database`
8. App/API smoke checks after cutover:
   - Auth login and role-gated admin pages still load.
   - Citizen report creation still persists.
   - Tour creation, assignment, and collection validation still persist.
   - Manager dashboard queries for containers, alerts, and report exports still return data.
   - Support tickets, comments, and attachments still function unchanged.

## Best-Practice Decisions

### Naming Conventions

- Schema names stay short, singular, and domain-based: `auth`, `core`, `iot`, `ops`, `incident`, `notify`, `game`, `audit`, `admin`, `export`, `support`.
- Physical table names stay in the existing plural `snake_case` style to reduce migration churn and keep Drizzle diffs readable.
- Avoid table renames in the first migration unless there is a hard collision; schema moves already provide the domain separation.
- Keep `public` reserved for extensions and temporary compatibility views only.

### Timestamps

- Standardize on `timestamptz` for all timestamps.
- Keep `created_at` and `updated_at` on mutable OLTP tables.
- Keep domain-event timestamps separate from audit timestamps: for example `reported_at`, `measured_at`, `triggered_at`, and `delivered_at` should not be collapsed into `created_at`.
- For append-only event tables such as `iot.measurements` and `incident.alert_events`, prefer immutable event timestamps and avoid unnecessary `updated_at`.

### Status Enum Strategy

- Do not retrofit PostgreSQL enums across the current text status columns during the schema move; that adds churn without immediate CDC value.
- Keep existing status columns as text plus application-level enums for current tables until the domain vocabulary stabilizes.
- For new tables, use PostgreSQL enums only for genuinely stable, low-churn dimensions that benefit from strong database validation, such as notification channel or delivery status.
- When a domain is still evolving quickly, prefer text plus narrow check constraints over a hard PostgreSQL enum.

### IoT Measurement Partitioning

- `iot.measurements` is the only table in this plan that should be designed for partitioning from day one.
- Use range partitioning by month on `measured_at` once the table is introduced.
- Keep the logical table name stable (`iot.measurements`) and let partitions stay an implementation detail.
- Do not add second-level hash partitioning at launch unless volume or write contention proves it is necessary.

### Indexing Principles For Dashboard Queries

- Index for the live operational reads the CDC actually needs: latest container state, critical alerts, active tours, and export history.
- Favor composite btree indexes that match filter plus sort order, such as `(container_id, measured_at desc)` or `(current_status, triggered_at desc)`.
- Add partial indexes for highly selective operational subsets, such as open critical alerts only.
- Use GiST indexes on PostGIS geometry columns once those columns exist.
- Avoid indexing every text status column by default; add indexes only when a real dashboard or API query uses them.
- Re-check `explain analyze` on the manager dashboard queries after Phase 2 instead of guessing at index coverage.

## Concrete Code Changes To Apply After Plan Approval

- Update `database/schema/index.ts` to define `pgSchema()` namespaces and rebind all 22 existing tables into their target schemas.
- Add new Drizzle table definitions in `database/schema/index.ts` for `core.container_types`, `iot.sensor_devices`, `iot.measurements`, `admin.alert_rules`, `incident.alert_events`, `notify.notifications`, and `notify.notification_deliveries`.
- Extend existing Drizzle table definitions in `database/schema/index.ts` for `core.zones`, `core.containers`, `ops.tour_routes`, and `ops.tours` with the additive Phase 2 columns.
- Add one manual migration in `database/migrations/` for schema creation plus `ALTER TABLE ... SET SCHEMA ...` moves.
- Add one follow-up migration in `database/migrations/` for the new tables, additive columns, indexes, and optional PostGIS enablement.
- Refresh `database/migrations/meta/_journal.json` and the latest snapshot only after the hand-authored migration SQL and updated Drizzle schema are aligned.

