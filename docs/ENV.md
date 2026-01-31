# Environment Variables Configuration

This document describes all environment variables used by the application.

## API (NestJS) Environment Variables

Required:
- `API_PORT` – API listen port (default: 3001)
- `DATABASE_URL` – Postgres connection string (`postgres://user:pass@host:port/db`)
- `SESSION_SECRET` – session/CSRF secret
- `JWT_SECRET` – JWT signing secret
- `JWT_EXPIRES_IN` – token lifetime (e.g., `7d`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – OAuth credentials (if Google login enabled)
- `CORS_ORIGINS` – comma-separated origins (e.g., `http://localhost:5173`)

## Frontend (Vite) Environment Variables

### Required
- `VITE_API_BASE_URL` - Backend API URL

### Optional
- `VITE_BASE` - Base path for GitHub Pages deployment
- `VITE_DEV_PORT` - Override dev server port

## Docker Compose Variables (infrastructure/)

- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` - PostgreSQL credentials for the DB container
- `DATABASE_URL` - passed to the API container (use `db` host inside compose)
- `API_PORT` - published API port (defaults to 3001)

## Setup Instructions

1. Copy template files:
```bash
cp .env.example .env
cp app/.env.example app/.env.local
cp api/.env.example api/.env
cp database/.env.example database/.env.local
```

2. Replace placeholder values with actual credentials

3. Never commit actual .env files

## Development vs Production

### Local Development
- DATABASE_URL: postgres://postgres:postgres@localhost:5432/tickets
- CORS_ORIGINS: http://localhost:5173
- VITE_API_BASE_URL: http://localhost:3001

### Docker Development
- DATABASE_URL: postgres://postgres:postgres@db:5432/tickets
- CORS_ORIGINS: http://localhost:5173,http://localhost:3000
- VITE_API_BASE_URL: http://localhost:3001

### Production
- Use actual domain names
- Enable HTTPS
- Set NODE_ENV=production
- Use secure database passwords
