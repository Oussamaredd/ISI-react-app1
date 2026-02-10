# Phase 4 Infra Hardening Plan (Rechecked February 10, 2026)

## Objective
Make this command reliable on Windows and Linux:

`docker compose -f infrastructure/docker-compose.yml --profile core up -d --build`

Target state:
- `db` healthy
- `migrate` exits `0`
- `backend` healthy

## Recheck Findings (current state)
- `docker compose -f infrastructure/docker-compose.yml --profile core config` shows:
  - `GOOGLE_CLIENT_ID: ""`
  - `GOOGLE_CLIENT_SECRET: ""`
- `docker compose -f infrastructure/docker-compose.yml --profile core up -d --build` still fails:
  - backend unhealthy/restarting
  - Nest bootstrap error: `Google OAuth env vars are missing (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET).`
- `migrate` is already deterministic and succeeds:
  - `docker inspect -f "{{.State.Status}} {{.State.ExitCode}}" ticket_migrate` => `exited 0`

Root cause of mismatch:
- Core compose stack currently reads `../.env.docker` (repo root), not `infrastructure/environments/.env.*`.
- Secrets added only in `infrastructure/environments` do not reach `backend`/`migrate` in current wiring.

---

## Execution Order
1. Fix env source-of-truth and backend env injection (P0)
2. Keep startup sequencing deterministic (P0)
3. Make host commands shell-independent (P1)
4. Prevent CRLF regressions (P1)
5. Update docs and run full acceptance checks (P1)

---

## Phase 1 (P0): Fix Backend Unhealthy via Infra Env Wiring

### Checklist
- [x] Use one canonical env file path for core compose runtime.
- [x] Ensure `backend` and `migrate` read the same canonical env file.
- [x] Stop overriding OAuth values with empty compose interpolation.
- [x] Keep container-safe DB host (`db`) inside compose network.

### Files to edit
- `infrastructure/docker-compose.yml`
- `infrastructure/start-dev.bat`
- `docs/DOCKER_SETUP.md`
- `docs/ENV.md`
- `README.md`

### Key diff guidance
```diff
diff --git a/infrastructure/docker-compose.yml b/infrastructure/docker-compose.yml
@@ migrate
- env_file:
-   - ../.env.docker
+ env_file:
+   - ./environments/.env.docker
@@ migrate.environment
  DATABASE_URL: ${DATABASE_URL:-postgres://postgres:postgres@db:5432/ticketdb}
@@ backend
- env_file:
-   - ../.env.docker
+ env_file:
+   - ./environments/.env.docker
@@ backend.environment
  API_PORT: ${API_PORT:-3001}
  DATABASE_URL: ${DATABASE_URL:-postgres://postgres:postgres@db:5432/ticketdb}
  CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:5173}
  SESSION_SECRET: ${SESSION_SECRET:-changeme-session}
  JWT_SECRET: ${JWT_SECRET:-changeme-jwt}
  JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-7d}
- GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
- GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
  NODE_ENV: ${NODE_ENV:-development}
```

Rationale:
- Remove explicit `GOOGLE_*` entries from `environment:` so `env_file` values are not replaced by empty interpolation.
- Keep other non-secret runtime defaults if needed.

### Validate Phase 1
```bash
docker compose -f infrastructure/docker-compose.yml --profile core config
docker compose -f infrastructure/docker-compose.yml --profile core up -d --build
docker compose -f infrastructure/docker-compose.yml --profile core logs backend --tail=200
docker compose -f infrastructure/docker-compose.yml --profile core ps
```

Expected:
- Backend no longer crashes on missing Google OAuth vars.

---

## Phase 2 (P0): Keep DB -> Migrate -> Backend Deterministic

### Checklist
- [x] DB healthcheck uses explicit user + database.
- [x] `migrate` depends on DB healthy.
- [x] `backend` depends on `migrate` `service_completed_successfully`.
- [x] `migrate.sh` exits non-zero on failure (keep `set -eu` behavior).

### Files to edit
- `infrastructure/docker-compose.yml`
- `infrastructure/scripts/migrate.sh` (only if behavior drift found)

