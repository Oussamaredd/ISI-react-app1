# IoT Ingestion Service

## Overview

The IoT ingestion service delivers workbook tasks `M2.1`, `M2.14`, and `M3.3` inside the modular monolith. It exposes async HTTP ingestion endpoints for sensor measurements, stages accepted raw events in PostgreSQL, validates them through an internal worker, and projects durable validated events through a dedicated downstream consumer while preserving the standard `controller -> service -> repository -> database` flow.

This implementation is optimized for the current Development scope:

- HTTP ingestion is live for sensor payloads.
- Raw events are staged first in `iot.ingestion_events`.
- Internal queue workers drain staged event identifiers concurrently.
- The processing worker validates, normalizes, enriches, retries, and records validated results.
- A dedicated validated-event consumer projects the durable event stream into `iot.measurements` and container status.
- Backpressure protects the API during sustained spikes.
- Sensor devices are auto-registered on first contact.

Direct MQTT transport and external brokers remain future extensions. The current delivery is a monolith-compatible staged-event pipeline with retry and observability.

## Request Flow

1. `POST /api/iot/v1/measurements` or `POST /api/iot/v1/measurements/batch` validates the payload and returns `202 Accepted`.
2. The ingestion service stages each raw payload in `iot.ingestion_events`, including the normalized request envelope, timestamps, and optional idempotency key.
3. The in-memory scheduler queues staged event IDs and the recovery loop re-enqueues runnable or stale leased rows.
4. The processing worker claims staged rows, re-validates schema, enforces business rules, normalizes values, and enriches them with `sensor_devices`, `containers`, and container-type thresholds.
5. Validated results are written to `iot.validated_measurement_events` and a durable delivery row is created in `iot.validated_event_deliveries`.
6. The validated-event consumer claims runnable deliveries, continues the originating trace context, and projects the event into `iot.measurements` plus container fill-state updates.
7. Rejected, retryable, failed, and validated states are stored back on `iot.ingestion_events`, while consumer completion and retry state live on `iot.validated_event_deliveries`.
8. `GET /api/iot/v1/health` reports both ingestion-worker and validated-consumer backlog, retry/failure state, and processed-volume visibility.

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

Worker-side business rules add:

- `deviceUid + idempotencyKey` deduplication through `iot.ingestion_events`
- rejection for timestamps more than 5 minutes in the future
- rejection for measurements older than 180 days
- rejection for client-supplied `measurementQuality: "rejected"`
- rejection when `sensorDeviceId`, `deviceUid`, and `containerId` mappings conflict with the registered sensor context

## Processing Model

- PostgreSQL is the source of truth for raw-event state through `iot.ingestion_events`.
- The in-memory queue carries staged event IDs only; it does not replace durable staging.
- Queue workers run concurrently according to `IOT_QUEUE_CONCURRENCY` and drain jobs up to `IOT_QUEUE_BATCH_SIZE`.
- The worker uses processing leases, retry state, and stale-lease recovery so interrupted events return to the runnable pool.
- Status transitions are `pending -> processing -> validated|retry|failed|rejected`.
- Durable downstream delivery rows are stored in `iot.validated_event_deliveries` and follow `pending -> processing -> completed|retry|failed`.
- The validated-event consumer uses `validatedEventId + measuredAt` idempotency when projecting into `iot.measurements`.
- Retry backoff is exponential with a Development-owned ceiling of 3 attempts.
- When backlog reaches `IOT_BACKPRESSURE_THRESHOLD`, the queue is paused and the API returns `503` until the backlog drops.
- `traceparent` and `tracestate` are persisted on staged events, validated events, and delivery rows so the API request trace continues through both worker phases.

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
  }
}
```

If ingestion is disabled, the endpoint reports `status: "unhealthy"` and `queueEnabled: false`. When retries or failures exist, health degrades even if the HTTP service remains available.

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

Worker safeguards currently use fixed in-code defaults:

- `IOT_PROCESSING_MAX_RETRIES = 3`
- `IOT_PROCESSING_STALE_LEASE_WINDOW_MS = 300000`
- `IOT_PROCESSING_RECOVERY_INTERVAL_MS = 1000`

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

## Verification

- `npm run build --workspace=ecotrack-database`
- `npm run typecheck --workspace=ecotrack-database`
- `npm run db:migrate --workspace=ecotrack-database`
- `npm run lint --workspace=ecotrack-api`
- `npm run typecheck --workspace=ecotrack-api`
- `npm run test --workspace=ecotrack-api`

## Future Extensions

- MQTT transport adapter
- replay and DLQ controls for later event-workflow tasks
- future Kafka adapter points when service extraction becomes necessary
- time-series aggregation and rollup workers
