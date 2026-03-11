# Infrastructure Scripts

Execution policy:
- `infrastructure/scripts/*.bat` and `infrastructure/scripts/*.ps1` are the default host scripts.
- `infrastructure/scripts/host-bash/*.sh` are optional host Bash helpers for macOS/Linux.
- `infrastructure/scripts/validate-env.mjs` validates environment templates and policy constraints used by CI/CD.
- `infrastructure/scripts/validate-doc-sync.mjs` enforces path-aware documentation updates for runtime, schema, env, workflow, and release changes.
- `infrastructure/scripts/validate-spec-contracts.mjs` enforces CDC traceability matrix integrity and executable-spec contracts.
- `infrastructure/scripts/install-git-hooks.mjs` configures the repo-local git hooks path to `.githooks`.
- `infrastructure/scripts/ci/*.sh` contains CI command bundles invoked by `.github/workflows/*`.

Common host commands:
- `npm run dev:doctor`
- `npm run validate-doc-sync`
- `npm run hooks:install`
- `npm run health --workspace=ecotrack-infrastructure`
- `npm run verify:docker --workspace=ecotrack-infrastructure`
