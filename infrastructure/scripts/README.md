# Infrastructure Scripts

Execution policy:
- `infrastructure/scripts/*.bat` and `infrastructure/scripts/*.ps1` are the default host scripts.
- `infrastructure/scripts/host-bash/*.sh` are optional host Bash helpers for macOS/Linux.
- `infrastructure/scripts/validate-env.mjs` validates environment templates and policy constraints used by CI/CD.
- `infrastructure/scripts/validate-doc-sync.mjs` enforces path-aware documentation updates for runtime, schema, env, workflow, and release changes.
- `infrastructure/scripts/validate-spec-contracts.mjs` enforces CDC traceability matrix integrity and executable-spec contracts.
- `infrastructure/scripts/install-git-hooks.mjs` configures the repo-local git hooks path to `.githooks`.
- `infrastructure/scripts/ci/run-k6-scenarios.mjs` runs the repo-owned K6 scenario pack and exports summaries under `tmp/ci/k6`.
- `infrastructure/scripts/ci/generate-release-manifest.mjs` writes a repo-owned release manifest and markdown summary under `tmp/ci/release`.
- `infrastructure/scripts/ci/run-deploy-hooks.mjs` triggers optional frontend/backend deploy hooks and records their outcomes under `tmp/ci/release`.
- `infrastructure/scripts/ci/run-release-smoke.mjs` polls hosted frontend/backend endpoints and records release smoke evidence under `tmp/ci/release`.
- `infrastructure/scripts/ci/run-mutation-gate.mjs` runs the focused Stryker mutation gate defined in `infrastructure/tooling/quality/stryker.config.mjs`.
- `infrastructure/scripts/ci/run-visual-gate.mjs` runs Percy with either `CI_PERCY_COMMAND` or the default snapshot flow in `run-visual-snapshots.mjs`.
- `infrastructure/scripts/ci/run-lighthouse-gate.mjs` builds the app, serves a local preview, and writes Lighthouse reports to `tmp/ci/lighthouse`.
- `infrastructure/scripts/iot-chaos-harness.mjs` seeds the IoT event pipeline, injects restart and replay chaos scenarios against Docker Compose, and writes markdown reports under `tmp/chaos`.
  The harness defaults to `--api-transport auto`, which tries host HTTP first and then falls back to `docker compose exec` against the `backend` container when the API is only reachable on the internal Docker network.

Common host commands:
- `npm run dev:doctor`
- `npm run validate-doc-sync`
- `npm run hooks:install`
- `npm run health --workspace=ecotrack-infrastructure`
- `npm run obs:up --workspace=ecotrack-infrastructure`
- `npm run chaos:iot --workspace=ecotrack-infrastructure -- --scenario api-restart`
- `npm run chaos:iot --workspace=ecotrack-infrastructure -- --scenario api-restart --api-transport docker`
- `npm run verify:docker --workspace=ecotrack-infrastructure`
- `npm run ci:release:manifest`
- `npm run ci:release:deploy-hooks`
- `npm run ci:release:smoke`
- `npm run ci:quality:k6`
- `npm run ci:quality:visual:snapshots`
