# EcoTrack Platform Micro Roadmap

Last updated: 2026-03-27

## Purpose

This document restates the canonical roadmap from the Platform / DevOps point of view.

Use it when the question is not "what does the product need?" but rather:

- what platform-owned work exists across the roadmap
- which parts are repo-owned and can be delivered in code
- which parts require external operator or provider actions
- which parts are intentionally deferred until the hosted monolith needs them
- which parts are actually Security or Data handoff instead of Platform work

This file does not replace `docs/planning/roadmaps/ROADMAP.md`. It is a scoped execution companion for the platform lane.

## Scope Boundary

### Platform-Code

This is repo-owned work and can usually be implemented directly in:

- `.github/workflows/**`
- `infrastructure/**`
- `app/**` when the change is about deployment, caching, client telemetry, or release behavior
- `api/**` when the change is about health, metrics, tracing, logging, operational limits, or runtime wiring
- `docs/**` when the change is about runbooks, env contracts, rollout rules, or operator procedures

Typical examples:

- CI and CD workflows
- Dockerfiles and image hardening
- environment validation
- release scripts and smoke checks
- health and readiness endpoints
- metrics, logs, and tracing instrumentation
- dashboards as code
- cache headers, compression, and edge-aware runtime behavior

### Platform-External

This is real Platform / DevOps work, but it lives outside the repo and therefore needs manual operator execution.

Typical examples:

- GitHub Environments and approval rules
- provider secrets and deploy hooks
- Cloudflare, Render, and Supabase project setup
- DNS, certificates, and domain routing
- monitoring SaaS accounts and alert receivers
- PagerDuty, Slack, and email routing
- hosted synthetic monitoring
- managed registry, cluster, or network resources

### Security Handoff

This is not a Platform execution gap under the current scope freeze. It is intentionally outside the Development-only phase.

Typical examples:

- Vault policy design and rollout
- secret rotation governance
- SIEM operations
- pentest execution
- compliance-driven control design

### Data Handoff

This is also outside the current phase.

Typical examples:

- MLOps platforms
- feature stores
- model deployment strategies
- drift detection and retraining systems

## How To Use This Micro Roadmap

- Treat `DONE` in the main roadmap as "baseline exists"; this file then defines what maintenance or external operationalization still matters.
- Treat `DEFERRED_PLATFORM` as "development-owned, but do only if the hosted monolith outgrows the current platform model."
- Treat `HANDOFF_SECURITY` and `HANDOFF_DATA` as explicit non-platform ownership.
- Prefer the hosted monolith baseline first: Cloudflare Pages + Render + Supabase-managed Postgres/Auth + GitHub Actions.
- Add Kubernetes, Helm, ArgoCD, broad Terraform, or Ansible only when the supported runtime actually needs them.

## M1 - Design Inputs and Platform Preconditions

Platform scope status: `REFERENCE_ONLY`

Platform focus:

- Use M1 outputs as planning inputs, not as a separate implementation track.
- Keep architecture, environment, resilience, and observability assumptions aligned with the real hosted target.
- Make sure deployment and operations docs never drift away from the architectural contract.

What matters in practice:

- deployment shape must stay compatible with the modular monolith
- env rules must preserve browser, mobile, API, and database separation
- RTO, RPO, monitoring, and release expectations should be captured before platform expansion work starts

When to focus:

- continuously, but only as input to real platform tasks in later milestones

## M2 - Runtime Service Foundations

Platform scope status: `DONE` with ongoing maintenance

### M2.2 - Circuit Breaker and Fallback

Current platform value:

- protects the monolith from upstream routing-provider instability
- gives release-safe fallback behavior during provider degradation

Platform-code focus:

- keep timeout, failure-threshold, and reset-window values env-driven
- keep fallback behavior covered by tests and runbooks
- expose enough telemetry to distinguish provider outage from internal regression

Platform-external focus:

- tune provider-specific thresholds per environment once real traffic patterns are known

### M2.4 - Health, Readiness, and Startup Probes

Current platform value:

- gives load balancers, smoke tests, and release automation a stable control plane

Platform-code focus:

- preserve root and `/api` health aliases
- keep readiness dependency-aware and liveness dependency-light
- ensure release smoke remains wired to readiness payloads and `release.version`

Platform-external focus:

- point provider health checks at the documented readiness path
- configure platform routing so frontend edge health checks do not interfere with login flows

### M2.6 - Structured Logging

Current platform value:

- makes release incidents and request-path failures searchable

Platform-code focus:

