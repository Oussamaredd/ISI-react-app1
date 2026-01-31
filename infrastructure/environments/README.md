# Environment Configuration Guide

This project uses different environment files for different deployment stages:

## Environment Files Location

All environment files are located in the `environments/` directory:

- `environments/.env.development` - Development environment
- `environments/.env.staging` - Staging environment  
- `environments/.env.production` - Production environment
- `environments/.env.docker` - Docker environment

## Application Environment Files

### Client (apps/client/)
- `.env.example` - Template for client environment variables
- `.env.local` - Local overrides (do not commit)

### Server (apps/server/)
- `.env.example` - Template for server environment variables
- `.env.local` - Local overrides (do not commit)

## Usage

### Development
```bash
# Use development environment
cp environments/.env.development .env
```

### Docker
```bash
# Use Docker environment
cp environments/.env.docker .env
```

### Production
```bash
# Use production environment
cp environments/.env.production .env
```

## Security Notes

- Never commit `.env` files containing secrets
- Use `.env.local` for local development overrides
- All secret values should be replaced in production
- Use environment-specific secrets management in production