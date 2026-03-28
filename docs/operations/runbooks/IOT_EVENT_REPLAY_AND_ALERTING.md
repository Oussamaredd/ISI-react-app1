# IoT Event Replay and Alerting Runbook

Use this runbook when the IoT event pipeline is degraded, replay is required, or Alertmanager notifications need verification.
For non-IoT platform alerts, SLO burn, synthetic-monitor failures, or client error-tracking triage, use `docs/operations/runbooks/OBSERVABILITY_AND_RELIABILITY.md`.

## Start the Observability Stack

```bash
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile obs up -d elasticsearch logstash kibana jaeger grafana prometheus alertmanager alert-webhook-sink
```

That command now also brings up the `backend` and `db` dependencies automatically so Prometheus can scrape `/api/metrics` and the API can ship logs to Logstash inside the same profile.

Useful local endpoints:

- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Alert webhook sink: `http://localhost:8085`
- Kibana: `http://localhost:5601`
- Grafana: `http://localhost:3030`
- Jaeger: `http://localhost:16686`

Grafana dashboards to verify after startup:

- `EcoTrack IoT Event Pipeline`
- `EcoTrack Security Signals Baseline`

## Verify Alerts

```bash
curl http://localhost:9093/api/v2/status
docker logs alert_webhook_sink
docker logs alertmanager
```

List configured alerts:

```bash
docker exec alertmanager amtool alert query
```

## Investigate the IoT Pipeline

Check Prometheus metrics:

```text
ecotrack_iot_ingestion_backlog_total
ecotrack_iot_ingestion_oldest_pending_age_ms
ecotrack_iot_ingestion_events{status="failed"}
ecotrack_iot_validated_delivery_backlog_total
ecotrack_iot_validated_delivery_oldest_pending_age_ms
ecotrack_iot_validated_delivery_events{status="failed"}
ecotrack_iot_backpressure_active
ecotrack_service_hop_events_total
ecotrack_service_hop_duration_ms
ecotrack_internal_consumer_lag_messages
ecotrack_internal_consumer_lag_oldest_pending_age_ms
ecotrack_internal_consumer_lag_shard_skew
ecotrack_event_connector_exports
ecotrack_event_connector_backlog_total
ecotrack_event_connector_oldest_pending_age_ms
ecotrack_event_connector_lag_messages
ecotrack_security_signals_total
ecotrack_http_request_status_total
ecotrack_admin_audit_actions_last_hour
```

Search logs in Kibana or Grafana with:

```text
traceId:"<trace-id>"
eventId:"<staged-event-id>"
validatedEventId:"<validated-event-id>"
deliveryId:"<delivery-id>"
producerName:"iot_ingestion_worker"
consumerName:"timeseries_projection"
consumerName:"measurement_rollup_projection"
consumerName:"zone_analytics_projection"
consumerName:"anomaly_alert_projection"
consumerName:"event_archive_connector"
connectorName:"archive_files"
```

Trace pivots:

- Use Jaeger to inspect the originating trace for an ingestion request.
- Reuse the `traceId` from the span in Kibana or Grafana logs to pivot from traces to worker logs.

## Replay Failed or Retryable Work

List replayable staged events:

```bash
curl -H "Authorization: Bearer <admin-token>" "http://localhost:3001/api/admin/event-workflow/replay/staged?status=failed&limit=20"
```

Replay staged events:

```bash
curl -X POST "http://localhost:3001/api/admin/event-workflow/replay/staged" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d "{\"eventIds\":[\"<event-id>\"],\"reason\":\"operator replay\",\"allowRejectedReplay\":false}"
```

List replayable deliveries:

```bash
curl -H "Authorization: Bearer <admin-token>" "http://localhost:3001/api/admin/event-workflow/replay/deliveries?status=failed&limit=20"
```

Replay deliveries:

```bash
curl -X POST "http://localhost:3001/api/admin/event-workflow/replay/deliveries" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d "{\"deliveryIds\":[\"<delivery-id>\"],\"reason\":\"operator replay\"}"
```

Replay writes audit entries and increments replay metadata on the durable rows.

## Validate Lag and Security Alerts

The Development-owned alert baseline now includes:

- `EcoTrackInternalConsumerLagHigh`
- `EcoTrackInternalConsumerImbalanceHigh`
- `EcoTrackInternalConsumerShardSkewHigh`
- `EcoTrackEventConnectorBacklogHigh`
- `EcoTrackEventConnectorFailuresPresent`
- `EcoTrackAuthorizationDeniedSpike`
- `EcoTrackLoginFailuresHigh`
- `RealtimeWebSocketAuthFailuresHigh`

Use Prometheus or Alertmanager to confirm firing state:

```bash
curl "http://localhost:9090/api/v1/rules"
curl "http://localhost:9093/api/v2/alerts"
docker exec alertmanager amtool alert query
```

The security dashboard is intentionally Dev-owned only. Full SIEM correlation, SOAR, threat-intel enrichment, compliance automation, and external Wazuh or Splunk integrations remain deferred to the Security handoff.

## Run Chaos Scenarios

The resilience harness lives in `infrastructure/scripts/iot-chaos-harness.mjs` and writes markdown reports under `tmp/chaos`.

By default the harness runs with `--api-transport auto`. It first tries the configured host URL and then falls back to `docker compose exec` against the `backend` container, which is the required path when the API is exposed only on the internal Docker network.

Example commands:

```bash
npm run obs:up --workspace=ecotrack-infrastructure
npm run chaos:iot --workspace=ecotrack-infrastructure -- --scenario api-restart
npm run chaos:iot --workspace=ecotrack-infrastructure -- --scenario db-outage
npm run chaos:iot --workspace=ecotrack-infrastructure -- --scenario stale-lease
npm run chaos:iot --workspace=ecotrack-infrastructure -- --scenario api-restart --api-transport docker
npm run chaos:iot --workspace=ecotrack-infrastructure -- --scenario replay-recovery --admin-token <admin-jwt>
```

Each report captures:

- baseline and final metrics snapshots
- baseline and final DB reconciliation snapshots
- RTO in milliseconds from fault injection to backlog normalization
- RPO gaps for timeseries projection, rollup projection, and rollup-table persistence

## Escalation Guidance

- If `ecotrack_iot_backpressure_active == 1`, stop replaying bulk batches until backlog drops.
- If failed staged events grow while delivery failures remain zero, inspect ingestion worker logs and `iot.ingestion_events`.
- If delivery failures grow, inspect consumer logs and `iot.validated_event_deliveries`.
- If `ecotrack_internal_consumer_lag_shard_skew` spikes, inspect the busiest shard in the `EcoTrack IoT Event Pipeline` dashboard and compare `timeseries_projection` versus `measurement_rollup_projection`.
- If `ecotrack_event_connector_backlog_total` or `ecotrack_event_connector_exports{status="failed"}` grows, inspect `integration.event_connector_exports`, the archive connector logs, and the temp export directory under the local runtime path.
- If `EcoTrackAuthorizationDeniedSpike` or `EcoTrackLoginFailuresHigh` fires, inspect the `EcoTrack Security Signals Baseline` dashboard first and then pivot into logs by `traceId`, request path, or authenticated user context.
- If `ecotrack_observability_snapshot_up == 0`, fix DB-backed monitoring first because alert fidelity is degraded.