- preserve `traceId`, `spanId`, and request correlation fields
- keep log schemas stable enough for dashboards and search queries
- keep log shipping optional and env-driven

Platform-external focus:

- connect the runtime to the chosen centralized sink
- keep retention and access policies aligned with actual operations

### M2.7 - Distributed Tracing

Current platform value:

- makes critical request paths diagnosable across auth, reporting, planning, and worker flows

Platform-code focus:

- keep OTLP configuration env-driven
- keep business spans around slow and failure-prone workflows
- preserve trace propagation between HTTP and internal worker paths

Platform-external focus:

- configure the collector or managed APM endpoint per environment
- set sampling rates that are financially and operationally sane

### M2.11 - Rate Limiting

Current platform value:

- reduces abuse and protects the app during noisy traffic spikes

Platform-code focus:

- keep app-level throttles in place for auth and sensitive endpoints
- preserve probe exclusions and real-user compatibility

Platform-external focus:

- align edge or provider rate limits with application throttles instead of creating conflicting behavior

### M2.13 - Prometheus Metrics

Current platform value:

- provides the base metrics surface for the whole observability stack

Platform-code focus:

- keep `/api/metrics` stable
- preserve RED HTTP metrics, runtime gauges, and queue or worker metrics
- keep metrics naming and labels low-cardinality

Platform-external focus:

- wire scraping, retention, and alerts in the hosted environment

### M2.14 - Validated Consumer Operations

Current platform value:

- gives the monolith a recoverable downstream processing path

Platform-code focus:

- keep backlog and failure metrics visible
- preserve recovery, replay, and lag instrumentation

Platform-external focus:

- define operational thresholds for replay, lag, and failure escalation

## M3 - Event Workflow Hardening

Platform scope status: `DONE` with operational follow-through

### M3.4 - Alertmanager Routing

Current platform value:

- gives the platform a codified alert path instead of ad hoc log watching

Platform-code focus:

- keep alert rules versioned in repo
- keep alert annotations tied to runbooks
- preserve dev-safe local webhook sinks for rehearsal

Platform-external focus:

- wire real Slack, PagerDuty, or email receivers
- tune noise, grouping, and severity thresholds based on live incidents

### M3.7 - Centralized Log Aggregation

Current platform value:

- enables trace-to-log and event-to-log pivots during operations

Platform-code focus:

- keep the local ELK rehearsal stack usable
- preserve searchable correlation fields
- keep shipping configuration optional and documented

Platform-external focus:

- choose the managed logging target
- enforce retention, access, and archival policies

### M3.8 - Replay Controls

Current platform value:

- gives operators a recovery mechanism that does not depend on code patches

Platform-code focus:

- keep replay endpoints protected, traceable, and documented
- keep replay metadata and audit records intact

Platform-external focus:

- define who is allowed to trigger replay in real environments
- document escalation if replay alone is not sufficient

### M3.10 - Service-Hop Observability

Current platform value:

- replaces cluster-first service-mesh assumptions with monolith-equivalent hop telemetry

Platform-code focus:

- keep latency histograms and throughput counters stable
- preserve dashboard coverage for ingest, validation, delivery, and rollup flows

Platform-external focus:

- decide which dashboards are mandatory for on-call use
- wire them to the hosted monitoring backend

### M3.13 - Development-Owned Security Signal Baseline

Current platform value:

- captures useful security-ish telemetry without pretending to be a full SOC

Platform-code focus:

- keep denied-auth, authorization, and audit signals observable
- avoid expanding this into a fake SIEM implementation

Platform-external focus:

- hand operational consumption of these signals to Security when that lane exists

### M3.14 - Consumer Lag Monitoring

Current platform value:

- gives the team early warning before internal event pipelines degrade silently

Platform-code focus:

- preserve lag, queue age, and shard imbalance metrics
- keep alerts tied to real recovery actions

Platform-external focus:

- define lag thresholds per environment and business hour profile

### M3.15 - Chaos and Recovery Rehearsal

Current platform value:

- proves recovery instead of assuming it

Platform-code focus:

- keep the chaos harness runnable and documented
- preserve output artifacts and reconciliation reporting

Platform-external focus:

- schedule periodic rehearsals for staging or a safe non-production environment

## M4 - Platform and Deployment Baseline

Platform scope status: `DONE` for the hosted monolith baseline, with several intentional platform deferrals

### M4.1 and M4.2 - Broad Terraform Networking and Kubernetes Provisioning

Platform status:

- `DEFERRED_PLATFORM`

