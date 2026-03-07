# PR Tasks - Deployment Platform Rollout

Last updated: 2026-03-07

## Related Planning Docs

- `docs/runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md`
- `docs/ENV.md`
- `docs/ENVIRONMENT_SETUP.md`
- `docs/ARCHITECTURE_OVERVIEW.md`
- `docs/DB_SCHEMA_NAMESPACE_STATUS.md` for the preserved status of the previous DB namespace rollout checklist

## Current Readiness Status

Current repo status: `PHASES 1 TO 9 COMPLETE, PHASE 10 DEFERRED`

Completed in this documentation pass:

- the target deployment stack is now documented as Cloudflare Pages for the frontend, Render for the monolith backend, and Neon for managed Postgres
- the GitHub Pages app retirement path is now documented
- future GitHub Pages reuse is now explicitly limited to docs-only follow-up work
- future PostGIS enablement is now explicitly deferred and scoped as a separate phase
- the deployment rollout plan is now linked from the docs index
- the live GitHub Pages app site has been unpublished
- `.github/workflows/CD.yml` no longer deploys the app to GitHub Pages
- the `github-pages` environment is no longer part of the app release path
- repo deployment notes no longer describe GitHub Pages as an app target
- Neon is now provisioned as the managed deployment database baseline in `aws-eu-central-1` (Frankfurt)
- the canonical `ticketdb` managed database is created on the single baseline branch
- the repo Drizzle migration chain and existing seed strategy have been validated against Neon
- local API readiness has been validated against the direct Neon connection string
- Cloudflare Pages now serves the frontend at `https://ecotrack-jmj.pages.dev`
- the deployed Pages build uses the repo-root `npm run build:app` contract and publishes `app/dist`
- deployed route refreshes for `/`, `/login`, and `/app/dashboard` return HTML successfully
- the deployed frontend bundle now contains the Render API origin `https://ecotrack-3ggh.onrender.com`
- the deployed Google OAuth start flow now issues a callback URL on the Render origin
- the Render API now returns CORS headers for `https://ecotrack-jmj.pages.dev`
- deployed CORS preflight for the Pages origin now succeeds with credentials enabled
- a non-`main` Cloudflare Pages preview deployment has been smoke-tested successfully at `https://chore-docs-pages-cleanup.ecotrack-jmj.pages.dev`
- GitHub Pages now serves docs only at `https://oussamaredd.github.io/EcoTrack/`
- docs-only publishing is handled by `.github/workflows/docs-pages.yml` using `docs/` as the site source
- the stale Cloudflare Worker GitHub integration has been disconnected, and new `main` pushes no longer emit `Workers Builds: ecotrack`

Still not done:

- future PostGIS work remains intentionally deferred

## Task 0 - Planning Baseline And Documentation

Description:

This task covers the planning work completed in this pass. It records the target stack, the rollout order, and the later follow-up boundaries so implementation can proceed without revisiting the hosting decision.

- [x] Define the target hosting split for frontend, backend, and database.
- [x] Exclude Cloudflare Workers from the current runtime plan.
- [x] Record GitHub Pages as docs-only follow-up work instead of live app hosting.
- [x] Record PostGIS as a later scoped database change rather than part of the first rollout.
- [x] Add a dedicated deployment rollout plan markdown file under `docs/runbooks/`.
- [x] Ensure the docs index points to the rollout plan and to this active PR task file.

## Task 1 - Freeze Deployment Ownership

Description:

This task confirms one canonical host per layer before any platform setup starts. The implementation team should not proceed while frontend or backend ownership is still ambiguous.

- [x] Decide that the live frontend host will be Cloudflare Pages.
- [x] Decide that the monolith backend host will be Render.
- [x] Decide that the deployment database host will be Neon.
- [x] Decide that GitHub Pages will not remain the live app host.
- [ ] Record final team sign-off on the deployment ownership split if formal approval is required.

## Task 2 - Retire GitHub Pages As The App Host

Description:

This task removes GitHub Pages from the main app release path while keeping future docs-only hosting possible.

- [x] Unpublish the current GitHub Pages app site if it is still active.
- [x] Disable or replace the app-facing GitHub Pages release path in `.github/workflows/CD.yml`.
- [x] Remove the main app dependency on the `github-pages` environment.
- [x] Confirm no active frontend links, OAuth entries, or deployment notes still point at GitHub Pages for the app.
- [x] Preserve GitHub Pages only as a later docs-hosting option.

