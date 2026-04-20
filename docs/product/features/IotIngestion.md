# IoT Ingestion Service

## Overview

The IoT ingestion service delivers workbook tasks `M2.1`, `M2.14`, `M3.1`, `M3.2`, `M3.3`, `M3.10`, `M3.11`, `M3.12`, `M3.14`, and the Development-owned portion of `M3.13` inside the modular monolith. It exposes async HTTP ingestion endpoints for measurement payloads, stages accepted raw events in PostgreSQL, validates them through an internal worker, projects durable validated events through dedicated downstream consumers, and preserves the standard `controller -> service -> repository -> database` flow.

For current product framing, this capability should be described as simulated or seeded measurement ingestion that supports the prototype's operational backbone. EcoTrack does not claim a live real-world hardware rollout in the current school-prototype scope.

This implementation is optimized for the current Development scope:

- HTTP ingestion is live for measurement payloads used by seeded or simulated telemetry flows.
- Raw events are staged first in `iot.ingestion_events`.
- Each request or batch is staged transactionally with producer metadata and a deterministic idempotency key.
- Internal queue workers drain staged event identifiers concurrently.
- The processing worker validates, normalizes, enriches, retries, and records validated results.
- A dedicated validated-event consumer projects the durable event stream into `iot.measurements` and container status.
- A second durable consumer projects 10-minute rich-event rollups into `iot.measurement_rollups_10m`.
- Additional consumers derive zone analytics, anomaly alerts, and archive-ready connector exports from the same validated-event stream.
- Internal event envelopes are stored with event name, routing key, schema version, explicit producer and consumer authorization policy, and active worker-claim metadata so the monolith remains compatible with later Kafka externalization.
- A lightweight internal schema-registry catalog tracks IoT, collections, and analytics subjects plus compatibility rules without introducing Confluent or Apicurio infrastructure in the Development phase.
- Queue and recovery scheduling are shard-aware so same-device events stay ordered while different devices can scale in parallel.
- Admin-only replay endpoints can requeue failed or retryable staged events and validated-event deliveries without bypassing durable state.
- Backpressure protects the API during sustained spikes.
- Sensor devices are auto-registered on first contact.
- Service-hop metrics, per-consumer lag gauges, shard-skew gauges, Grafana dashboards, and chaos scripts now cover the full monolith event pipeline.

Direct MQTT transport, real deployed hardware fleets, and external brokers remain future extensions. The current delivery is a monolith-compatible staged-event pipeline with exactly-once staging semantics, lease-based worker recovery, and observability.

## Request Flow

1. `POST /api/iot/v1/measurements` or `POST /api/iot/v1/measurements/batch` validates the payload and returns `202 Accepted`.
2. The ingestion service stages each raw payload in `iot.ingestion_events` inside one database transaction per request or batch, including the normalized request envelope, producer identity, producer transaction ID, timestamps, and the explicit or derived idempotency key.
3. The in-memory scheduler queues staged event IDs by virtual shard and the recovery loop re-enqueues runnable or stale leased rows using the same shard ordering.
4. The processing worker claims staged rows, re-validates schema, enforces business rules, normalizes values, and enriches them with `sensor_devices`, `containers`, and container-type thresholds.
5. Validated results are written to `iot.validated_measurement_events` with internal event-envelope metadata, and one durable delivery row is created in `iot.validated_event_deliveries` for each authorized consumer.
6. The validated-event consumers claim runnable deliveries, continue the originating trace context, and project the event into `iot.measurements`, container fill-state updates, `iot.measurement_rollups_10m`, `analytics.zone_aggregates_10m`, `analytics.zone_current_state`, `incident.alert_events`, and `integration.event_connector_exports`.
7. Rejected, retryable, failed, and validated states are stored back on `iot.ingestion_events`, while consumer completion and retry state live on `iot.validated_event_deliveries`.
8. `GET /api/iot/v1/health` reports ingestion-worker backlog plus separate timeseries-consumer and rollup-consumer backlog, retry/failure state, and processed-volume visibility.

