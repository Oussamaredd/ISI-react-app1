# Deployment Platform Rollout Plan

Last updated: 2026-03-26

## Scope

This plan defines the target deployment model for the EcoTrack modular monolith during the current Development-focused phase.

The target hosting split is:

- Cloudflare Pages for the frontend SPA in `app`
- Render Web Service for the single Node/Nest runtime in `api`
- Neon managed Postgres for the deployment database

Out of scope for the first rollout:

- Cloudflare Workers as an application runtime
- GitHub Pages as a live app host
- PostGIS activation in the first deployment pass
- Data-specialty infrastructure beyond the minimum future-ready hooks

## Delivery Intent

The goal is to move EcoTrack toward one clear deployment story for the app while preserving the modular-monolith architecture already described in the repository.

This rollout is intentionally split into phases so the team can:

- stop the current hosting ambiguity between GitHub Pages and Cloudflare-hosted options
- deploy the frontend on a static host that fits the Vite SPA
- keep the backend on a standard web-service platform that fits the current Nest runtime
- move the deployment database to managed Postgres without introducing an unnecessary platform rewrite
- keep room for later documentation hosting and later geospatial enablement without mixing that into the first cutover

## Phase 1 - Deployment Ownership Freeze

Description:

This phase establishes the canonical deployment ownership for each runtime surface before any platform changes are made. EcoTrack already has a modular monolith with one backend runtime, one database contract, and one frontend SPA. The first job is to remove ambiguity and define one host per layer.

Decisions captured in this phase:

- the main app frontend will be hosted on Cloudflare Pages
- the monolith backend will be hosted on Render as one web service
- the deployment database will be hosted on Neon as managed Postgres
- GitHub Pages will no longer be used for the main app frontend
- GitHub Pages may later be reused for docs only
- Cloudflare Workers are not part of the current app runtime plan

Why this phase comes first:

- OAuth, CORS, and public-origin settings cannot be stabilized until the deployment owners are fixed
- provider setup work becomes noisy and error-prone if the team is still deciding between multiple frontend hosts
- the current roadmap favors a single deployable monolith, not a split edge-runtime rewrite

Checklist:

- [x] Define one canonical frontend host for the live app.
- [x] Define one canonical backend host for the monolith runtime.
- [x] Define one canonical managed database for deployment environments.
- [x] Exclude Cloudflare Workers from the current runtime scope.
- [x] Reserve GitHub Pages for future docs-only use.

## Phase 2 - GitHub Pages Retirement for the App

Description:

This phase removes GitHub Pages from the main app deployment path. The repo currently contains a GitHub Pages deployment workflow, but the target platform for the app frontend is now Cloudflare Pages. Keeping both live app hosts would create duplicate URLs, duplicate release paths, and confusing callback/CORS behavior.

The main intent is not to destroy GitHub Pages permanently. The intent is to retire it as the app host while keeping the repository cleanly reusable for docs later.

Work included in this phase:

- disable or remove the app-facing GitHub Pages deployment path
- unpublish the existing app site if it is still active
- stop treating the `github-pages` environment as the main release target
- keep a later path open for docs-only publishing

Completion definition:

- there is no active GitHub Pages deployment serving the EcoTrack app
- the repo no longer treats GitHub Pages as the app production target
- any future GitHub Pages use is clearly documented as docs-only

Checklist:

- [x] Unpublish the current GitHub Pages app site.
- [x] Disable or replace the app-facing GitHub Pages workflow in `.github/workflows/CD.yml`.
- [x] Remove the app release dependency on the `github-pages` environment.
- [x] Record that GitHub Pages is reserved for docs-only follow-up work.
- [x] Confirm no app OAuth or frontend links still point to GitHub Pages.

## Phase 3 - Neon Managed Postgres Baseline

Description:

This phase creates the managed deployment database baseline. EcoTrack already uses Postgres and Drizzle with a canonical `DATABASE_URL`, plus explicit migration and seed scripts. That makes Neon a straightforward fit because the deployment change is operational, not architectural.

The local Docker Postgres container remains useful after this phase, but only as a development sandbox. It should not be treated as a peer deployment database and should not be continuously synchronized with the hosted database.

The intended database discipline is:

