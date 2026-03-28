# Observability And Reliability Runbook

Use this runbook for non-IoT platform alerts, synthetic-monitoring failures, SLO review, and error-tracking triage.

## Supported Stack

- Metrics: `GET /api/metrics` scraped by Prometheus and visualized in Grafana.
- Logs: structured API logs shipped to ELK when `ENABLE_LOGSTASH=true`.
- Traces: OTLP export from the API/runtime into Jaeger locally or an OTLP-compatible hosted collector.
- Error tracking: optional Sentry wiring on web and mobile, plus aggregate client telemetry through `POST /api/errors` and `POST /api/metrics/frontend`.

Authoritative dashboards:

- `EcoTrack Metrics Overview`
- `EcoTrack Business KPIs`
- `EcoTrack Reliability SLOs`
- `EcoTrack Security Signals Baseline`

Authoritative workflows:

- immediate deploy validation: `.github/workflows/CD.yml`
- scheduled synthetic monitoring: `.github/workflows/synthetic-monitoring.yml`

## Trace And APM Baseline

- Use `OTEL_TRACING_ENABLED=true` to emit end-to-end traces for auth exchange, citizen reporting, planning, tour execution, route rebuilds, and IoT worker processing.
- Sampling defaults are repo-owned and environment-specific:
  - local/development: `OTEL_TRACES_SAMPLER_RATIO=1`
  - staging: `OTEL_TRACES_SAMPLER_RATIO=0.2`
  - production: `OTEL_TRACES_SAMPLER_RATIO=0.1`
- Local observability uses Jaeger through the Docker `obs` profile.
- Hosted environments should keep OTLP as the canonical export contract even when the backing APM vendor changes.

## Probe Ownership

| Probe or check | Consumer | Purpose |
| --- | --- | --- |
| `GET /health` | direct process checks | dependency-free liveness |
| `GET /healthz` | edge and provider health checks | root liveness alias |
| `GET /startupz` | startup probes and cold-start checks | dependency-free startup confirmation |
| `GET /readyz` | load-balancer and operator checks | dependency-aware readiness alias |
| `GET /api/health/ready` | CD smoke and synthetic monitoring | release-safe API readiness |
| frontend root (`/`) | CD smoke and synthetic monitoring | hosted HTML reachability |
| frontend `/login` | synthetic monitoring | auth entry route reachability |
| frontend `/app/dashboard` | synthetic monitoring | SPA deep-link routing integrity |
| `GET /auth/google` | smoke/synthetic when configured | OAuth redirect contract |
| `POST /login` + `GET /me` | synthetic monitoring when credentials exist | local-auth critical journey |

Do not invent Kubernetes-only probe semantics in hosted environments. Keep the current browser edge plus hosted monolith contract authoritative.

## Synthetic Monitoring

Command:

```bash
npm run ci:synthetic
```

Required environment inputs:

- `CD_DEPLOY_APP_URL`
- `CD_DEPLOY_API_HEALTH_URL`

Optional environment inputs:

- `CD_DEPLOY_FRONTEND_HEALTH_URL`
- `CD_DEPLOY_OAUTH_ENTRY_URL`
- `CD_DEPLOY_EXPECTED_OAUTH_CALLBACK_URL`
- `CD_SYNTHETIC_USER_EMAIL`
- `CD_SYNTHETIC_USER_PASSWORD`
- `CD_SYNTHETIC_EXPECTED_USER_ROLE`
- `CD_SYNTHETIC_CONFIRM_RETRIES`
- `CD_SYNTHETIC_RETRY_INTERVAL_MS`

Synthetic coverage:

- frontend root returns HTML
- `/login` returns HTML and the local-auth shell
- `/app/dashboard` still resolves as a hosted SPA route
- API readiness returns HTTP `200` and `status: ok`
- optional frontend health probe returns HTTP `200`
- optional OAuth entry still redirects to the expected callback
- optional local-auth journey can log in and read `GET /me`

False-positive suppression:

- the synthetic script retries the full suite before failing
- use `CD_SYNTHETIC_CONFIRM_RETRIES` for consecutive failing passes
- use `CD_SYNTHETIC_RETRY_INTERVAL_MS` to space retries
- keep provider-account alerting external to the repo; the repo-owned workflow is the canonical check definition

