# K8s Realtime Metrics Preflight

Use this checklist before enabling Kubernetes-style service discovery for EcoTrack realtime metrics.

## Current Development Status

- Realtime transport metrics are already exposed by API at `GET /api/metrics`.
- Realtime diagnostics are already exposed at `GET /api/planning/realtime/health` (analytics-read permission).
- This means development is ready to continue without Kubernetes rollout.

Use the rest of this file as the "do later" release-readiness checklist.

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

## Later Completion Checklist (Release Readiness)

### 1) Cluster and Workload Baseline

- [ ] Create/confirm staging cluster and namespace for EcoTrack.
- [ ] Deploy API with at least 2 replicas.
- [ ] Confirm pod labels are stable (example: `app=ecotrack-api`, `component=api`).

### 2) Monitoring Stack Enablement

- [ ] Install or confirm Prometheus stack (Operator preferred).
- [ ] Create `ServiceMonitor` or `PodMonitor` for API metrics endpoint `/api/metrics`.
- [ ] Confirm scrape targets are UP in Prometheus.

### 3) Access and Network Controls

- [ ] Apply RBAC so Prometheus can discover and scrape API targets.
- [ ] Apply NetworkPolicy allowing Prometheus -> API metrics traffic.
- [ ] Validate ingress/proxy supports:
  - WebSocket upgrades at `/api/planning/ws`
  - long-lived SSE at `/api/planning/stream`

### 4) Dashboards and Alerts

- [ ] Add Grafana panels for:
  - `ecotrack_realtime_active_connections`
  - `ecotrack_realtime_connection_events_total`
  - `ecotrack_realtime_emitted_events_total`
  - `ecotrack_realtime_last_event_timestamp_seconds`
- [ ] Enable and tune alert rules in `infrastructure/tooling/monitoring/alert_rules.yml` for staging then production.

### 5) SLO and Reliability Validation

- [ ] Confirm freshness SLO in staging (`<= 10s` for critical updates).
- [ ] Confirm fallback behavior (`WS -> SSE -> polling`) under forced failure drills.
- [ ] Run a short load test with concurrent manager sessions and watch realtime metrics/alerts.

### 6) Production Cutover Gate

- [ ] Document on-call runbook for realtime outages and fallback interpretation.
- [ ] Confirm CI release gate includes realtime transport tests (`npm run test:realtime --workspace=ecotrack-app`).
- [ ] Sign off on alert thresholds and dashboard ownership.

## Manual Tasks You Will Likely Do Yourself Later

- Cluster provisioning and namespace setup.
- Prometheus/Grafana installation and credentials.
- RBAC, NetworkPolicy, and ingress timeout tuning.
- Final alert threshold approvals with product/ops stakeholders.
