# Project Specs Inputs

This folder stores original source documents used for planning and traceability.

## Inputs
- `docs/specs/inputs/ECOTRACK_CDC_COMMUN_V2.docx`
- `docs/specs/inputs/ECOTRACK_M2_DEV.xlsx`

## Usage Rules
- Treat files in `inputs/` as read-only reference artifacts.
- Build actionable work items in markdown files (for example `ROADMAP.md`) rather than editing binary files.
- Current project implementation scope is Development specialty only; Security and Data specialty requirements are tracked as future dependencies.
- Treat CDC specs as executable contracts, not docs-only references:
  - canonical governance file: `docs/specs/source-of-truth.dev.json`
  - canonical matrix file: `docs/specs/cdc-traceability-matrix.dev.json`
  - human-readable matrix: `docs/specs/cdc-traceability-matrix.dev.md`
  - CI/local validator command: `npm run validate-specs`
  - CI evidence summary command: `npm run ci:cdc:summary`

## Active Implementation Specs
- `docs/specs/realtime-dashboard-push-contract.md` - `UI-RT-002` SSE contract and rollout plan for manager/dashboard push updates.
- `docs/specs/websocket-realtime-step-plan.md` - next-step execution plan for WebSocket transport with SSE/polling fallback.
- `docs/specs/k8s-realtime-metrics-preflight.md` - preflight checklist for Kubernetes-based metrics discovery rollout.
- `docs/specs/mobile-platform-integration-contract.md` - integration contract for future mobile microservice consumption of platform APIs and GPS-enabled use cases.
- `docs/specs/SOURCE_OF_TRUTH.md` - executable-spec governance, scope, and update workflow.
- `docs/specs/cdc-traceability-matrix.dev.md` - Development-specialty CDC use-case traceability and current coverage status.
- `docs/specs/workbook-monolith-open-tasks.md` - detailed one-task-per-section mapping of open workbook tasks adapted to EcoTrack monolith delivery.
