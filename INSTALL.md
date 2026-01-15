# Installation and Setup Guide

## Quick Installation

### Prerequisites
- Node.js 18+ and npm 9+
- Docker & Docker Compose
- Git

### One-Command Setup
```bash
# Clone and setup
git clone https://github.com/Oussamaredd/ISI-react-app1
cd ISI-react-app1

# Install all dependencies
npm run install:all

# Setup environment files
cp .env.example .env
cp server/.env.example server/.env.local
cp client/.env.example client/.env.local

# Generate secure secrets
SESSION_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 16)

# Edit environment files with your secrets
# See ENVIRONMENT_SETUP.md for detailed instructions
```

## Development Setup

### 1. Database Only (Fastest)
```bash
# Start PostgreSQL
docker compose up -d db

# Start backend + frontend
npm run dev
```

### 2. Full Stack with Docker
```bash
# Start all services
docker compose up --build

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

## Testing and Quality

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck
```

## Environment Variables

### Required Variables
- `SESSION_SECRET`: Session encryption secret
- `GOOGLE_CLIENT_ID`: Google OAuth client ID  
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `DB_PASSWORD`: Database password

### Optional Variables
- `TELEGRAM_BOT_TOKEN`: Alert notifications
- `TELEGRAM_CHAT_ID`: Alert chat ID
- `ENABLE_LOGSTASH`: ELK integration

## First Time Setup

1. **Google OAuth Setup**
   - Visit [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create OAuth 2.0 Client ID
   - Add redirect: `http://localhost:5000/auth/google/callback`

2. **Environment Configuration**
   - Edit `.env` files with your credentials
   - Never commit actual `.env` files

3. **Database Initialization**
   - Database schema created automatically on startup
   - Sample data inserted for testing

## Troubleshooting

### Common Issues
- **Database connection**: Check `DB_HOST` and credentials
- **OAuth errors**: Verify redirect URLs match
- **Build failures**: Clear cache and reinstall dependencies

### Health Checks
```bash
# Backend health
curl http://localhost:5000/health

# Frontend access
curl http://localhost:5173

# Database connection
docker exec -it ticket_db psql -U postgres -d ticketdb
```

## Development Workflow

1. Make changes to code
2. Run tests and linting
3. Test locally with `npm run dev`
4. Commit with conventional commits
5. Create pull request
6. CI/CD handles testing and deployment