## Task 3 - Provision Neon Managed Postgres

Description:

This task creates the deployment-ready managed Postgres baseline without changing the local Docker development database role.

- [x] Create the Neon project for EcoTrack.
- [x] Create the managed deployment database using the canonical `ticketdb` naming.
- [x] Store the managed `DATABASE_URL` outside the repository.
- [x] Define the migration policy for deployed environments.
- [x] Define whether demo data uses seed scripts or a one-time import.
- [x] Document that local Docker Postgres is a dev sandbox and not a live-synced peer of Neon.

## Task 4 - Provision Render For The Monolith Backend

Description:

This task prepares the existing Nest runtime to run as one web service with a predictable health check and managed database connection.

- [x] Create the Render web service for EcoTrack.
- [x] Choose the monorepo deployment method for the backend service.
- [x] Resolve the backend service port contract for Render.
- [x] Configure the Render health check to use `/api/health/ready`.
- [x] Configure backend deployment secrets and public runtime env values.
- [x] Define how migrations will be executed as part of deployment.

Validated implementation notes:

- Render web service `ecotrack-3ggh` is live at `https://ecotrack-3ggh.onrender.com`.
- The backend uses the repo-root monorepo build command `npm ci --include=dev && npm run build:database && npm run build:api`.
- The API start command is `npm run start --workspace=ecotrack-api`.
- The Render runtime binds through `API_PORT=10000`.
- The readiness health check path is `/api/health/ready`.
- On the Render free plan, database migrations are a manual release step: run `npm run db:migrate --workspace=ecotrack-database` against the direct Neon `DATABASE_URL` before deploys that include schema changes.
- Baseline backend deployment env values are configured on Render; final frontend/public-origin alignment remains Task 6.

## Task 5 - Provision Cloudflare Pages For The Frontend

Description:

This task moves the frontend SPA to Cloudflare Pages and removes the old GitHub Pages app-hosting assumption.

- [x] Create the Cloudflare Pages project.
- [x] Confirm the project is configured as Pages and not Workers.
- [x] Configure the frontend-only build command.
- [x] Configure the output directory as `app/dist`.
- [x] Align `VITE_BASE` behavior for Cloudflare-hosted deployment.
- [x] Configure preview deployments for branch or pull-request review where needed.

Validated implementation notes:

- Cloudflare Pages project `ecotrack` is live at `https://ecotrack-jmj.pages.dev`.
- The Pages project is Git-connected and builds from the repo root using `npm run build:app`.
- The published output directory is `app/dist`.
- Deployed route refreshes for `/`, `/login`, and `/app/dashboard` return HTML successfully.
- Preview deployment behavior is provided by the Pages Git integration and was smoke-tested successfully at `https://chore-docs-pages-cleanup.ecotrack-jmj.pages.dev`.

## Task 6 - Align Public Origins, OAuth, And CORS

Description:

This task stabilizes the public URL contract after the platform targets exist. It should be completed before the final cutover.

- [x] Finalize the frontend public origin.
- [x] Finalize the backend public origin.
- [x] Set the deployed `VITE_API_BASE_URL`.
- [x] Set `API_BASE_URL`, `APP_URL` or `APP_BASE_URL`, `CORS_ORIGINS`, and `GOOGLE_CALLBACK_URL` for the deployed backend runtime.
- [x] Confirm no deployment env still references localhost or GitHub Pages for the live app.

Validated implementation notes:

- Frontend public origin currently resolves at `https://ecotrack-jmj.pages.dev`.
- Backend public origin currently resolves at `https://ecotrack-3ggh.onrender.com`.
- The deployed frontend bundle contains the Render origin, confirming deployed `VITE_API_BASE_URL`.
- `GET /api/auth/google` on the Render service now redirects to Google with callback URI `https://ecotrack-3ggh.onrender.com/api/auth/google/callback`.
- Requests sent with `Origin: https://ecotrack-jmj.pages.dev` now receive `Access-Control-Allow-Origin: https://ecotrack-jmj.pages.dev`.
- Deployed CORS preflight requests now return the Pages origin, allowed methods, and `Access-Control-Allow-Credentials: true`.

## Task 7 - Define Release Order, Migration Discipline, And Rollback

Description:

This task makes the deployment repeatable and reduces the risk of a first-release failure caused by unmanaged database changes.