### Key diff guidance
```diff
diff --git a/infrastructure/docker-compose.yml b/infrastructure/docker-compose.yml
@@ db.healthcheck
- test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
+ test: ["CMD-SHELL", "pg_isready -h localhost -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-ticketdb}"]
```

### Validate Phase 2
```bash
docker compose -f infrastructure/docker-compose.yml --profile core down -v --remove-orphans
docker compose -f infrastructure/docker-compose.yml --profile core up -d --build
docker inspect -f "{{.State.Status}} {{.State.ExitCode}}" ticket_migrate
docker compose -f infrastructure/docker-compose.yml --profile core ps
```

Expected:
- `ticket_db` healthy
- `ticket_migrate` exited `0`
- `ticket_backend` stays up and becomes healthy

---

## Phase 3 (P1): Cross-Platform Commands (No host `sh`)

### Checklist
- [x] Replace host calls to `sh ./scripts/migrate.sh ...` with `docker compose ... run --rm migrate`.
- [x] Keep `migrate.sh` only as in-container command.
- [x] Provide no-seed and seed-enabled script variants.

### Files to edit
- `infrastructure/package.json`
- `docs/DOCKER_SETUP.md`
- `README.md`

### Key diff guidance
```diff
diff --git a/infrastructure/package.json b/infrastructure/package.json
@@ scripts
- "migrate:up": "sh ./scripts/migrate.sh up",
- "migrate:status": "sh ./scripts/migrate.sh status"
+ "migrate:up": "docker compose -f docker-compose.yml --profile core run --build --rm -e ENABLE_SEED_DATA=false migrate",
+ "migrate:up:seed": "docker compose -f docker-compose.yml --profile core run --build --rm -e ENABLE_SEED_DATA=true -e SEED_COMMAND=\"npm run db:seed --workspace=react-app1-database\" migrate",
+ "migrate:status": "docker compose -f docker-compose.yml --profile core run --rm migrate status"
```

### Validate Phase 3
```bash
npm run migrate:up --workspace=react-app1-infrastructure
npm run migrate:up:seed --workspace=react-app1-infrastructure
```

---

## Phase 4 (P1): Line Ending Durability

### Checklist
- [x] Add root `.gitattributes` enforcing LF for scripts run in Linux containers.
- [x] Renormalize tracked files.

### Files to edit
- `.gitattributes`

### Key snippet
```gitattributes
* text=auto
*.sh text eol=lf
Dockerfile text eol=lf
*.yml text eol=lf
*.yaml text eol=lf
```

### Validate Phase 4
```bash
git add --renormalize .
git status
```

---

## Phase 5 (P1): Documentation Alignment

### Checklist
- [x] Document the canonical compose env file path.
- [x] Document compose-based migrate commands for PowerShell/Linux.
- [x] Document acceptance flow and expected states.

### Files to edit
- `docs/DOCKER_SETUP.md`
- `docs/ENV.md`
- `README.md`

---

## Final Acceptance Criteria
- [x] `docker compose -f infrastructure/docker-compose.yml --profile core config` passes.
- [x] `docker compose -f infrastructure/docker-compose.yml --profile core up -d --build` yields:
  - `db` healthy
  - `migrate` exited `0`
  - `backend` healthy
- [x] No-seed migrate run works via compose.
- [x] Seed-enabled migrate run works via compose.
- [x] Standard workflow has no host dependency on `sh`.
- [x] Docs match final commands and env source-of-truth.

## Final Validation Commands
```bash
docker compose -f infrastructure/docker-compose.yml --profile core down -v --remove-orphans
docker compose -f infrastructure/docker-compose.yml --profile core config
docker compose -f infrastructure/docker-compose.yml --profile core up -d --build
docker compose -f infrastructure/docker-compose.yml --profile core ps
docker inspect -f "{{.State.Status}} {{.State.ExitCode}}" ticket_migrate
docker compose -f infrastructure/docker-compose.yml --profile core logs backend --tail=200
curl -fsS http://localhost:3001/api/health
npm run migrate:up --workspace=react-app1-infrastructure
npm run migrate:up:seed --workspace=react-app1-infrastructure
```