Why deferred:

- the supported runtime is hosted, not self-managed Kubernetes
- broad VPC and cluster provisioning would add operational surface without current product payoff

When to focus:

- only if EcoTrack moves from provider-managed hosting to self-managed infrastructure

### M4.3 - Helm Packaging

Platform status:

- `DEFERRED_PLATFORM`

Why deferred:

- Helm only becomes a real delivery asset once Kubernetes is a supported runtime, not a hypothetical one

### M4.4 - CI/CD Baseline

Platform status:

- `DONE`

Platform-code focus:

- keep CI and CD workflows aligned with actual hosted deployment rules
- keep validation, smoke checks, and rollback instructions versioned
- keep documentation synced whenever workflow behavior changes

Platform-external focus:

- maintain GitHub environments, provider credentials, and approval rules

### M4.5 - Managed Data Services

Platform status:

- `DONE` in the hosted monolith interpretation

Platform-code focus:

- keep `DATABASE_URL` and pooler usage rules explicit
- keep migrations and restore paths documented

Platform-external focus:

- maintain Supabase projects, database backups, auth configuration, and restore procedures

### M4.6 - Advanced Rollout Strategy

Platform status:

- baseline complete through gated promotion plus rollback-by-ref

Platform-code focus:

- keep release order, evidence artifacts, and smoke checks reliable

Platform-external focus:

- only introduce blue/green or canary if traffic volume and blast-radius justify the extra complexity

### M4.7 - Terraform Remote State

Platform status:

- `DEFERRED_PLATFORM`

Why deferred:

- remote Terraform state is only meaningful once Terraform becomes a first-class deployment system for this repo

### M4.8 - Secrets and Vault-Like Delivery

Platform status:

- provider secret managers are the current baseline
- Vault-specific governance remains outside this platform phase

Platform-code focus:

- keep env templates, validation, and secret-injection assumptions clean

Platform-external focus:

- maintain provider-side secrets and rotation operations

### M4.9 - IoT Gateway Provider Layer

Platform status:

- deferred behind the current monolith ingestion baseline

When to focus:

- only when a real MQTT or managed IoT entry layer becomes necessary

### M4.10 - HPA-Style Auto-Scaling

Platform status:

- deferred for the main hosted runtime

Current interpretation:

- keep runtime stateless enough for scale-out
- keep templates and notes ready if Kubernetes becomes real later

### M4.11 - Network Isolation

Platform status:

- partially represented through hosted-provider boundaries, not K8s network policy

Platform-code focus:

- keep application ports, origins, and exposed paths minimal

Platform-external focus:

- enforce provider firewall or allowlist rules where supported

### M4.12 - Service Mesh

Platform status:

- `DEFERRED_PLATFORM`

Why deferred:

- the monolith does not need service-mesh complexity on the current path

### M4.13 - WAF

Platform status:

- external-edge concern with Security crossover

Platform-code focus:

- keep the app compatible with strict headers, throttling, and edge filtering

Platform-external focus:

- configure Cloudflare or equivalent WAF rules if and when needed

### M4.14 - Drift Detection and IaC Audit

Platform status:

- future platform expansion item

When to focus:

- after Terraform or other provider automation becomes a first-class control plane

### M4.15 - Disaster Recovery

Platform status:

- baseline runbooks exist and should be rehearsed

Platform-code focus:

- keep restore documentation and validation steps current

Platform-external focus:

- verify real backup retention, restore permissions, and RTO or RPO expectations on hosted providers

## M5 - Frontend and Client Platform Slice

Platform scope status: `DONE` for the implemented baseline, with external rollout follow-through still relevant

### M5.8 - Frontend Performance and Web Vitals

Platform-code focus:

- keep bundle budgets and Lighthouse-style performance checks in CI
- keep frontend release builds exposing stable metadata and cache behavior

Platform-external focus:

- review Cloudflare or equivalent caching behavior against real traffic and cold-start patterns

### M5.10 - Service Worker and Client Cache Policy

Platform-code focus:

- keep service worker behavior deterministic
- preserve offline-safe fallbacks and correct asset caching rules

Platform-external focus:

- align CDN and browser cache policy with the service worker instead of fighting it

### M5.13 - Push Notification Workflow

Platform-code focus:

- keep device registration, payload contracts, and deep-link behavior stable

Platform-external focus:

- provision the real push providers, credentials, and environment-specific secrets

### M5.14 - Client Error Tracking

Platform-code focus:

- keep optional Sentry or equivalent wiring in web and mobile clients
- preserve server-side aggregation fallbacks

