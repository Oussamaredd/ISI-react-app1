# Environment Setup Guide

## Security Notice

The example environment files contain placeholder values. Generate your own secrets before any shared or production deployment.

## Required Secrets

### 1. Session secret
```bash
openssl rand -base64 32
```

### 2. Database password
```bash
openssl rand -base64 16
```

### 3. Google OAuth credentials
1. Go to https://console.cloud.google.com/apis/credentials.
2. Create an OAuth 2.0 Client ID.
3. Add redirect URI `http://localhost:3001/auth/google/callback`.
4. Copy client ID and client secret.

### 4. Telegram bot token (optional)
1. Create a bot using `@BotFather`.
2. Copy the generated token.

## Local Workspace Setup

```bash
# Frontend
cp app/.env.example app/.env.local

# API
cp api/.env.example api/.env

# Database (optional local override)
cp database/.env.example database/.env.local

# Docker/infrastructure variables
cp .env.example .env.docker
```

## Docker / Infrastructure Setup

```bash
# Uses infrastructure workspace wrappers from repo root.
# This starts db -> migrate -> backend -> frontend with dependency gating.
npm run infra:up
```

## Root Command Surface (4 layers)

```bash
# App + API dev workflow
npm run dev

# Build and validation
npm run build
npm run typecheck
npm run test
npm run lint

# Database lifecycle
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:migrate:seed

# Infrastructure lifecycle
npm run infra:up
npm run infra:down
npm run infra:health
```

`npm run lint` enforces architecture import boundaries for `app` and `api` via ESLint restricted-import rules.

## Environment Variables Reference

### API variables
| Variable | Required | Description |
| --- | --- | --- |
| `API_PORT` | Yes | API port (default `3001`) |
| `DATABASE_URL` | Yes | Postgres connection string |
| `SESSION_SECRET` | Yes | Session encryption secret |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_EXPIRES_IN` | Yes | Token lifetime (for example `7d`) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `CORS_ORIGINS` | Yes | Comma-separated origins |

### App variables
| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Backend API base URL |
| `VITE_BASE` | No | Base path for hosted deployments |
| `VITE_DEV_PORT` | No | Local dev server port |

## Verification

```bash
npm run build
npm run typecheck
npm run test
npm run lint
```

Database reliability verification:
```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ticketdb npm run db:migrate --workspace=react-app1-database
```