- local container for local development
- managed Neon database for deployed environments
- migrations for schema alignment
- optional seed or one-time import for demo data
- no live bidirectional sync between local Docker and Neon

Environment strategy for this phase:

- start with one deployment-ready Neon project for the app
- keep the canonical database name aligned with `ticketdb`
- use branches or separate project boundaries for future environment separation
- store the Neon connection string only in provider secrets and deployment envs
- implemented baseline:
  - Neon project `ecotrack` in `aws-eu-central-1` (Frankfurt)
  - one baseline branch: `main`
  - canonical managed database: `ticketdb`
  - repo Drizzle migrations and seed flow applied against the direct Neon connection string
  - local API readiness verified against the managed database baseline
  - see `docs/runbooks/NEON_MANAGED_POSTGRES_BASELINE.md` for the exact validated state

Checklist:

- [x] Create the Neon project for EcoTrack.
- [x] Create the deployment database with the canonical `ticketdb` naming.
- [x] Capture the managed `DATABASE_URL` outside the repository.
- [x] Define migration policy for deployment environments.
- [x] Define whether demo data uses seed scripts or a one-time import.
- [x] Document that local Docker Postgres is not continuously synced with Neon.

## Phase 4 - Render Web Service Baseline

Description:

This phase prepares the EcoTrack monolith backend for a standard Node web-service host. The current backend is a Nest runtime with health/readiness endpoints, auth flows, realtime transport, and a standard build/start contract. That fits a conventional web service much better than a Cloudflare Worker runtime.

This phase should keep the service model simple:

- one Render Web Service for the monolith runtime
- one deployment pipeline for API build and release
- one health check target
- one managed database connection

The main design constraints to resolve here are:

- how the monorepo is built on Render
- how migrations are executed on deployment
- how the service port contract is aligned with the Render runtime
- how secrets and public origin values are injected safely

Completion definition:

- Render can build and run the EcoTrack API reliably
- health checks use the canonical readiness path
- the service can connect to Neon and pass startup validation
- implemented baseline:
  - Render web service `ecotrack-3ggh` is live at `https://ecotrack-3ggh.onrender.com`
  - monorepo build runs from the repo root with `npm run deploy:render:build`
  - runtime start command is `npm run deploy:render:start`
  - Render port contract is aligned with `API_PORT=10000`
  - readiness health check uses `/api/health/ready`
  - baseline backend deployment env values are configured on Render; final frontend/public-origin alignment remains Phase 6 work
  - because the service is on the Render free plan, migrations run manually via `npm run db:migrate --workspace=ecotrack-database` against the direct Neon connection string before deploys that include schema changes
  - `npm ci --omit=dev` is not a supported Render build command for this repo; the canonical build path uses repo-root `npm ci --include=dev`, validates the workspace toolchain, compiles `database` and `api`, and validates that every API production dependency still resolves from `api/dist/main.js`
  - local Windows verification should use `npm run deploy:render:verify-local` instead of the full Render build command if `npm ci` is blocked by file-locking or antivirus on native modules under `node_modules`
  - local recovery uses one repo-root install contract only: stop active Node/Vite/Expo processes, rerun `npm ci --include=dev`, run `npm run validate:workspace-toolchain`, then rerun Render verification; do not use workspace-local `--prefix` installs

Checklist:

- [x] Create the Render web service.
- [x] Choose the deployment method for the monorepo build.
- [x] Resolve the backend port contract for Render.
- [x] Configure the readiness health check path.
- [x] Configure deployment secrets and public runtime env values.
- [x] Define how migrations run on each deployment.

## Phase 5 - Cloudflare Pages Frontend Baseline

Description:

This phase moves the frontend SPA onto Cloudflare Pages. EcoTrack's frontend is already a Vite application that outputs static assets, so it is a good fit for Pages. The important rule is that this must be configured as a Pages project, not as a Worker project.

The main work here is operational:

- point Cloudflare Pages at the repository
- use a frontend-only build command
- publish the `app/dist` output
- align the frontend base-path strategy with Cloudflare instead of GitHub Pages

This phase should also prepare preview environments so branch work can be reviewed without mixing preview URLs into production env settings.

Completion definition:

