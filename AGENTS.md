# AGENTS.md

## Mission & Scope
Use this file as the first source of truth for AI-agent behavior in `EcoTrack`. Work monorepo-first across `app`, `mobile`, `api`, `database`, `infrastructure`, and `docs`. Preserve the five-layer architecture contract. Use `docs/ARCHITECTURE_OVERVIEW.md` and `docs/ENV.md` for deeper detail.

## Temporary Specialty Scope Freeze (Development Only)
- Until explicitly lifted, project implementation scope is `Development` specialty only.
- Do not plan or implement `Cyber-Security` or `Data Science` specialty tracks.
- If a requested feature depends on Security/Data deliverables, document it as a dependency/handoff item and continue with Dev-owned work only.
- Keep interfaces ready for future Security/Data integration, but do not add specialty-specific pipelines, controls, or models in this phase.

## Repo Map
- `app`: frontend UI, routing, state, and API consumption only.
- `mobile`: React Native / Expo mobile UI, native navigation, device-capability adapters, and API consumption only.
- `api`: NestJS controllers, services, guards, repositories, and modules.
- `database`: Drizzle schema, migrations, client factory, and seed lifecycle.
- `infrastructure`: Docker/CI/CD scripts and environment orchestration.
- `docs`: canonical product, architecture, env, and runbook docs.

## Coding Style
- Keep existing repository naming conventions.
- Use `camelCase` for functions and variables.
- Use `PascalCase` for types, interfaces, classes, and React components.
- Use `UPPER_SNAKE_CASE` for true constants.
- Do not introduce `snake_case` naming in TypeScript/JavaScript unless matching an external payload contract.

## Hard Architecture Rules
- Enforce dependency direction: `app` must not import runtime code from `mobile`, `api`, `database`, or `infrastructure`.
- Enforce dependency direction: `mobile` must not import runtime code from `app`, `api`, `database`, or `infrastructure`.
- Allow `api` to depend on `database`; never allow `database` to depend on `api`.
- Keep data flow explicit: `controller -> service -> repository -> database`.
- Keep mobile/browser client flow explicit: `screen -> client/service -> API`.
- Do not place SQL/Drizzle query execution in controllers or services.

## Environment Safety Rules
- Treat canonical keys as standards: `DATABASE_URL`, `API_PORT`, `VITE_API_BASE_URL`, `EXPO_PUBLIC_API_BASE_URL`.
- Keep frontend env files (`app/.env.local`, `app/.env.example`, mode env files) `VITE_*` only.
- Keep mobile env files (`mobile/.env.local`, `mobile/.env.example`, mode env files) `EXPO_PUBLIC_*` only.
- Never place backend/database/infrastructure secrets in frontend or mobile env files.
- Follow canonical env sources by workflow:
  - host dev: `/.env`, `app/.env.local`, and `mobile/.env.local`
  - docker dev: `infrastructure/environments/.env.docker`
  - deploy: secret-manager injection with committed templates only

## Change Execution Workflow
1. Identify scope and affected layers.
2. Inspect related files and current conventions before editing.
3. Implement the smallest safe change set.
4. Run required validation commands from the matrix.
5. Update relevant docs when behavior, commands, or env policy changes.
6. Report outcome with file references, checks run, and risks.

## Path-to-Command Matrix
| Changed paths | Required commands |
| --- | --- |
| `app/**` | `npm run lint --workspace=ecotrack-app`, `npm run typecheck --workspace=ecotrack-app`, `npm run test --workspace=ecotrack-app` |
| `mobile/**` | `npm run lint --workspace=ecotrack-mobile`, `npm run typecheck --workspace=ecotrack-mobile`, `npm run test --workspace=ecotrack-mobile` |
| `api/**` | `npm run lint --workspace=ecotrack-api`, `npm run typecheck --workspace=ecotrack-api`, `npm run test --workspace=ecotrack-api` |
| `database/**` | `npm run build --workspace=ecotrack-database`, `npm run typecheck --workspace=ecotrack-database`, `npm run db:migrate --workspace=ecotrack-database` |
| cross-layer/env/CI changes | `npm run validate-env:all`, `npm run lint`, `npm run typecheck`, `npm run test` |