Platform-external focus:

- create the real monitoring project, DSNs, release tracking, and alert routing

## M6 - Security Governance and Hardening Handoff

Platform scope status: `SECURITY_HANDOFF`

Platform role in this module:

- keep interfaces ready for future Security ownership
- avoid reclassifying governance-heavy security tasks as normal DevOps work

Platform prep that is still reasonable:

- maintain clean secret boundaries
- preserve audit-friendly logs and release evidence
- keep provider and environment contracts documented

Do not absorb into platform scope now:

- Vault governance
- SIEM operations
- pentest execution
- WAF policy ownership
- incident-response runbooks as a formal Security function

## M7 - Data and ML Handoff

Platform scope status: `DATA_HANDOFF`

Platform role in this module:

- keep runtime and deployment surfaces model-friendly without building an MLOps stack

Useful platform prep:

- preserve env separation for future inference services
- keep export and connector patterns stable
- keep monitoring ready for future model-serving KPIs

Do not absorb into platform scope now:

- Kubeflow, MLflow, feature stores, shadow models, retraining pipelines, GPU fleets

## M8 - Internal Event Contracts and Future Adapter Points

Platform scope status: `DONE` for the monolith baseline, with future connector work still relevant

### M8.1 - Internal Event Architecture Contract

Platform-code focus:

- keep event metadata and replay expectations stable enough for future externalization

### M8.7 - Connector Export Layer

Platform-code focus:

- keep export jobs archive-safe, retry-safe, and observable
- preserve replaceable sink contracts for future external targets

Platform-external focus:

- connect the archive or export destination when a real downstream consumer is approved

### M8.8 - Schema Registry Catalog

Platform-code focus:

- keep schema subjects, compatibility notes, and versioning in repo

Platform-external focus:

- only stand up a true external schema-registry service if and when broker-based systems are adopted

### M8.9 - Event Monitoring

Platform-code focus:

- preserve event-pipeline dashboards, alerts, and replay evidence

Platform-external focus:

- operationalize the alerts in the hosted monitoring backend

### M8.10 - Broker Security Compatibility

Platform status:

- keep adapter seams ready, but do not implement broker TLS or SASL as if Kafka were already the runtime

## M9 - CI/CD and Ops Hardening

Platform scope status: `DONE` for the current supported deployment path

### M9.1 - Multi-Environment CI/CD

Platform status:

- `DONE`

Platform-code focus:

- keep the GitHub Actions release pipeline authoritative
- keep development auto-deploy and staging or production gated promotion behavior intact
- keep migration, smoke, artifact, and rollback-by-ref flows documented

Platform-external focus:

- maintain GitHub environments, secrets, deploy hooks, and approval rules

### M9.2 - Broad Terraform Multi-Cloud IaC

Platform status:

- `DEFERRED_PLATFORM`

When to focus:

- if EcoTrack adopts self-managed infrastructure or multiple active cloud providers

What to keep now:

- thin future-compatible scaffolding only

### M9.3 - Ansible Configuration Management

Platform status:

- `DEFERRED_PLATFORM`

When to focus:

- if the project starts owning fleets of servers or images beyond managed providers

### M9.4 - Docker Build Hardening

Platform status:

- `DONE`

Platform-code focus:

- keep multi-stage builds, OCI labels, non-root runtime ownership, release metadata, and image scanning in CI
- keep production images aligned with the actual runtime contract

Platform-external focus:

- run the image builds on hosted CI and keep any provider registry integration healthy

### M9.5 - Kubernetes Deployment Manifests

Platform status:

- `DEFERRED_PLATFORM`

When to focus:

- only once Kubernetes becomes a supported production runtime

### M9.6 - Helm Packaging

Platform status:

- `DEFERRED_PLATFORM`

When to focus:

- only after Kubernetes deployment is real and repeated enough to justify a chart lifecycle

### M9.7 - ArgoCD and GitOps

Platform status:

- `DEFERRED_PLATFORM`

When to focus:

- only after Kubernetes is live and GitOps becomes the chosen deployment control plane

### M9.8 - Vault Integration

Platform status:

- `HANDOFF_SECURITY`

Platform prep only:

- keep provider-secret contracts and env validation clean
- document how runtime secrets are expected to enter the app

### M9.9 - Production Monitoring

Platform status:

- `DONE`

Platform-code focus:

- keep metrics, dashboards, alert rules, and release-smoke integration current
- keep runbooks aligned with the actual supported deployment path