- production frontend builds come from Cloudflare Pages
- branch previews are available where appropriate
- the frontend build no longer assumes a GitHub Pages repository subpath
- implemented baseline:
  - Cloudflare Pages project `ecotrack` is live at `https://ecotrack-jmj.pages.dev`
  - the Git-connected Pages project builds from the repo root using `npm run build:app`
  - the deployed artifact publishes the `app/dist` output
  - deployed route refreshes for `/`, `/login`, and `/app/dashboard` return HTML successfully
  - preview deployment behavior is enabled through the Pages Git integration and was smoke-tested successfully at `https://chore-docs-pages-cleanup.ecotrack-jmj.pages.dev`

Checklist:

- [x] Create the Cloudflare Pages project.
- [x] Confirm the project is Pages and not Workers.
- [x] Configure the frontend-only build command.
- [x] Configure the output directory as `app/dist`.
- [x] Align `VITE_BASE` behavior for Cloudflare-hosted deployment.
- [x] Enable preview deployment behavior for branches or pull requests.

## Phase 6 - Public Origin, OAuth, and CORS Alignment

Description:

This phase aligns the deployed public URL contract across the frontend, backend, and auth flows. It is the phase that prevents the most common deployment regressions: wrong callback URLs, mismatched origins, localhost leakage, and failed browser auth or API calls.

The target result is one consistent production-style public contract:

- frontend public origin served from Cloudflare Pages or a mapped custom domain
- backend public origin served from Render or a mapped custom domain
- backend-generated callback URLs aligned with the public frontend edge
- browser-facing API configuration aligned with the deployed frontend
- CORS allowlist restricted to the intended frontend origin set

This phase must be handled carefully because the repo already enforces canonical env rules and public/private separation.

Current validated state (2026-03-07):

- frontend public origin currently resolves at `https://ecotrack-jmj.pages.dev`
- backend public origin currently resolves at `https://ecotrack-3ggh.onrender.com`
- the deployed frontend bundle contains the Render origin, confirming deployed `VITE_API_BASE_URL` injection
- `GET /api/auth/google` on Render redirects to Google with callback URI `https://ecotrack-3ggh.onrender.com/api/auth/google/callback`
- requests sent with `Origin: https://ecotrack-jmj.pages.dev` now receive `Access-Control-Allow-Origin: https://ecotrack-jmj.pages.dev`
- the deployed CORS preflight for `OPTIONS /api/auth/status` returns HTTP `204` with the Pages origin, allowed methods, and `Access-Control-Allow-Credentials: true`
- the deployed Pages bundle does not contain GitHub Pages host references and currently resolves its API base to the Render origin

Checklist:

- [x] Finalize the frontend public origin.
- [x] Finalize the backend public origin.
- [x] Set `VITE_API_BASE_URL` for the deployed frontend.
- [x] Set `API_BASE_URL`, `APP_URL` or `APP_BASE_URL`, and `CORS_ORIGINS` for the backend.
- [x] Update `GOOGLE_CALLBACK_URL` to match the deployed callback contract.
- [x] Confirm no deployment env still points to localhost or GitHub Pages.

## Phase 7 - Database Migration, Seed, and Release Flow

Description:

This phase defines the release discipline for the first deployed environment. The main objective is to make database state predictable during the rollout.

The release flow should be:

1. deploy or prepare Neon
2. apply migrations
3. optionally seed demo data
4. start or update the Render service
5. deploy or promote the Cloudflare Pages frontend
6. run end-to-end smoke checks

The seed strategy must remain intentional. Demo data can be useful for a student project, but it should be explicit and environment-aware, never accidental.

Completion definition:

- database migrations are part of the release process
- seed usage is documented and controlled
- the release order is written down and repeatable

Implemented release discipline:

- release order:
  1. run `.github/workflows/CD.yml` (`CD Deployment`) against the intended target environment
  2. let the workflow execute repo-owned pre-deploy validation (`validate-env`, lint, typecheck, tests, Render verification, frontend production build)
  3. optionally run `npm run db:migrate --workspace=ecotrack-database` from the workflow when `run_migrations=true`
  4. trigger the backend and frontend deploy hooks owned by the target GitHub Environment
  5. run hosted smoke checks on frontend HTML, API readiness, optional OAuth redirect, and optional release-version assertions
  6. review the uploaded release artifacts and GitHub step summary before closing the release
