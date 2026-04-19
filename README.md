# EcoTrack Platform

Current platform monorepo, including a native mobile layer:

- `app`: React frontend (Vite)
- `mobile`: React Native / Expo client layer
- `api`: NestJS backend
- `database`: Drizzle schema/migrations/seeders
- `infrastructure`: Docker Compose and ops scripts

## Repository Layout

```text
EcoTrack/
|-- app/
|-- mobile/
|-- api/
|-- database/
|-- infrastructure/
|-- docs/
`-- .github/workflows/
```

## Canonical Env Model

- Local/native dev:
  - Private source: `/.env`
  - Frontend public source: `app/.env.local` (`VITE_*` only)
- Docker dev:
  - Source: `infrastructure/environments/.env.docker`
- Deployed dev/staging/prod:
  - Runtime source: secret-manager injection
  - Committed templates only:
    - `infrastructure/environments/.env.development.example`
    - `infrastructure/environments/.env.staging.example`
    - `infrastructure/environments/.env.production.example`

Precedence: process env > canonical workflow env file > `.example` templates.

## Quick Start (Local/Native)

```bash
npm ci --include=dev
cp .env.example .env
cp app/.env.example app/.env.local
cp mobile/.env.example mobile/.env.local
npm run dev
```

`npm run dev` now gives the local direct API liveness URL from the Port Contract a best-effort warm-up window before Vite starts. If the API is still warming after `30000ms`, the frontend dev server still starts and the app falls back to its built-in API degraded/retry handling instead of killing the whole local-dev session.

The API workspace dev server now boots from the latest successful `dist/` build immediately when one is available, waits for that runtime to become healthy, then refreshes `dist/` in the background and reloads on later successful watch recompiles.

Optional service-scoped template (reference only; root `/.env` remains the local runtime source):

```bash
cp api/.env.example api/.env
```

For the Expo mobile shell:

```bash
npm run dev:mobile
```

Mobile API base helpers:

- `npm run mobile:api-base` prints the recommended direct API base URLs for LAN, Android emulator, and iOS simulator.
- `npm run mobile:env:lan` writes the detected LAN API URL into `mobile/.env.local`.
- `npm run mobile:env:android-emulator` writes the Android emulator-safe API URL into `mobile/.env.local`.
- `npm run mobile:env:ios-simulator` writes the iOS simulator API URL into `mobile/.env.local`.
- `npm run mobile:start:tunnel` starts Expo with a tunnelled JS bundle while still requiring a reachable backend API origin.

Repo-root installs run a `prepare` step that configures the repository-local git hooks path to `.githooks` and generates the managed local `pre-commit` hook there, so doc-sync checks run automatically on `git commit`. `.githooks/` is intentionally ignored and stays local-only. If hooks ever need to be reinstalled manually, run `npm run hooks:install`.

Install contract:

- Use the committed root lockfile with repo-root installs only.
- Do not recover the monorepo with `npm install --prefix <workspace>` or ad-hoc workspace-local installs.
- If the local toolchain drifts, stop active Node/Vite/Expo processes and rerun `npm ci --include=dev` from the repo root.
- On Windows shells where Vite cannot spawn `esbuild` helper processes, the app dev server now falls back to spawn-restricted mode and fully disables Vite dep pre-bundling instead of crashing at startup.

## Port Contract

Local/native dev:

- Browser entrypoint: `http://localhost:5173`
- Public edge API: `http://localhost:5173/api`
- Public edge health: `http://localhost:5173/health`
- API process listen port (direct local diagnostics only): `http://localhost:3001`
- Root `npm run dev` waits on `http://127.0.0.1:3001/health` before Vite starts

Docker dev:

- Sole browser entrypoint: `http://localhost:3000`
- Public edge API: `http://localhost:3000/api`
- Public edge health: `http://localhost:3000/health`
- Backend container still listens on `API_PORT=3001`, but that port is internal-only and not published to the local machine

Use `5173` in the browser for local/native dev. Use `3000` in the browser only for Docker dev. Use direct `3001` only for local-native API diagnostics.

If local-native frontend `/api/*` requests fail, verify the API process directly with:

```bash
curl -f http://localhost:3001/health
curl -f http://localhost:3001/healthz
curl -f http://localhost:3001/readyz
curl -f http://localhost:3001/api/health/ready
curl -f http://localhost:3001/api/metrics
```

If the API liveness check still has not answered after the best-effort warm-up window, `npm run dev` now launches the frontend dev server anyway and leaves the API process running. Read the API startup output in the terminal, wait for `http://localhost:3001/api` to come up, and use the app through `http://localhost:5173`.

## Auth Routes (Local/Docker)

