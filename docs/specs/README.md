# Project Specs Inputs

This folder stores original source documents used for planning and traceability.

## Inputs
- `docs/specs/inputs/ECOTRACK_CDC_COMMUN_V2.docx`
- `docs/specs/inputs/ECOTRACK_M2_DEV.xlsx`

## Usage Rules
- Treat files in `inputs/` as read-only reference artifacts.
- Build actionable work items in markdown files (for example `ROADMAP.md`) rather than editing binary files.
- Current project implementation scope is Development specialty only; Security and Data specialty requirements are tracked as future dependencies.

## Active Implementation Specs
- `docs/specs/realtime-dashboard-push-contract.md` - `UI-RT-002` SSE contract and rollout plan for manager/dashboard push updates.
- `docs/specs/websocket-realtime-step-plan.md` - next-step execution plan for WebSocket transport with SSE/polling fallback.
- `docs/specs/k8s-realtime-metrics-preflight.md` - preflight checklist for Kubernetes-based metrics discovery rollout.
