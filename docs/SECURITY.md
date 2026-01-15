# Security & Environment Management

## Secret Rotation Checklist

Rotate these credentials regularly (recommended every 90 days):

### Authentication
- [ ] `SESSION_SECRET` - Express session encryption
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID  
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Database
- [ ] `DB_PASSWORD` - PostgreSQL user password

### Optional Services
- [ ] `TELEGRAM_BOT_TOKEN` - Alert bot token
- [ ] `TELEGRAM_CHAT_ID` - Alert notification chat

## How to Generate Secure Secrets

### Session Secret
```bash
# Generate 32-byte random string
openssl rand -base64 32
```

### Database Password
```bash
# Generate 16-byte random string  
openssl rand -base64 16
```

## Setup Instructions

1. Copy environment templates:
```bash
cp .env.example .env
cp server/.env.example server/.env.local  
cp client/.env.example client/.env.local
```

2. Replace placeholder values with generated secrets
3. Never commit actual `.env` files
4. Store production secrets in secure vault (AWS Secrets Manager, etc.)

## Security Best Practices

- ✅ Use different secrets for dev/staging/production
- ✅ Rotate secrets quarterly minimum  
- ✅ Use cryptographically secure random generation
- ✅ Store secrets in environment variables, not code
- ✅ Use proper vault for production secrets