## Validation Contract

Each measurement requires:

- `deviceUid`
- `measuredAt`
- `fillLevelPercent`

Optional telemetry fields:

- `sensorDeviceId`
- `containerId`
- `temperatureC`
- `batteryPercent`
- `signalStrength`
- `measurementQuality`
- `idempotencyKey`

Batch ingestion requires a non-empty `measurements` array and the service rejects batches larger than `IOT_MAX_BATCH_SIZE`.
If `idempotencyKey` is omitted, the service derives a deterministic key from the normalized payload before staging. If two measurements in the same batch resolve to the same `deviceUid + idempotencyKey` identity, the whole batch is rejected before any row is staged.

Worker-side business rules add:

- `deviceUid + idempotencyKey` deduplication through `iot.ingestion_events`, with server-side key derivation when the client omits one
- rejection for timestamps more than 5 minutes in the future
- rejection for measurements older than 180 days
- rejection for client-supplied `measurementQuality: "rejected"`
- rejection when `sensorDeviceId`, `deviceUid`, and `containerId` mappings conflict with the registered sensor context

## Processing Model

- PostgreSQL is the source of truth for raw-event state through `iot.ingestion_events`.
- `claimed_by_instance_id` is recorded on staged rows and durable deliveries while a worker lease is active, then cleared on completion, retry, or stale-lease recovery.
- The in-memory queue carries staged event IDs only; it does not replace durable staging.
- Queue workers run concurrently according to `IOT_QUEUE_CONCURRENCY` and drain jobs up to `IOT_QUEUE_BATCH_SIZE`.
- Virtual partitions are computed from the normalized routing key so a given device keeps ordered processing while other devices can drain on separate shards.
- The worker uses processing leases, retry state, and stale-lease recovery so interrupted events return to the runnable pool.
- Status transitions are `pending -> processing -> validated|retry|failed|rejected`.
- Durable downstream delivery rows are stored in `iot.validated_event_deliveries` and follow `pending -> processing -> completed|retry|failed`.
- Five consumers currently own each validated event: `timeseries_projection`, `measurement_rollup_projection`, `zone_analytics_projection`, `anomaly_alert_projection`, and `event_archive_connector`.
- Validated events and durable deliveries persist `event_name`, `routing_key`, and `schema_version` so the internal contract can later be externalized behind a broker adapter without rewriting the IoT domain flow.
- Internal event policy checks restrict which producers can emit and which consumers can project the durable event types currently owned by the monolith.
- The validated-event consumer uses `validatedEventId + measuredAt` idempotency when projecting into `iot.measurements`.
- The rollup consumer uses `validatedEventId` idempotency when projecting into `iot.measurement_rollups_10m`.
- The zone analytics consumer uses `(zone_id, window_start)` upserts to keep one aggregate per 10-minute window and updates `analytics.zone_current_state` to the latest aggregate.
- The anomaly-alert consumer uses `source_event_key` idempotency on `incident.alert_events` so replayed deliveries do not duplicate temperature, battery, or fill-surge alerts.
- The archive connector stages exports in `integration.event_connector_exports` and materializes JSON artifacts under the local runtime temp directory while preserving a future sink-replacement seam.
- Container operational state is only updated when no newer measurement already exists for the same container, preventing stale shard completion from regressing fill state.
- Retry backoff is exponential with a Development-owned ceiling of 3 attempts.
- Replay metadata (`replay_count`, `last_replayed_at`, `last_replayed_by_user_id`, `last_replay_reason`) is stored on both staged events and validated-event deliveries.
- When backlog reaches `IOT_BACKPRESSURE_THRESHOLD`, the queue is paused and the API returns `503` until the backlog drops.
- `traceparent` and `tracestate` are persisted on staged events, validated events, and delivery rows so the API request trace continues through both worker phases.
- Grafana dashboards cover 6 logical hop graphs, per-consumer lag, oldest-pending age, and shard skew; Prometheus alerts cover backlog age, consumer imbalance, shard skew, and Development-owned security signals.

## API Endpoints