The frontend auth routes are path-stable across local and Docker:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`

Resolve them on the frontend origin defined in the Port Contract (`5173` for local dev, `3000` for Docker dev).

UX contract:

- public routes such as `/` and `/login` render immediately while session discovery runs in the background
- only protected `/app/**` routes wait on session confirmation
- login starts auth requests immediately and does not preflight `/health`

Local auth contract:

- `POST /api/login` returns `{ code, accessToken, user }` for local sign-in; `code` remains available for callback compatibility
- `POST /api/signup` returns `{ accessToken, user }`
- frontend uses the direct local sign-in session when `accessToken` is present, and can still exchange login `code` via `POST /api/auth/exchange`
- frontend stores `accessToken` in `localStorage`
- protected API requests use `Authorization: Bearer <token>`
- frontend clears stale local bearer state when protected API requests return `401`
- reset endpoints are only `POST /api/forgot-password` and `POST /api/reset-password`
- in production, forgot-password returns `204` with no token/url payload

## OAuth Callback Setup

- Local dev callback URI: `http://localhost:5173/api/auth/google/callback`
- Docker dev callback URI: `http://localhost:3000/api/auth/google/callback`
- Set `API_BASE_URL` and `GOOGLE_CALLBACK_URL` to the same public edge origin in active runtime env files.
- In Google Cloud Console, **Authorized redirect URI** must exactly match runtime callback URI:
  - same scheme (`http/https`)
  - same host
  - same port
  - same path (`/api/auth/google/callback`)

Cloudflare Pages edge proxy:

- set `VITE_USE_EDGE_API_PROXY=true` in the Pages build environment
- set `EDGE_PROXY_TARGET_ORIGIN=<backend-public-origin>` so the generated `_redirects` file proxies `/api/*` and `/health`
- keep deployed `VITE_API_BASE_URL` on the frontend origin when the edge proxy is enabled

## Quick Start (Docker Core)

```bash
cp infrastructure/environments/.env.docker.example infrastructure/environments/.env.docker
npm run infra:up
npm run smoke-test
```

Equivalent compose command:

```bash
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile core up --build -d
```

Docker uses the Port Contract above: `http://localhost:3000` is the only browser-facing entrypoint, and the backend keeps `API_PORT=3001` on the internal Docker network.

## Env Key Canonicalization

Canonical keys:

- `DATABASE_URL`
- `API_PORT`
- `API_BASE_URL`
- `VITE_API_BASE_URL`

Deprecated aliases (temporary compatibility only):

- `VITE_API_URL` -> `VITE_API_BASE_URL`
- provider-injected `PORT` -> runtime fallback only when `API_PORT` is absent
- `DB_*` -> `DATABASE_URL`

Database name policy: committed connection-string templates target `ticketdb`.

## Root Commands

- `npm run dev` - local/native app + api dev workflow
- `npm run dev:mobile` - Expo mobile shell
- `npm run dev:doctor` - fast local diagnostics (env keys, db reachability/migrations, health endpoints)
- `npm run build` - reuse the current database dist build when it is already fresh, then build app + api in parallel
- `npm run check:app` / `npm run check:mobile` / `npm run check:api` / `npm run check:database` - fast daily workspace validation sets that only touch the layer you are editing
- `npm run check:app:full` / `npm run check:mobile:full` - full frontend/mobile validation including the split slow UI lanes before handoff
- `npm run validate:affected` - inspect the current git working tree and run only the affected workspace validation matrix plus doc-sync; falls back to the full suite for root, env, infrastructure, and CI changes
- `npm run validate:full` - full developer validation gate for cross-layer, env, and workflow changes (`validate-env:all`, `validate-doc-sync`, `lint`, `typecheck`, `test`)
- `npm run test` - app + mobile + api tests in the stable serial order; the `ecotrack-app` default suite excludes the dedicated key-journey e2e spec so it does not duplicate the separate e2e lane
- `npm run test:app:fast` / `npm run test:mobile:fast` - shared-worker fast Vitest lanes for daily local iteration
- `npm run test:app:ui` / `npm run test:mobile:ui` - slower UI-heavy Vitest lanes split out from the fast path
- `npm run test:mobile` - mobile workspace tests
- `npm run test:api` - backend tests with a cached `ecotrack-database` build pre-step
- `npm run test:e2e` - key citizen/agent/manager journey tests; the app workspace enables the dedicated e2e spec only for this lane via `ECOTRACK_INCLUDE_APP_E2E=1`
- `npm run test:coverage` - coverage-gated validation for app + mobile + api in the stable serial order; the app coverage lane re-enables the dedicated key-journey e2e spec so coverage matches the release gate
- `npm run test:coverage:api` - backend coverage with a cached `ecotrack-database` build pre-step
- `npm run typecheck` - app + mobile + api + database type checks in parallel with TypeScript incremental caches stored under `tmp/tsc/`
- `npm run typecheck --workspace=ecotrack-mobile` - mobile workspace type checks
- `npm run lint` - lint + architecture boundaries in parallel with ESLint content caches stored under `tmp/eslint/`
- `npm run lint --workspace=ecotrack-mobile` - mobile workspace lint
- `npm run validate-specs` - enforce CDC traceability matrix and executable spec contracts
- `npm run validate-env:all` - validate all committed env templates for local, Docker, and deploy workflows
- `npm run validate:workspace-toolchain` - verify the root lockfile and required workspace tool packages before cross-layer build/lint/test flows
- `npm run validate-doc-sync` - validate that behavior, env, schema, workflow, and release changes update the required docs in the same change set
- `npm run ci:cdc:summary` - generate CDC evidence artifact used by CI preflight
- `npm run ci:release:manifest` - generate the release manifest consumed by `CD Deployment`
- `npm run ci:release:deploy-hooks` - trigger configured frontend/backend deploy hooks and capture evidence
- `npm run ci:release:smoke` - run hosted release smoke checks against deployed frontend/backend URLs
- `npm run ci:synthetic` - run hosted synthetic checks for frontend availability, API readiness, auth entry, and the optional synthetic-user confirmation flow
- `npm run ci:quality:k6` - run the default K6 smoke scenario pack against the direct API
- `npm run ci:quality:mutation` - run mutation gate hook (enabled by CI variable)
- `npm run ci:quality:visual` - run Percy visual-regression gate (defaults to the repo snapshot flow when no custom Percy command is set)
- `npm run ci:quality:visual:snapshots` - build the frontend, start preview, and capture the default Percy snapshot route set
- `npm run ci:quality:lighthouse` - build the frontend, start preview, and run the Lighthouse CI gate
- `npm run db:migrate` - run Drizzle migrations
- `npm run db:seed` - run seeders
- `npm run infra:up` / `npm run infra:down` / `npm run infra:health` - Docker lifecycle wrappers
- `npm run smoke-test` - strict Docker edge smoke test (public `3000` edge + internal backend health)

`npm run infra:health` is a strict gate: it exits non-zero when Docker is unreachable or any core service health check fails.
`npm run smoke-test` validates the single-entrypoint Docker contract: local machine port `3001` stays closed, internal backend `3001` stays healthy, and OAuth `/api/auth/google` still emits the `3000` callback origin.

Daily validation workflow:

- Use the relevant `npm run check:<workspace>` command while iterating inside one layer.
- Use `npm run check:app:full` or `npm run check:mobile:full` before handoff when a frontend/mobile change touched the slower UI buckets.
- Use `npm run validate:affected` before handoff when your change stays inside one or more product layers and you want the repo to choose the affected validation set from the current git diff.
- Use `npm run validate:full` for root scripts, infrastructure, env templates, CI workflow, or other cross-layer changes.
- Reserve `npm run quality:product-hardening` for release-style hardening work; it still includes the slow e2e, realtime, coverage, mobile readiness, and Lighthouse gates.

## Architecture Contract

See `docs/architecture/ARCHITECTURE_OVERVIEW.md` for the five-layer contract and Mermaid system/container/component views.

Mobile planning references:

- `docs/specs/mobile-platform-integration-contract.md`
- `docs/specs/mobile-layer-rollout-plan.md`

## Documentation Map

See `docs/README.md` for organized documentation by domain (setup, env, operations, API, and runbooks).

Release and contributor references:

- `CHANGELOG.md`
- `docs/governance/RELEASE_VERSIONING.md`
- `docs/governance/CODE_ANNOTATION_CONVENTIONS.md`
- `docs/operations/runbooks/EXTENDED_QUALITY_GATES.md`
- `npm run hooks:install` and `infrastructure/scripts/install-git-hooks.mjs` for the managed local pre-commit hook

## CI/CD

- `CI.yaml`: canonical `CI Integration` workflow for `pull_request` + `push` on `main`; supports manual `workflow_dispatch` with `full_run=true` and optional `run_extended_quality=true` for K6/ZAP/mutation/visual/Lighthouse lanes, builds both monolith images with release labels, and runs Trivy scans on the built API/frontend images
- `CI.yaml` image scanning is vulnerability-only (`--scanners vuln`) with an explicit timeout and a restored/primed Trivy DB cache before the image scans run; keep runtime image bases patched so the `HIGH`/`CRITICAL` Trivy gate stays actionable instead of failing on stale base packages or secret-scan noise.
- `CD.yml`: canonical `CD Deployment` workflow; `main` auto-promotes `development`, `workflow_dispatch` promotes `development|staging|production`, deploy jobs bind to the matching GitHub Environments (`development`, `staging`, `production`), and each release run writes manifest/deploy-hook/smoke/synthetic evidence artifacts plus a rollback-by-ref summary. GitHub Pages app deployment is retired and reserved for future docs-only follow-up work
- `synthetic-monitoring.yml`: scheduled hosted synthetic workflow that runs every 30 minutes and on manual dispatch across `development`, `staging`, and `production`, reusing `npm run ci:synthetic` and the environment-scoped deploy URLs plus optional synthetic-user secrets. Manual target selection is resolved inside each matrix job instead of a job-level `if` so the workflow remains valid under GitHub's matrix-expression rules.
- Phase-4 readiness is preserved through optional CI variables (`CI_ENABLE_*`) and manual extended-quality artifact/report lanes that can be promoted to blocking checks later.
- The extended-quality pack now produces repo-native K6 summaries, focused Stryker reports, Percy snapshot runs, and filesystem Lighthouse reports; see `docs/operations/runbooks/EXTENDED_QUALITY_GATES.md`.

## Ownership and License

EcoTrack is authored and maintained by Oussama Radouane.

Copyright (c) 2026 Oussama Radouane. Released under the MIT License.

See [`LICENSE`](./LICENSE) for the full terms.


