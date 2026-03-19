# Security and Environment Management

## Secret Rotation Checklist

Rotate these credentials regularly (recommended every 90 days).

### Authentication
- [ ] `SESSION_SECRET` - session encryption
- [ ] `JWT_SECRET` - JWT signing key
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Database
- [ ] `DATABASE_URL` - Postgres connection string (rotate password inside)

### Optional Services
- [ ] `TELEGRAM_BOT_TOKEN` - alert bot token
- [ ] `TELEGRAM_CHAT_ID` - alert notification chat

## How to Generate Secure Secrets

### Session/JWT Secret
```bash
openssl rand -base64 32
```

### Database Password
```bash
openssl rand -base64 16
```

## Setup Instructions

1. Copy environment templates (`api/.env` is optional service-scoped reference only; local runtime still uses root `/.env`):
```bash
cp .env.example .env
cp api/.env.example api/.env
cp app/.env.example app/.env.local
cp infrastructure/environments/.env.docker.example infrastructure/environments/.env.docker
```
2. Replace placeholder values with generated secrets.
3. Never commit populated env files.
4. Store production secrets in a secure vault.

## Leakage Checks (Pre-Push)

```bash
# 1) Verify gitignore coverage for local secret files
git check-ignore -v .env api/.env app/.env.local infrastructure/environments/.env.docker

# 2) Scan tracked content for obvious secret signatures
rg -n "(GOCSPX-|AKIA|ghp_|BEGIN RSA|BEGIN OPENSSH|PRIVATE KEY)" . --glob "!node_modules/**"

# 3) Validate committed env templates and policy constraints
npm run validate-env:all
```

## Security Best Practices

- Use different secrets for dev/staging/production.
- Rotate secrets on a fixed schedule.
- Use cryptographically secure random generation.
- Keep secrets in runtime env injection, not source files.
- Enforce env-policy validation in CI before build/deploy.
- Keep `CORS_ORIGINS` on strict, explicit allowlists per environment (no wildcard origins).

## API Runtime Hardening

- Security headers are applied with `helmet` (CSP disabled for API-only JSON responses).
- HTTP auto-logging is structured (`nestjs-pino`) and emits one completion line per request (health/metrics paths excluded).
- Request log levels are differentiated by outcome (`info` for success, `warn` for 4xx, `error` for 5xx/error cases).
- Logged request paths exclude query strings to reduce token leakage risk from URLs.
- Sensitive inputs are redacted in logs:
  - request headers: `authorization`, `cookie`, `x-api-key`, `x-auth-token`
  - request body fields: `password`, `currentPassword`, `newPassword`, `token`, `accessToken`, `refreshToken`, `idToken`, `clientSecret`, `secret`
  - request query fields: `token`, `accessToken`, `refreshToken`
  - response headers: `set-cookie`
- Nest internal startup/module/route mapping logs are suppressed by default in `development`/`test` (restored when `LOG_LEVEL=debug|trace`).
- Each response carries `X-Request-Id` and `Traceparent`; `Tracestate` is echoed when the request included it.
- Structured request completion logs emit `traceId` and `spanId` so ELK queries can pivot from headers to server-side logs.
- Global rate limiting is enabled (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`) with a stricter default abuse budget on auth endpoints such as `POST /login`.
- Health probes and the Prometheus scrape endpoint are excluded from auto-log noise and rate limiting so operator probes do not distort abuse signals.

## Automated Injection Safety Checks

This repository stays inside the current Development-only specialty scope. The delivered security work for this phase is automated verification owned by the app and API teams; it does not expand into pentesting, WAF, IDS, SIEM, or other broader security-specialty tracks.

Repo-owned negative security tests now live in `api/src/tests/security-negative-input.test.ts` and cover three existing high-risk admin endpoints:

- `GET /api/admin/users` with a SQL-style `search` payload to verify inert handling and no widened result set
- `GET /api/admin/audit-logs` with a SQL-style `search` payload to verify inert handling and bounded results
- `PUT /api/admin/settings` with a prototype-pollution payload to verify rejection, no side effects, and a stable `400` error body

These tests assert the expected status codes and bodies, reject or inertly handle malicious payloads, prevent widened query results and unsafe side effects, and confirm that responses do not leak stack traces or SQL details.

## SAST Gate

The required CI workflow now includes a blocking `Semgrep SAST` job in `.github/workflows/CI.yaml`.

- Scanner: Semgrep OSS
- Scan scope: `api/src` and `database/schema`
- Rulesets: `p/typescript`, `p/nodejs`, and `p/owasp-top-ten`
- Exclusions: `api/src/tests/**`, `database/dist/**`, and `**/node_modules/**`
- Behavior: the CI run fails on Semgrep findings and uploads `tmp/ci/semgrep-report.json` as an artifact

The existing extended-quality ZAP baseline remains available as a supplemental, non-blocking DAST hook. It is not the primary acceptance mechanism for this Development-owned task.

