# PR Tasks: OAuth Callback Failure (Port/Path Mismatch) Remediation

## Context
Google OAuth login initiation works, but callback completion fails in local/dev flows.

This plan is focused on diagnosing and fixing callback routing/config mismatch without business-logic changes.

## Confirmed Root Cause (Read-Only Diagnosis)
- API runtime is configured for port `3001`:
  - `.env:5` -> `API_PORT=3001`
  - `api/src/main.ts:18` -> API listens on `API_PORT` then `PORT` fallback.
- Global API prefix is `/api`:
  - `api/src/main.ts:9` -> `app.setGlobalPrefix('api')`.
- OAuth callback route is `/api/auth/google/callback`:
  - `api/src/auth/auth.controller.ts:44` -> `@Get('google/callback')` under `@Controller('auth')`.
- Strategy uses explicit callback env value when present:
  - `api/src/auth/google.strategy.ts:26` -> `callbackURL: getGoogleCallbackUrl()`.
  - `api/src/auth/auth.utils.ts:22-33` -> `GOOGLE_CALLBACK_URL` takes precedence.
- Historical misconfigured values (resolved in current files) pointed to legacy host/route:
  - `GOOGLE_CALLBACK_URL=http://localhost:<legacy-api-port>/auth/google/callback`
  - `PORT=<legacy-api-port>` alias in host env.

### Root-Cause Statement
OAuth callback fails because runtime callback URL resolves to `http://localhost:<legacy-api-port>/auth/google/callback`, while the API actually serves callback at `http://localhost:3001/api/auth/google/callback`.

## Hard Constraints (Non-Negotiable)
- [x] No business logic changes beyond auth env/config resolution and validation.
- [x] No secret rotation unless explicitly requested.
- [x] Keep `API_PORT` as canonical API port key.
- [x] Keep callback route contract as `/api/auth/google/callback`.
- [x] Keep host and Docker workflows consistent.

## Target End State
- [x] Local host callback URI is canonical and reachable (`http://localhost:3001/api/auth/google/callback` unless explicitly reconfigured).
- [x] Docker callback URI is canonical and reachable for docker workflow.
- [ ] Google OAuth authorized redirect URI list matches runtime callback exactly.
- [x] No ambiguous legacy callback references remain in active runtime env sources.
- [x] Startup/config validation fails fast on invalid callback URL format.

## Phase 1: Reproduce + Instrument (No Edits)
- [x] Goal: Capture deterministic failure proof and active callback URI used at runtime.
- [x] Step: Start API in host dev mode.
- [x] Step: Hit `GET /api/auth/google` and capture Google redirect `redirect_uri` query value.
- [x] Step: Verify callback endpoint reachability for both:
  - expected canonical URI (`/api/auth/google/callback`)
  - currently configured legacy URI (`/auth/google/callback` on the legacy API port).
- [x] Validation commands:
```powershell
npm run dev --workspace=ecotrack-api
curl -I "http://localhost:3001/api/auth/google"
curl -I "http://localhost:3001/api/auth/google/callback"
curl -I "http://localhost:<legacy-api-port>/auth/google/callback"
```
- [x] Done-when: `redirect_uri` and failing endpoint mismatch are documented.

Observed evidence:
- `REDIRECT_URI=http://localhost:<legacy-api-port>/auth/google/callback`
- `CANONICAL_CALLBACK_HTTP_STATUS=302` (reachable callback route on API service)
- `LEGACY_CALLBACK_HTTP_STATUS=000` (legacy callback endpoint not reachable)

## Phase 2: Canonical Callback Decision
- [x] Goal: Lock one callback strategy for all workflows.
- [x] Step: Choose explicit callback policy:
  - A) Always set `GOOGLE_CALLBACK_URL` explicitly per environment, or
  - B) Derive from canonical API base + fixed callback path when explicit value is absent.
- [x] Step: Define canonical local callback URI and Docker callback URI.
- [x] Step: Define migration treatment for legacy `PORT=<legacy-api-port>` and legacy `/auth/google/callback` path.
- [x] Done-when: No ambiguity remains about callback source-of-truth.

Decision:
- Chosen strategy: **B** (derive fallback from canonical API base/path when explicit value is absent), while allowing explicit `GOOGLE_CALLBACK_URL` overrides.
- Canonical host and Docker callback URI: `http://localhost:3001/api/auth/google/callback`.
- Legacy treatment:
  - `PORT=<legacy-api-port>` is deprecated and will be neutralized for host runtime.
  - Legacy callback path `/auth/google/callback` is invalid for this API and will be removed from active env sources/docs.

## Phase 3: Env + Config Alignment
- [x] Goal: Align runtime env files and templates with canonical callback URI.
- [x] Scope (files expected):
  - `.env`, `.env.example`
  - `api/.env`, `api/.env.example`
  - `infrastructure/environments/.env.docker`, `infrastructure/environments/.env.docker.example`
