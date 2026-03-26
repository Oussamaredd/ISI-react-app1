# ELK Stack Integration Guide

EcoTrack uses the existing ELK stack in the `obs` compose profile for centralized structured logs.

The supported production-path contract is:

- the API emits structured JSON logs and can ship them to any Logstash-compatible TCP target
- the repo-owned local baseline remains the single-node `obs` profile for development and incident rehearsal
- hosted deployments should use either a managed Elastic-compatible stack or an equivalent log pipeline that preserves the indexed fields documented below

## Services

- Elasticsearch: `http://localhost:9200`
- Logstash TCP input: `logstash:5001` inside Docker, `localhost:5001` from the host
- Kibana: `http://localhost:5601`
- Grafana Elasticsearch datasource: `Elasticsearch Logs`

## Startup

```bash
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile obs up -d elasticsearch logstash kibana
```

When Prometheus or full observability commands are started with the `obs` profile, Docker Compose now pulls in `backend` and `db` automatically so metrics scraping and API log shipping have a live target.

Enable log shipping from the API runtime with:

```env
ENABLE_LOGSTASH=true
LOGSTASH_HOST=logstash
LOGSTASH_PORT=5001
```

For host-native API runs, point `LOGSTASH_HOST` at `localhost`.

For hosted deployments, point `LOGSTASH_HOST` and `LOGSTASH_PORT` at the managed log-ingestion endpoint and keep `ENABLE_LOGSTASH=true` in the backend runtime env.

## Indexed Log Shape

The API already emits JSON logs. When log shipping is enabled, Logstash writes them into daily indices named:

```text
ecotrack-api-logs-YYYY.MM.DD
```

Important searchable fields include:

- `traceId`
- `requestId`
- `eventId`
- `validatedEventId`
- `deliveryId`
- `producerName`
- `consumerName`
- `method`
- `path`
- `status`
- `msg`
- `service`
- `environment`

The IoT worker processors now emit structured success and failure logs so replay, validation, and projection activity can be correlated with the originating trace.

## Kibana Setup

1. Open `http://localhost:5601`.
2. Create a data view for `ecotrack-api-logs-*`.
3. Use `@timestamp` as the time field.

Example queries:

```text
traceId:"35f0de5f9a8f4d8ea4d6e1c46f5b2d0a"
eventId:"11111111-1111-4111-8111-111111111111"
deliveryId:"22222222-2222-4222-8222-222222222222"
producerName:"iot_ingestion_worker"
consumerName:"timeseries_projection"
msg:"Failed processing validated-event delivery"
```

## Ownership and Retention

- Dev Platform owns the structured log schema, the release/log correlation fields, the Logstash shipping path, and the operator validation steps in this document.
- The local `obs` profile is a development and incident-rehearsal baseline only; it is intentionally single-node and unauthenticated.
- Production expectation:
  - keep at least 14 days of searchable API logs
  - keep at least 30 days of cold archive or provider-equivalent export
  - review index volume and field cardinality monthly
- If a managed provider is used instead of the local ELK stack, preserve the daily-index or equivalent retention policy and keep `traceId`, `requestId`, `service`, `environment`, and release-correlated fields searchable.

## Validation

- Elasticsearch health: `curl http://localhost:9200/_cluster/health`
- Logstash logs: `docker logs logstash`
- Kibana status: `curl http://localhost:5601/api/status`
- Example alert sink logs: `docker logs alert_webhook_sink`
- Hosted release validation minimum:
  - confirm `GET /api/health/ready` returns `release.version`
  - confirm the current release writes logs into the centralized sink
  - confirm `traceId` pivots still work between traces and logs after the deploy

## Notes

- Grafana no longer provisions a dead Loki datasource in this repo; ELK is the supported log path.
- Trace search works through `traceId`, and worker replay troubleshooting works through `eventId`, `validatedEventId`, and `deliveryId`.