- migrations stay explicit and operator-controlled even though the workflow can execute them
- seed data is allowed only for local development and deliberate non-production demo resets; it is not part of the production release path
- rollback after a failed deploy is not automatic: re-run `CD Deployment` from the previous known-good git ref and the same target environment, prefer a forward fix where possible, and use Neon restore/backup recovery before reopening traffic if schema or data reversal is required
- first-release bootstrap path uses the tracked Drizzle migration chain against the direct Neon URL before the first hosted API deploy, with seed data remaining optional and non-production only

GitHub Actions automation baseline (2026-03-26):

- `push` to `main` now deploys the `development` environment automatically after the validation gate passes.
- `workflow_dispatch` promotes `development`, `staging`, or `production` and supports `run_migrations` plus `skip_hosted_smoke` inputs.
- GitHub Environments `deploy-dev`, `deploy-staging`, and `deploy-prod` own the deploy-hook URLs, smoke target URLs, approval rules, and target-specific secrets.
- Every release run writes a release manifest plus deploy-hook and smoke evidence under `tmp/ci/release`, uploads the files as GitHub artifacts, and publishes the markdown summaries in the workflow run.

GitHub Environment contract:

- Required vars:
  - `CD_DEPLOY_APP_URL`
  - `CD_DEPLOY_API_HEALTH_URL`
- Optional vars:
  - `CD_DEPLOY_FRONTEND_HEALTH_URL`
  - `CD_DEPLOY_OAUTH_ENTRY_URL`
  - `CD_DEPLOY_EXPECTED_OAUTH_CALLBACK_URL`
  - `CD_DEPLOY_EXPECTED_API_BASE_URL`
  - `CD_DEPLOY_EXPECTED_API_RELEASE_VERSION`
  - `CD_DEPLOY_EXPECTED_FRONTEND_RELEASE_VERSION`
  - `CD_FRONTEND_DEPLOY_HOOK_METHOD`
  - `CD_BACKEND_DEPLOY_HOOK_METHOD`
  - `CD_RELEASE_SMOKE_TIMEOUT_MS`
  - `CD_RELEASE_SMOKE_INTERVAL_MS`
- Required secrets when migrations are enabled:
  - `DATABASE_URL`
- Optional secrets for provider-triggered deployment:
  - `CD_FRONTEND_DEPLOY_HOOK_URL`
  - `CD_BACKEND_DEPLOY_HOOK_URL`

Hosted smoke coverage:

- required checks:
  - frontend root URL returns HTML
  - API readiness URL returns HTTP `200`
  - API readiness payload includes `release.version`
- optional checks when configured:
  - frontend health endpoint returns HTTP `200`
  - OAuth entry redirects to the expected callback URL
  - frontend HTML exposes the expected `ecotrack-api-base-url` meta tag
  - frontend HTML exposes the expected `ecotrack-release-version` meta tag

Checklist:

- [x] Define the deployment release order across database, backend, and frontend.
- [x] Decide whether migrations run automatically or as an explicit release step.
- [x] Decide where seed data is allowed.
- [x] Confirm how rollback will be handled if a deploy fails after migration.
- [x] Document the first-release bootstrap path for the managed database.

## Phase 8 - Cutover Validation and Operational Checks

Description:

This phase validates that the deployed stack behaves like the local architecture contract expects. It focuses on the flows that are most likely to break during a hosting cutover: auth, health checks, API routing, realtime transport, and the main role-based journeys.

The goal is not exhaustive QA. The goal is to confirm that the first deployed environment is operational and that the public-origin contract is correct.

Current validation snapshot (2026-03-07):