- [x] Step: Replace legacy callback URI values with canonical callback URI.
- [x] Step: Ensure `API_PORT` and callback URI ports align.
- [x] Step: Remove/neutralize legacy callback references that can shadow canonical values.
- [x] Validation commands:
```powershell
rg -n "GOOGLE_CALLBACK_URL|API_PORT|PORT=" .env .env.example api/.env api/.env.example infrastructure/environments/.env.docker infrastructure/environments/.env.docker.example
```
- [x] Done-when: Active env sources agree on callback path+port.

## Phase 4: Fail-Fast Validation Guardrails
- [x] Goal: Prevent silent OAuth misconfiguration regressions.
- [x] Scope (files expected):
  - `api/src/auth/auth.utils.ts`
  - `api/src/config/validation.ts`
  - `infrastructure/scripts/validate-env.mjs`
- [x] Step: Validate callback URL format and expected path contract.
- [x] Step: Add policy check for callback/API port consistency in env validation.
- [x] Step: Ensure logs expose only safe diagnostics (keys/endpoints, no secrets).
- [x] Validation commands:
```powershell
node ./infrastructure/scripts/validate-env.mjs --workflow host-dev --files .env,app/.env.local
node ./infrastructure/scripts/validate-env.mjs --workflow docker-dev --files infrastructure/environments/.env.docker
```
- [x] Done-when: Invalid callback config fails before runtime auth flow.

## Phase 5: OAuth Route + Redirect Tests
- [x] Goal: Add automated tests covering callback URI resolution and route correctness.
- [x] Scope (files expected):
  - `api/src/tests/auth.controller.test.ts`
  - `api/src/tests/auth.service.test.ts`
  - `api/src/tests/*oauth*.test.ts` (new if needed)
- [x] Step: Test `getGoogleCallbackUrl()` precedence and fallback behavior.
- [x] Step: Test that auth initiation uses expected callback URI.
- [x] Step: Test callback route path includes `/api/auth/google/callback` under global prefix.
- [x] Validation commands:
```powershell
npm run test --workspace=ecotrack-api
```
- [x] Done-when: OAuth callback behavior is covered by tests.

## Phase 6: Docs + Google Console Runbook
- [x] Goal: Eliminate operator error during OAuth setup.
- [x] Scope (files expected):
  - `README.md`
  - `docs/ENV.md`
  - `docs/ENVIRONMENT_SETUP.md`
  - `docs/API_DOCUMENTATION.md`
- [x] Step: Document exact callback URI(s) per workflow.
- [x] Step: Document that Google Console Authorized redirect URI must exactly match runtime callback URI (scheme + host + port + path).
- [x] Step: Remove outdated examples that omit `/api` or use the legacy non-canonical path.
- [x] Validation commands:
```powershell
rg -n "legacy|/auth/google/callback|/api/auth/google/callback|GOOGLE_CALLBACK_URL" README.md docs
```
- [x] Done-when: Docs and runtime behavior match exactly.

## Phase 7: End-to-End Verification
- [ ] Goal: Confirm OAuth login round-trip works after alignment.
- [ ] Step: Verify host dev OAuth flow in browser.
- [ ] Step: Verify Docker dev OAuth flow if used.
- [ ] Step: Confirm callback request reaches API and redirects back to frontend with auth cookie set.
- [x] Step: Force-rebuild Docker stack and verify live `redirect_uri` from `GET /api/auth/google`.
- [x] Validation commands:
```powershell
npm run dev
npm run infra:up
```
- [ ] Done-when: OAuth callback succeeds without manual URL hacks.

Execution notes:
- Host runtime probe confirms redirect URI now resolves to `http://localhost:3001/api/auth/google/callback`.
- Recheck on February 11, 2026: while Docker services were healthy, runtime still emitted legacy `redirect_uri=http://localhost:<legacy-api-port>/auth/google/callback`.
- Root cause for persisted issue: stale Docker runtime/image state (services restarted without a clean recreate using current code/env).
- Applied operational fix: `npm run infra:down` then `npm run infra:up` (with rebuild/recreate).
- Post-fix probe:
  - `curl -D - http://localhost:3001/api/auth/google` now returns `redirect_uri=http://localhost:3001/api/auth/google/callback`.
  - `http://localhost:<legacy-api-port>/auth/google/callback` remains unreachable (expected for legacy path).
- Browser-interactive OAuth callback/cookie verification still requires manual run against the Google auth screen.

## Definition of Done
- [x] Runtime callback URI matches actual API host/port/path.
- [ ] Google Console redirect URI list matches runtime callback URI.
- [x] No active runtime file references legacy `http://localhost:<legacy-api-port>/auth/google/callback`.
- [x] Env validation rejects misaligned callback/port/path configurations.
- [x] API tests cover callback URL resolution.
- [x] Docs provide one unambiguous OAuth setup path.