- [x] Define the release order across Neon, Render, and Cloudflare Pages.
- [x] Decide whether migrations are automatic or explicitly triggered during release.
- [x] Decide where seed data is allowed.
- [x] Define rollback expectations after a failed deploy.
- [x] Document the first-release bootstrap process for the managed database.

Documented release discipline:

- Release order: Neon direct connection validation -> `npm run db:migrate --workspace=ecotrack-database` -> optional `npm run db:seed --workspace=ecotrack-database` -> Render deploy/update -> Cloudflare Pages deploy/promote -> deployed smoke checks.
- Migrations remain an explicit manual release step on the current Render free plan.
- Seed data is allowed only for local development and deliberate non-production demo resets.
- Rollback is not automatic after a failed migration. Prefer a forward fix and redeploy, and use Neon restore/backup recovery before reopening traffic if schema or data reversal is required.
- The first-release bootstrap path uses the tracked migration chain against the direct Neon URL before the first hosted API deploy.

## Task 8 - Execute Cutover Validation

Description:

This task verifies that the deployed stack behaves correctly after the hosting move.

- [x] Validate backend readiness on the deployed URL.
- [x] Validate frontend-to-backend API communication.
- [x] Validate local auth login and protected-route behavior.
- [x] Validate Google OAuth callback behavior on deployed origins.
- [x] Validate one critical citizen flow, one critical agent flow, and one critical manager flow.
- [x] Validate realtime transport behavior and fallback after deployment.

Current validation notes:

- `GET https://ecotrack-3ggh.onrender.com/api/health/ready` returns HTTP `200` with expected schema checks.
- `GET https://ecotrack-jmj.pages.dev/`, `/login`, and `/app/dashboard` all return HTML.
- Browser API communication from the Pages origin is now allowed by the live Render CORS policy.
- Seeded-user local authentication succeeds on the deployed stack.
- Seeded `citizen`, `agent`, and `manager` demo users each authenticate successfully against the deployed API and can reach role-scoped read endpoints.
- Manager realtime support endpoints (`GET /api/planning/realtime/health`, `POST /api/planning/ws-session`, `POST /api/planning/stream/session`) respond successfully on the deployed stack.
- Google OAuth browser sign-in now succeeds on the deployed stack, confirming that the deployed callback URI is authorized in the Google OAuth client.
- Manual browser validation confirms that the critical citizen, agent, and manager flows are working on the deployed stack.
- Manual browser validation confirms that realtime transport behavior and fallback are working on the deployed stack.

## Task 9 - Docs-Only GitHub Pages Follow-Up

Description:

This task is now implemented as a docs-only publishing stream. It keeps GitHub Pages available for documentation without reintroducing app-hosting ambiguity.

- [x] Decide whether GitHub Pages will be re-enabled for docs.
- [x] Define the docs source and output path.
- [x] Define the docs-only publish workflow.
- [x] Define the docs URL strategy separate from the app.

Implemented docs-only publishing notes:

- GitHub Pages docs site is enabled at `https://oussamaredd.github.io/EcoTrack/`.
- The site source is `docs/`, with `docs/_config.yml` configuring the GitHub Pages Jekyll build.
- `.github/workflows/docs-pages.yml` handles docs-only publishing through the `github-pages` environment.
- The app stays on Cloudflare Pages at `https://ecotrack-jmj.pages.dev`, so app and docs URLs remain operationally separated.

## Task 10 - Future PostGIS Enablement

Description:

This task is intentionally deferred until Development and Data scope require it. It remains listed here so the team does not accidentally absorb PostGIS into the first deployment pass.

- [x] Document that PostGIS is out of scope for the first deployment pass.
- [ ] Open a future implementation task for PostGIS readiness when data-scope work requires it.
- [ ] Confirm the approved geospatial use cases before enabling the extension.
- [ ] Treat PostGIS enablement as a reviewed database migration change.

## PR Exit Criteria For This Planning Pass

- [x] The deployment target stack is documented.
- [x] The rollout is organized into phases with detailed descriptions.
- [x] The docs include a dedicated markdown plan for the rollout.
- [x] `docs/PR_TASKS.md` reflects completed planning work versus open implementation work.
- [x] The docs index includes the new rollout plan and the active PR task tracker.
- [x] Platform configuration has been implemented for the Phase 3 Neon baseline.
- [x] GitHub Pages has been retired as the app host.
- [x] Cloudflare Pages and Render have been provisioned and validated.