- `GET https://ecotrack-3ggh.onrender.com/api/health/ready` returned HTTP `200` with the expected schema checks in the response body
- `GET https://ecotrack-jmj.pages.dev/`, `/login`, and `/app/dashboard` each returned HTTP `200` and HTML content
- the deployed frontend bundle contains the Render origin, confirming that the Pages build picked up the deployed API base
- direct API requests and CORS preflights sent with `Origin: https://ecotrack-jmj.pages.dev` now return the expected allow-origin and credential headers, so browser API communication from Pages is validated at the transport layer
- local seeded-user authentication works on the deployed stack
- seeded `citizen`, `agent`, and `manager` demo users can each log in against the deployed API and reach their role-scoped read endpoints (`/api/citizen/profile`, `/api/tours/agent/me`, `/api/planning/dashboard`)
- manager realtime support endpoints respond on the deployed API: `GET /api/planning/realtime/health`, `POST /api/planning/ws-session`, and `POST /api/planning/stream/session`
- Google OAuth browser sign-in now succeeds on the deployed stack, confirming that the Google OAuth client now authorizes the deployed callback URI `https://ecotrack-3ggh.onrender.com/api/auth/google/callback`
- manual browser validation confirms that the critical citizen, agent, and manager flows are working on the deployed stack
- manual browser validation confirms that realtime connectivity and fallback behavior are working on the deployed stack

Minimum validation areas:

- API readiness and health
- login and session behavior
- Google OAuth callback path
- role-protected app navigation
- critical manager, citizen, and agent workflows
- realtime connectivity and fallback behavior

Post-release operational checks:

- review the uploaded release manifest, deploy-hook evidence, and hosted smoke artifact in the GitHub Actions run
- confirm the deployed API still exposes `GET /api/metrics`
- confirm Prometheus/Grafana or the managed equivalent is scraping the new release and alert rules stay green
- confirm the centralized log sink is receiving current-release API logs and that `traceId` search is still working

Checklist:

- [x] Validate backend readiness on the deployed URL.
- [x] Validate frontend-to-backend API communication.
- [x] Validate local auth login and protected-route behavior.
- [x] Validate Google OAuth callback behavior on deployed origins.
- [x] Validate at least one critical citizen, agent, and manager flow.
- [x] Validate realtime behavior and fallback after deployment.

## Phase 9 - GitHub Pages Docs Follow-Up

Description:

This phase is now implemented as a docs-only publishing stream. GitHub Pages has been re-enabled for documentation without reintroducing app-hosting ambiguity.

This phase must not reuse the app deployment path. The docs site should have its own source, workflow, and domain strategy.

Completion definition:

- GitHub Pages, if re-enabled, serves docs only
- the docs site has an independent publishing workflow
- app and docs hosting are operationally separated

Implemented docs-only state (2026-03-07):

- GitHub Pages now serves docs only at `https://oussamaredd.github.io/EcoTrack/`
- the site source is `docs/`
- `.github/workflows/docs-pages.yml` owns docs-only publishing through the `github-pages` environment
- app hosting remains on Cloudflare Pages at `https://ecotrack-jmj.pages.dev`

Checklist:

- [x] Decide whether GitHub Pages will host docs in a later phase.
- [x] Define the docs source and build path.
- [x] Define the docs-only publishing workflow.
- [x] Define the docs URL strategy separate from the app.

## Phase 10 - Future PostGIS Activation

Description:

This phase is intentionally deferred until Development and Data scope require real geospatial features beyond the current baseline. The current rollout should stay on plain Postgres so the team can complete the main deployment path without mixing in geospatial extension work prematurely.

When this phase begins later, it should be treated as a normal database change with migration review, query review, index review, and environment validation. It should not be treated as a casual toggle.

Expected future work in that later phase:

- confirm which geospatial use cases require PostGIS
- confirm Neon extension support for the target environment
- add the extension through migration or controlled database setup
- add geometry columns and indexes only where the approved data scope requires them
- validate storage, performance, and backup implications

Checklist:

- [x] Keep PostGIS out of the first deployment pass.
- [ ] Open a future task for PostGIS readiness once data-scope work requires it.
- [ ] Define the first approved PostGIS use cases before adding the extension.
- [ ] Treat PostGIS enablement as a reviewed database migration change.

## Completion Rule

The deployment rollout should be considered complete only when:

- GitHub Pages no longer serves the EcoTrack app
- Cloudflare Pages serves the frontend
- Render serves the monolith backend
- Neon serves the deployment database
- deployed env values follow the canonical repository rules
- auth, API, and realtime validation pass after cutover
- future docs-only hosting and future PostGIS work remain documented as separate follow-up phases

Current status:

- rollout execution is complete for the implemented deployment and docs follow-up scope
- Phases 1 through 9 are complete
- Phase 10 remains intentionally deferred follow-up work