## Database Change Protocol
- If `database/schema/index.ts`, migrations, or seed logic changes, run all database matrix commands.
- Validate migration execution against the active `DATABASE_URL`.
- If migration cannot run locally, report the blocker and skipped command.

## Docs Sync Rule
- If runtime behavior, command surface, env policy, or architecture rules change, update `docs/` in the same task.
- Prefer updating existing docs over adding duplicate pages.
- The repo enforces this through `npm run validate-doc-sync`, the managed `.githooks/pre-commit` hook, and CI preflight.
- Treat these mappings as mandatory defaults:
  - frontend route/page behavior -> `docs/FRONTEND_ROUTES.md` and/or `docs/features/**`
  - API controllers/DTOs/contracts -> `docs/API_DOCUMENTATION.md`, `docs/openapi/**`, and/or `docs/features/**`
  - env/runtime/deploy command changes -> `docs/ENV.md`, `docs/ENVIRONMENT_SETUP.md`, `docs/DOCKER_SETUP.md`, `docs/runbooks/**`, and/or `README.md`
  - database schema/migration/seed changes -> `docs/DB_SCHEMA_NAMESPACE_*.md`, `docs/API_DOCUMENTATION.md`, and/or `docs/ROADMAP.md`
  - root version changes -> `CHANGELOG.md`

## Safety Guardrails
- Do not run destructive commands (`git reset --hard`, bulk deletes, history rewrites) unless explicitly requested.
- Do not revert unrelated local changes.
- Keep edits ASCII unless the target file already uses Unicode.
- Do not modify any `*.d.ts` file unless explicitly instructed.
- Do not change, rotate, regenerate, or "fix" secrets by default (`.env*`, secret managers, CI/CD secrets) unless explicitly instructed.
- Do not hardcode URLs, API endpoints, hosts, ports, keys, tokens, bucket/queue names, file paths, or environment-specific values in source code.
- Treat `"http://..."`, `"https://..."`, `"localhost"`, fixed non-test ports, and provider IDs as hardcoding unless values are test-only fixtures.
- Prefer environment variables, config modules, dependency injection, or props over inline configuration.
- Avoid deep prop drilling for config and endpoint values; prefer shared config modules or context/providers.

## No Hardcoding Policy
- Required by default: any value that can vary by environment (dev/test/stage/prod) must come from config or env, never inline literals.
- Allowed inline constants: domain-invariant values (enum-like labels, documented thresholds, UI copy) that do not encode infrastructure or deployment details.
- When adding new config: define canonical env keys in templates/examples, wire through typed config modules, and document usage location.
- Before closing a task: review changed files for hardcoded patterns (`http://`, `https://`, `localhost`, `:3000`, `:4000`, provider-specific IDs) and replace with configuration paths.

## Autonomy Rules (No-permission actions)
- Do not ask for my permission before editing any example/template environment files used for onboarding or documentation (e.g., `*.env.example`, sample env templates). If changes are needed for the task, update them directly and report what changed.
- Do not ask for my permission before running any validation commands (tests/build/lint/typecheck/migrate/validate-env). Run the required commands automatically based on the Path-to-Command Matrix and include pass/fail output in the report.
- Do not ask for my permission before running `npm run validate-doc-sync` or `npm run hooks:install`; they are part of the repo maintenance workflow.
- Exception: if a command is destructive or could target non-dev/prod resources, do not run it—report the blocker and what would have been run instead.

## Response Format Contract
- Always provide: concise summary, changed files, commands run with pass/fail, and known risks or follow-ups.
- State skipped validations and why they were skipped.
- Public API/interface note: this file changes process expectations only; it does not change runtime API/types.

## Test Scenarios and Defaults
- Validate these scenarios: API-only change, DB schema change, frontend env-file policy violation, infrastructure CI script change, and behavior change requiring docs sync.
- Defaults: monorepo-first scope, balanced enforcement (scoped checks by default, full suite for cross-layer/env/CI changes), single root `AGENTS.md`, and unchanged CI/CD workflows.


