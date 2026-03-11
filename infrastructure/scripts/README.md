# Infrastructure Scripts

Execution policy:
- `infrastructure/scripts/*.bat` and `infrastructure/scripts/*.ps1` are the default host scripts.
- `infrastructure/scripts/host-bash/*.sh` are optional host Bash helpers for macOS/Linux.
- `infrastructure/scripts/validate-env.mjs` validates environment templates and policy constraints used by CI/CD.
- `infrastructure/scripts/validate-doc-sync.mjs` enforces path-aware documentation updates for runtime, schema, env, workflow, and release changes.
- `infrastructure/scripts/validate-spec-contracts.mjs` enforces CDC traceability matrix integrity and executable-spec contracts.
- `infrastructure/scripts/install-git-hooks.mjs` configures the repo-local git hooks path to `.githooks`.
- `infrastructure/scripts/ci/run-k6-scenarios.mjs` runs the repo-owned K6 scenario pack and exports summaries under `tmp/ci/k6`.
- `infrastructure/scripts/ci/run-mutation-gate.mjs` runs the focused Stryker mutation gate defined in `infrastructure/tooling/quality/stryker.config.mjs`.
- `infrastructure/scripts/ci/run-visual-gate.mjs` runs Percy with either `CI_PERCY_COMMAND` or the default snapshot flow in `run-visual-snapshots.mjs`.
- `infrastructure/scripts/ci/run-lighthouse-gate.mjs` builds the app, serves a local preview, and writes Lighthouse reports to `tmp/ci/lighthouse`.

Common host commands:
- `npm run dev:doctor`
- `npm run validate-doc-sync`
- `npm run hooks:install`
- `npm run health --workspace=ecotrack-infrastructure`
- `npm run verify:docker --workspace=ecotrack-infrastructure`
- `npm run ci:quality:k6`
- `npm run ci:quality:visual:snapshots`