Platform-external focus:

- wire the hosted monitoring backend, retention, and real receiver routing

### M9.10 - Centralized Logging

Platform status:

- `DONE`

Platform-code focus:

- keep structured log shipping and log schemas stable
- preserve release-aware search fields and troubleshooting guidance

Platform-external focus:

- operationalize the centralized sink, retention policy, and access model

## M10 - Non-Functional Quality Expansion

Platform scope status: `DONE`

### M10.2 - K6 Load Testing

Platform-code focus:

- keep scenario packs runnable from the repo
- keep thresholds and artifacts suitable for regression comparison

Platform-external focus:

- decide when load tests become a required pre-release gate instead of an on-demand exercise

### M10.3 - Automated Security Scanning

Platform-code focus:

- keep Semgrep and any repo-owned ZAP baseline hooks healthy

Boundary rule:

- do not treat this as a substitute for Security specialty work

### M10.4 - Mutation Testing

Platform-code focus:

- keep mutation gates scoped and affordable enough to stay useful in CI

### M10.5 - Visual Regression

Platform-code focus:

- keep snapshot coverage and CI hooks current with real UI routes

Platform-external focus:

- maintain the Percy or equivalent account, token, and review workflow

### M10.8 - Lighthouse and Web Performance

Platform-code focus:

- keep route targets, budgets, and artifacts aligned with the live frontend shell

Platform-external focus:

- run these checks against preview or hosted URLs when local-only evidence is not enough

## M11 - Performance and Scale Readiness

Platform scope status: `DONE` for the repo-owned baseline, with some items intentionally future-compatible

### M11.1 - Profiling

Platform-code focus:

- keep repeatable profiling commands and artifact paths available

### M11.2 - Multi-Level Cache and CDN Awareness

Platform-code focus:

- keep API cache controls, invalidation hooks, and edge-aware headers stable

Platform-external focus:

- align provider cache policy and purge workflow with the repo-owned cache contract

### M11.3 - PostgreSQL Query Tuning

Platform-code focus:

- keep indexes, query plans, and performance baselines documented

Platform-external focus:

- monitor hosted database performance and connection pressure under real load

### M11.4 - Compression and Transport Efficiency

Platform-code focus:

- keep API compression, SSE exclusions, and frontend caching rules correct

Platform-external focus:

- enable or tune Brotli, HTTP/2, or HTTP/3 features at the actual edge provider where available

### M11.5 - Lazy Loading and Frontend Asset Strategy

Platform-code focus:

- keep asset priorities, chunking, and bundle budgets aligned with the live shell

### M11.6 - PWA and Offline Baseline

Platform-code focus:

- keep installability, manifest, offline cache, and service worker behavior sane

Platform-external focus:

- confirm hosted headers and cache behavior do not break install or update flows

### M11.7 - Connection Pooling

Platform-code focus:

- keep `DATABASE_POOLER_URL` and `DATABASE_POOL_MAX` support stable
- preserve PgBouncer-compatible runtime behavior

Platform-external focus:

- provision and operate the actual pooler layer if the managed database or traffic profile needs it

### M11.8 - HAProxy Baseline

Platform-code focus:

- keep the repo-owned HAProxy template and operator docs valid

Platform-external focus:

- only deploy HAProxy if the runtime architecture actually introduces multiple backend instances or custom edge routing needs

### M11.9 - Kubernetes HPA and Scale Templates

Platform status:

- done as future-compatible templates, not as the active production runtime

When to focus:

- only if Kubernetes becomes the supported runtime

### M11.10 - Cloudflare CDN

Platform-code focus:

- keep purge automation, edge-aware cache tags, and headers in repo

Platform-external focus:

- operate DNS, proxy, TLS, and cache settings in Cloudflare itself

## M12 - Security Implementation Dependency Set

Platform scope status: `HANDOFF_SECURITY`

Platform prep that remains useful:

- keep env separation strict
- preserve rate limiting, headers, redaction, and release evidence
- keep secret injection contracts provider-friendly
- keep security-relevant telemetry available for future Security consumers

Do not absorb into platform scope now:

- advanced token governance
- encryption policy ownership
- Vault rollout
- SIEM operations
- red-team and pentest programs

## M13 - Observability Stack

Platform scope status: `DONE`, with continuous operational maintenance required

The repo-owned hosted observability model is now closed at the platform-code layer. External provider-account ownership for APM tenants, synthetic-monitor SaaS, PagerDuty, Slack, and Sentry administration still stays outside committed code.

