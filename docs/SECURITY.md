# Security & Environment Management

## Secret Rotation Checklist

Rotate these credentials regularly (recommended every 90 days):

### Authentication
- [ ] `SESSION_SECRET` - Session encryption
- [ ] `JWT_SECRET` - JWT signing key
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID  
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Database
- [ ] `DATABASE_URL` - Postgres connection string (rotate password inside)

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
cp api/.env.example api/.env
cp app/.env.example app/.env.local
cp database/.env.example database/.env.local
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