### `POST /api/iot/v1/measurements`

Accepts one validated request payload, stages the raw event, and returns:

```json
{
  "accepted": 1,
  "processing": true,
  "messageId": "uuid-of-staged-event"
}
```

### `POST /api/iot/v1/measurements/batch`

Accepts a non-empty validated batch, stages each raw event under one batch ID, and returns:

```json
{
  "accepted": 2,
  "processing": true,
  "batchId": "uuid-of-batch"
}
```

### `GET /api/iot/v1/health`

Returns:

```json
{
  "status": "healthy",
  "queueEnabled": true,
  "backpressureActive": false,
  "pendingCount": 150,
  "processedLastHour": 45000,
  "processing": {
    "retryCount": 3,
    "processingCount": 12,
    "failedCount": 1,
    "rejectedCount": 8,
    "oldestPendingAgeMs": 920
  },
  "consumer": {
    "retryCount": 1,
    "processingCount": 4,
    "failedCount": 0,
    "pendingCount": 7,
    "processedLastHour": 44000,
    "oldestPendingAgeMs": 340
  },
  "rollupConsumer": {
    "retryCount": 0,
    "processingCount": 2,
    "failedCount": 0,
    "pendingCount": 6,
    "processedLastHour": 43880,
    "oldestPendingAgeMs": 355
  }
}
```

If ingestion is disabled, the endpoint reports `status: "unhealthy"` and `queueEnabled: false`. When retries or failures exist, health degrades even if the HTTP service remains available.

### Admin Replay Endpoints

Admin-only replay controls are exposed under `admin/event-workflow`:

- `GET /api/admin/event-workflow/replay/staged`
- `POST /api/admin/event-workflow/replay/staged`
- `GET /api/admin/event-workflow/replay/deliveries`
- `POST /api/admin/event-workflow/replay/deliveries`

The staged-event replay endpoints list and requeue failed or retryable rows. `rejected` rows are excluded by default and require `allowRejectedReplay=true`.

The delivery replay endpoints list and requeue failed or retryable durable deliveries. Replay operations are audited through the admin audit log and preserve durable replay counters on the source rows.

### `GET /api/iot/v1/rollups/latest`

Returns the latest 10-minute rollups, optionally filtered by `containerId`, `deviceUid`, and `limit`.

