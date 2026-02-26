# K8s Realtime Metrics Preflight

Use this checklist before enabling Kubernetes-style service discovery for EcoTrack realtime metrics.

## Required Before Rollout

- Kubernetes cluster available for dev/staging validation.
- API deployed with at least 2 replicas.
- Prometheus deployment approach selected:
  - Prometheus Operator (`ServiceMonitor`/`PodMonitor`), or
  - raw Prometheus config with Kubernetes SD.
- Prometheus has RBAC permissions to discover targets in the API namespace.
- `/api/metrics` reachable from Prometheus scrape path.

## Recommended Early

- Stable Kubernetes labels on API workloads (example: `app=ecotrack-api`).
- NetworkPolicy allows Prometheus -> API metrics traffic.
- Ingress/proxy idle timeout supports:
  - WebSocket upgrades for `/api/planning/ws`
  - long-lived SSE connections for `/api/planning/stream`

## Can Be Deferred

- Grafana dashboard panel tuning.
- Alert threshold tuning per environment.
- Long-term retention/storage optimization.

## Verification Commands (after deploy)

- Check metrics endpoint:
  - `curl http://<api-service>/api/metrics`
- Confirm realtime series present:
  - `ecotrack_realtime_active_connections`
  - `ecotrack_realtime_connection_events_total`
  - `ecotrack_realtime_emitted_events_total`
- Confirm diagnostics endpoint (authorized users):
  - `GET /api/planning/realtime/health`
