# Specs Source Of Truth (Development Specialty)

Last updated: 2026-02-27

## Canonical files

- `docs/specs/source-of-truth.dev.json` (authoritative machine-readable governance file)
- `docs/specs/cdc-traceability-matrix.dev.json` (authoritative machine-readable use case matrix)
- `docs/specs/cdc-traceability-matrix.dev.md` (human-readable matrix view)
- `docs/specs/mobile-platform-integration-contract.md` (platform/mobile integration contract)

## Scope policy

- Active implementation scope remains `Development` specialty only.
- Security/Data requirements are tracked as dependencies/handoffs, not implementation scope in this phase.

## Executable contract rules

1. Every required CDC use case ID in `source-of-truth.dev.json` must exist exactly once in the matrix.
2. Every matrix entry must include:
   - status from allowed values (`implemented`, `partial`, `planned`, `blocked`)
   - endpoint contract(s)
   - implementation file(s)
   - automated verification evidence and CI check(s)
3. For `implemented` entries, at least one automated test evidence file must be present.
4. For non-implemented entries, explicit gap statements are required.
5. All referenced paths must exist in the repo.

## Enforcement

- Local/CI validator: `npm run validate-specs`
- PR gate: CI workflow `Architecture Boundaries` job runs `npm run validate-specs` before lint.
- Realtime contract gate remains required in CI via:
  - `npm run test:realtime --workspace=ecotrack-app`

## Update workflow

1. Update use case contract or implementation.
2. Update `cdc-traceability-matrix.dev.json` to reflect endpoints/tests/status.
3. Run `npm run validate-specs`.
4. Run required workspace checks from `AGENTS.md` matrix.
5. Update this file only when governance rules change.