Artifacts:

- `tmp/ci/synthetic/synthetic-monitoring.<environment>.json`
- `tmp/ci/synthetic/synthetic-monitoring.<environment>.md`

## Business KPI Metrics

The first-class low-cardinality business KPI families are:

- `ecotrack_citizen_reports_total`
- `ecotrack_citizen_reports_created_last_hour`
- `ecotrack_tours_total`
- `ecotrack_tours_completed_last_hour`
- `ecotrack_challenges_total`
- `ecotrack_challenge_participations_total`
- `ecotrack_challenge_completions_last_hour`
- `ecotrack_gamification_profiles_total`
- `ecotrack_gamification_points_total`

Use labels only where the value space is bounded and operator-friendly, such as `status` or `severity`.

## Error Tracking Workflow

- Web and mobile Sentry events must carry the same release identifier used by hosted smoke and synthetic monitoring.
- Use `VITE_RELEASE_VERSION`, `EXPO_PUBLIC_RELEASE_VERSION`, and `SENTRY_RELEASE` as one aligned release tag family.
- Keep DSNs public-only on client env files; keep `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` in CI or secret-manager injection only.
- Triage minimum:
  - review new issues after each deploy
  - group by release and environment first
  - treat regressions in the current release as deploy blockers until routed or mitigated
  - keep false-positive filters and quota controls in the provider account, not in committed client env files

## SLOs And Error Budgets

Use a small, credible set of SLIs first:

- Availability SLI: hosted synthetic pass rate for frontend root plus API readiness.
- API success SLI: non-health API requests returning non-5xx responses.
- API latency SLI: `p95` of `ecotrack_http_request_duration_ms`.

Current repo-owned targets:

- availability target: `99.5%` monthly synthetic pass rate
- API success target: `99.0%` monthly non-5xx success rate
- API latency target: `p95 < 500ms`

Burn-rate implementation:

- Prometheus records `job:ecotrack_api:http_5xx_ratio:*`
- Prometheus records `job:ecotrack_api:http_5xx_burn_rate:*`
- Grafana dashboard `EcoTrack Reliability SLOs` visualizes the live burn windows

Alerting policy:

- `EcoTrackApiErrorBudgetBurnFast`: treat as critical and freeze non-fix deploys immediately
- `EcoTrackApiErrorBudgetBurnSlow`: treat as warning and review whether the next deploy should pause
- `EcoTrackApiP95LatencyHigh`: investigate before user-facing latency becomes an error-budget problem

Release-freeze guidance:

- freeze feature deploys when the fast-burn alert fires
- allow only rollback, mitigation, or direct reliability fixes while the fast-burn alert is active
- record the alert window, owning release, and remediation in the deployment summary or incident notes

## Alert Handling

This runbook owns these non-IoT alerts:

- `EcoTrackApiDown`
- `EcoTrackApiP95LatencyHigh`
- `EcoTrackApi5xxRateHigh`
- `EcoTrackObservabilitySnapshotDown`
- `EcoTrackApiErrorBudgetBurnFast`
- `EcoTrackApiErrorBudgetBurnSlow`
- `EcoTrackCriticalContainerFillPresent`
- `EcoTrackContainerMaxFillAboveNinety`
- `EcoTrackCriticalAlertEventsOpen`
- `FrontendErrorIngestionSpike`
- `RealtimeWebSocketAuthFailuresHigh`
- `EcoTrackAuthorizationDeniedSpike`
- `EcoTrackLoginFailuresHigh`

If an alert is IoT-pipeline specific, use `docs/operations/runbooks/IOT_EVENT_REPLAY_AND_ALERTING.md` instead.

## Immediate Triage Steps

1. Open Grafana and check `EcoTrack Reliability SLOs`.
2. Confirm `ecotrack_observability_snapshot_up == 1` before trusting DB-backed business gauges.
3. Check the current release from hosted smoke or synthetic artifacts.
4. Pivot from alert time to traces and logs using `traceId` when available.
5. If client failures spike, review Sentry by release and environment before opening a broader runtime incident.
