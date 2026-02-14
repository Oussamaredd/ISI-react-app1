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

1. Copy environment templates:
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
- Each response carries `X-Request-Id` and the same value is emitted in logs/error payloads for traceability.
- Global rate limiting is enabled (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`) with stricter limits on auth abuse endpoints.