### M13.1 - Tracing Maturity

Current state:

- closed with OTLP export, documented environment-level sampling defaults, and a runbook-owned trace backend contract

Continuous platform focus:

- keep trace retention, search guidance, and provider-specific collector details aligned with the active hosting path

### M13.2 - APM Layer

Current state:

- closed at the repo layer through OTLP-compatible tracing, dashboard coverage, and documented mandatory monolith coverage areas

Continuous platform focus:

- keep the OTLP export contract stable even if the hosted backend vendor changes

Platform-external focus:

- create and operate the chosen APM tenant or collector infrastructure

### M13.3 - Business KPI Metrics

Current state:

- closed with first-class Prometheus KPI families for citizen reports, tours, challenges, participation, and gamification

Continuous platform focus:

- keep labels low-cardinality and operator-friendly

### M13.4 - Alerting Maturity

Current state:

- closed with tuned alert rules, SLO burn-rate alerts, and runbook-backed routing for non-IoT platform alerts

Continuous platform focus:

- keep runbook links, thresholds, and receiver expectations aligned with the current platform behavior

Platform-external focus:

- wire PagerDuty, Slack, email, and maintenance-window silences in the real provider accounts

### M13.5 - Probe Packaging and Health Ownership

Current state:

- closed with explicit ownership across provider checks, CD smoke, synthetic monitoring, and operator use

Continuous platform focus:

- keep startup, liveness, and readiness semantics documented without inventing Kubernetes dependencies where none exist

### M13.6 - Synthetic Monitoring

Current state:

- closed with repo-owned synthetic checks for frontend root, `/login`, `/app/dashboard`, API readiness, optional OAuth redirect, and optional local-auth journeys

Continuous platform focus:

- keep the scheduled GitHub Actions workflow and CD validation aligned with the supported hosting model

Platform-external focus:

- create and operate the real uptime or synthetic monitoring service

### M13.7 - Error Tracking

Current state:

- closed at the repo layer with release-tagging guidance, sourcemap rules, and a documented minimum triage workflow

Continuous platform focus:

- keep release and environment tags aligned across smoke, synthetic monitoring, and Sentry

Platform-external focus:

- maintain the chosen error-tracking account, DSNs, quotas, and alerting

### M13.8 - SLOs, SLIs, and Error Budgets

Current state:

- closed with a small repo-owned SLI set, SLO targets, Grafana burn-rate views, and release-freeze guidance

Continuous platform focus:

- keep SLO thresholds and burn alerts calibrated against the hosted monolith behavior

Platform-external focus:

- operationalize monthly reporting, incident review, and freeze decisions around those SLOs

## M14 - Documentation Operations Completion

Platform scope status: `DONE`, with continuous maintenance required

### M14.3 - Architecture Diagrams

Platform-code focus:

- keep deployment and runtime diagrams aligned with the real hosting model

### M14.4 - Code Annotation Standards

Platform-code focus:

- use docs and annotations to keep platform contracts understandable, especially env and runtime wiring

### M14.6 - Release Versioning and Changelog

Platform-code focus:

- keep release versioning aligned with CI, CD, smoke checks, and deployed runtime metadata

## Recommended Platform Focus Order

### Near-Term Focus

- finish the remaining observability maturity work in `M13`
- operationalize the external pieces of `M9.1`, `M9.9`, `M9.10`, `M10.5`, `M11.7`, and `M11.10`
- keep replay, alerting, and release-smoke runbooks current

### Mid-Term Focus

- rehearse backup, restore, replay, and chaos scenarios regularly
- decide whether managed APM, synthetic monitoring, and formal SLO reporting become required for the project

### Long-Term Platform Expansion

- revisit `M4` and `M9` deferred IaC, Ansible, Kubernetes, Helm, and ArgoCD work only if the hosted monolith no longer fits
- avoid implementing these as checklist theater while Cloudflare Pages + Render + Supabase-managed Postgres/Auth still meet the product need

### Explicit Non-Goals For This Scope

- do not absorb Vault governance into Platform while the scope freeze is active
- do not absorb Data or ML platform work into Platform while the product still runs as a non-ML monolith

## Practical Ownership Rule

If a task can be finished through code, config, tests, and docs inside the repo, it belongs in Platform-Code.

If a task requires a provider console, DNS, certificate authority, secret store, cluster control plane, SaaS account, or manual approval chain, it belongs in Platform-External.

If the task is primarily about governance, compliance, incident authority, or secret-control policy, it belongs in Security handoff even if it touches infrastructure.
