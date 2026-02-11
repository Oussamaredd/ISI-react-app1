# Infrastructure Scripts

Execution policy:
- `infrastructure/scripts/*.bat` and `infrastructure/scripts/*.ps1` are the default host scripts.
- `infrastructure/scripts/host-bash/*.sh` are optional host Bash helpers for macOS/Linux.
- `infrastructure/scripts/migrate.sh` is container-only and is executed by the Docker `migrate` service.
- `infrastructure/scripts/validate-env.mjs` validates environment templates and policy constraints used by CI/CD.
- `infrastructure/scripts/ci/*.sh` contains CI command bundles invoked by `.github/workflows/*`.

Common host commands:
- `npm run health --workspace=react-app1-infrastructure`
- `npm run verify:docker --workspace=react-app1-infrastructure`
