# Environment Setup Guide

## Security Notice

⚠️ **CRITICAL**: The example environment files contain placeholder values. You MUST generate your own secrets before deploying to production.

## Required Secrets Generation

### 1. Session Secret
```bash
# Generate a secure session secret
openssl rand -base64 32
```

### 2. Database Password
```bash
# Generate a secure database password
openssl rand -base64 16
```

### 3. Google OAuth Credentials
1. Visit [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
4. Copy Client ID and Client Secret

### 4. Telegram Bot Token (Optional)
1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Copy the bot token

## Environment Setup Steps

### Local Development (monorepo workspaces)
```bash
# 1) Frontend (Vite app)
cp app/.env.example app/.env.local

# 2) API (NestJS)
cp api/.env.example api/.env

# 3) Database package (if you override defaults)
cp database/.env.example database/.env.local
```

### Docker / Infrastructure
```bash
# Compose reads .env.docker at repo root
npm run docker:dev --workspace=react-app1-infrastructure
```

## Environment Variables Reference

### Server Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `API_PORT` | ✅ | API port (default 3001) |
| `DATABASE_URL` | ✅ | Postgres connection string |
| `SESSION_SECRET` | ✅ | Session encryption secret |
| `JWT_SECRET` | ✅ | JWT signing secret |
| `JWT_EXPIRES_IN` | ✅ | Token lifetime (e.g., 7d) |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `CORS_ORIGINS` | ✅ | Comma-separated origins |

### Client Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | ✅ | Backend API URL |
| `VITE_BASE` | ❌ | Base path for GitHub Pages |
| `VITE_DEV_PORT` | ❌ | Development server port |

## Security Best Practices

1. **Never commit actual `.env` files** to version control
2. **Use different secrets** for development and production
3. **Rotate secrets regularly** (every 90 days recommended)
4. **Use environment-specific values** for different deployment targets
5. **Store production secrets** in a secure vault (AWS Secrets Manager, Azure Key Vault, etc.)

## Production Deployment

For production deployments, use your cloud provider's secret management:

- **AWS**: AWS Secrets Manager or Parameter Store
- **Azure**: Azure Key Vault
- **Google Cloud**: Secret Manager
- **Docker**: Docker Secrets or Swarm Secrets

## Verification

After setting up environment variables:

```bash
# Verify API
npm run build --workspace=react-app1-api && npm run start --workspace=react-app1-api

# Verify frontend
npm run build --workspace=react-app1-app && npm run preview --workspace=react-app1-app -- --host

# Verify Docker stack
npm run docker:dev --workspace=react-app1-infrastructure
```
