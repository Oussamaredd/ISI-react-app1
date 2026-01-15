# Environment Variables Configuration

This document describes all environment variables used by the application.

## Server Environment Variables

### Required
- `SESSION_SECRET` - Express session encryption secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Database
- `DB_USER` - PostgreSQL username (default: postgres)
- `DB_PASSWORD` - PostgreSQL password
- `DB_HOST` - Database host (default: localhost)
- `DB_NAME` - Database name (default: ticketdb)
- `DB_PORT` - Database port (default: 5432)

### Server Configuration
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

### Client & CORS
- `CLIENT_ORIGIN` - Frontend URL (required for CORS)
- `CORS_ORIGINS` - Comma-separated list of allowed origins
- `GOOGLE_CALLBACK_URL` - OAuth callback URL

### Optional Services
- `TELEGRAM_BOT_TOKEN` - Bot token for alerts
- `TELEGRAM_CHAT_ID` - Chat ID for notifications
- `ENABLE_LOGSTASH` - Enable ELK integration (true/false)
- `LOGSTASH_HOST` - Logstash host (default: logstash)
- `LOGSTASH_PORT` - Logstash port (default: 5001)
- `ELASTIC_URL` - Elasticsearch URL (default: http://elasticsearch:9200)

## Client Environment Variables

### Required
- `VITE_API_BASE_URL` - Backend API URL

### Optional
- `VITE_BASE` - Base path for GitHub Pages deployment

## Docker Compose Variables

### Database
- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_DB` - PostgreSQL database name

## Setup Instructions

1. Copy template files:
```bash
cp .env.example .env
cp server/.env.example server/.env.local
cp client/.env.example client/.env.local
```

2. Replace placeholder values with actual credentials

3. Never commit actual .env files

## Development vs Production

### Local Development
- DB_HOST: localhost
- CLIENT_ORIGIN: http://localhost:5173
- VITE_API_BASE_URL: http://localhost:5000

### Docker Development
- DB_HOST: db (container name)
- CLIENT_ORIGIN: http://localhost:3000
- VITE_API_BASE_URL: http://localhost:5000

### Production
- Use actual domain names
- Enable HTTPS
- Set NODE_ENV=production
- Use secure database passwords