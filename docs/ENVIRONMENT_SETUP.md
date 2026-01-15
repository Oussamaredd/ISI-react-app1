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
3. Add authorized redirect URI: `http://localhost:5000/auth/google/callback`
4. Copy Client ID and Client Secret

### 4. Telegram Bot Token (Optional)
1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Copy the bot token

## Environment Setup Steps

### Local Development
```bash
# 1. Root environment
cp .env.example .env
# Edit .env with your generated secrets

# 2. Server environment  
cp server/.env.example server/.env.local
# Edit server/.env.local with your credentials

# 3. Client environment
cp client/.env.example client/.env.local
# Edit client/.env.local if needed
```

### Docker Compose
```bash
# Copy and configure root environment
cp .env.example .env
# Edit .env with your secrets
docker compose up --build
```

## Environment Variables Reference

### Server Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | ✅ | Session encryption secret |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `DB_PASSWORD` | ✅ | Database password |
| `TELEGRAM_BOT_TOKEN` | ❌ | Telegram bot token for alerts |
| `TELEGRAM_CHAT_ID` | ❌ | Telegram chat ID for alerts |

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
# Verify server starts
cd server && npm start

# Verify frontend builds
cd client && npm run build

# Verify Docker services
docker compose up -d
```