```json
[
  {
    "validatedEventId": "uuid-of-validated-event",
    "deviceUid": "sensor-001",
    "containerId": "uuid-of-container",
    "sensorDeviceId": "uuid-of-sensor",
    "windowStart": "2026-03-23T10:00:00.000Z",
    "windowEnd": "2026-03-23T10:10:00.000Z",
    "measurementCount": 8,
    "averageFillLevelPercent": 71,
    "fillLevelDeltaPercent": 12,
    "sensorHealthScore": 86,
    "schemaVersion": "v1"
  }
]
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `IOT_INGESTION_ENABLED` | `true` | Enables the HTTP ingestion endpoints and worker |
| `IOT_QUEUE_CONCURRENCY` | `50` | Concurrent queue workers |
| `IOT_QUEUE_BATCH_SIZE` | `500` | Max staged-event IDs drained per worker batch |
| `IOT_BACKPRESSURE_THRESHOLD` | `100000` | Staged-event backlog threshold that activates backpressure |
| `IOT_MAX_BATCH_SIZE` | `1000` | Max measurements allowed in one batch request |
| `IOT_VALIDATED_CONSUMER_CONCURRENCY` | `20` | Concurrent validated-event consumer workers |
| `IOT_VALIDATED_CONSUMER_BATCH_SIZE` | `250` | Max validated-event delivery IDs drained per worker batch |
| `IOT_INGESTION_SHARD_COUNT` | `12` | Virtual shard count for staged-ingestion queueing and recovery |
| `IOT_VALIDATED_CONSUMER_SHARD_COUNT` | `12` | Virtual shard count for validated-delivery queueing and recovery |

Worker safeguards currently use fixed in-code defaults:

- `IOT_PROCESSING_MAX_RETRIES = 3`
- `IOT_PROCESSING_STALE_LEASE_WINDOW_MS = 300000`
- `IOT_PROCESSING_RECOVERY_INTERVAL_MS = 1000`

## Internal Schema Registry

The Development-owned internal schema registry keeps future broker subjects versioned inside the `events` boundary:

- `iot.ingestion.request`
- `iot.ingestion.staged`
- `iot.measurement.validated`
- `iot.validated.delivery`
- `iot.measurement.rollup.10m`
- `collections.tour.scheduled`
- `collections.tour.updated`
- `collections.tour.started`
- `collections.stop.validated`
- `collections.tour.completed`
- `collections.tour.cancelled`
- `analytics.zone.aggregate.10m`

Current compatibility coverage:

- `iot.measurement.validated` includes `v1` and `v1.1`, where `v1.1` adds only an optional field and remains backward-compatible with the current consumers.
- Producer authorization checks still enforce the current runtime envelope version, while registry compatibility tests protect future externalization paths.

## Observability and Resilience

Local operator surfaces now include:

- Grafana dashboard `EcoTrack IoT Event Pipeline`
- Grafana dashboard `EcoTrack Security Signals Baseline`
- Prometheus lag metrics per consumer: `ecotrack_internal_consumer_lag_messages`, `ecotrack_internal_consumer_lag_oldest_pending_age_ms`, and `ecotrack_internal_consumer_lag_shard_skew`
- Prometheus connector-export metrics: `ecotrack_event_connector_exports`, `ecotrack_event_connector_backlog_total`, and `ecotrack_event_connector_lag_messages`
- Service-hop metrics: `ecotrack_service_hop_events_total` and `ecotrack_service_hop_duration_ms`
- Security-signal metrics: `ecotrack_http_request_status_total` and `ecotrack_security_signals_total`

The chaos harness for `M3.15` lives at:

```bash
infrastructure/scripts/iot-chaos-harness.mjs
```

Example runs:

```bash
npm run obs:up --workspace=ecotrack-infrastructure
npm run chaos:iot --workspace=ecotrack-infrastructure -- --scenario api-restart
npm run chaos:iot --workspace=ecotrack-infrastructure -- --scenario api-restart --api-transport docker
npm run chaos:iot --workspace=ecotrack-infrastructure -- --scenario replay-recovery --admin-token <admin-jwt>
```

Each run writes a markdown report under `tmp/chaos` with per-scenario RTO and RPO-gap measurements. The harness defaults to `--api-transport auto`, which falls back to Docker-internal API calls when the backend is not published to the host.

## Benchmark

The benchmark harness for workbook proof lives at:

```bash
infrastructure/performance/k6/iot-ingestion-benchmark.js
```

Run it with:

```bash
k6 run infrastructure/performance/k6/iot-ingestion-benchmark.js
```

Optional runtime override:

```bash
API_BASE_URL=http://127.0.0.1:3001 k6 run infrastructure/performance/k6/iot-ingestion-benchmark.js
```

The benchmark asserts:

- error rate under 5%
- `p(95)` request duration under 200 ms
- `p(99)` request duration under 500 ms

Processing-path tests also cover worker latency and validation behavior in:

- `api/src/tests/iot-ingestion.processor.test.ts`
- `api/src/tests/iot-ingestion.repository.test.ts`
- `api/src/tests/iot-ingestion-http.test.ts`
- `api/src/tests/internal-events.test.ts`

## Verification

- `npm run build --workspace=ecotrack-database`
- `npm run typecheck --workspace=ecotrack-database`
- `npm run db:migrate --workspace=ecotrack-database`
- `npm run lint --workspace=ecotrack-api`
- `npm run typecheck --workspace=ecotrack-api`
- `npm run test --workspace=ecotrack-api`

## Future Extensions

- MQTT transport adapter
- future Kafka adapter points when service extraction becomes necessary
- external broker adapters for the existing internal schema-registry subjects
- specialized Security-owned SIEM correlation and alert-routing integrations after the scope freeze is lifted
