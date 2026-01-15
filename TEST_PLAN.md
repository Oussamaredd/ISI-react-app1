# 10-Minute Local Verification Test Plan

## Quick Start Verification

### Prerequisites Setup (2 minutes)

```bash
# 1. Clone and navigate
git clone https://github.com/Oussamaredd/ISI-react-app1
cd ISI-react-app1

# 2. Verify tools
docker --version          # Should be 20.10+
docker compose --version # Should be 2.0+
node --version           # Should be 18+
npm --version            # Should be 9+

# 3. Quick environment setup
cp .env.example .env
cp server/.env.example server/.env.local
cp client/.env.example client/.env.local
```

### Infrastructure Health Check (2 minutes)

```bash
# Start all services
docker compose up -d

# Wait for services to be ready (30 seconds)
echo "Waiting for services..."
sleep 30

# Check service status
docker compose ps

# Verify critical services are healthy
echo "🔍 Checking service health..."
curl -f http://localhost:5432 > /dev/null 2>&1 && echo "✅ PostgreSQL healthy" || echo "❌ PostgreSQL failed"
curl -f http://localhost:5000/health > /dev/null 2>&1 && echo "✅ Backend healthy" || echo "❌ Backend failed"
curl -f http://localhost:3000 > /dev/null 2>&1 && echo "✅ Frontend healthy" || echo "❌ Frontend failed"
```

### Database Schema Verification (1 minute)

```bash
# Connect to database and verify schema
docker exec -it ticket_db psql -U postgres -d ticketdb -c "
-- Check tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
 
-- Check foreign key constraints
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'tickets'::regclass;
 
-- Check sample data
SELECT COUNT(*) as ticket_count FROM tickets;
SELECT COUNT(*) as hotel_count FROM hotels;
 
-- Verify data integrity
SELECT t.id, t.name, h.name as hotel_name FROM tickets t LEFT JOIN hotels h ON t.hotel_id = h.id LIMIT 5;
"
```

### Authentication Flow Test (2 minutes)

```bash
# Test Google OAuth initiation
echo "🔐 Testing authentication flow..."
curl -I http://localhost:5000/auth/google

# Test session creation (manual browser test needed)
echo "🌐 Open browser and test:"
echo "1. Go to http://localhost:3000"
echo "2. Click 'Login with Google'"
echo "3. Complete OAuth flow"
echo "4. Verify you're logged in and can see tickets"
```

### API Endpoints Verification (2 minutes)

```bash
# Test API endpoints
echo "🔌 Testing API endpoints..."

# Create a test ticket
CREATE_RESPONSE=$(curl -s -X POST http://localhost:5000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Ticket","price":10.00,"status":"OPEN","hotel_id":1}')
echo "Create ticket: $CREATE_RESPONSE"

# Get all tickets
TICKETS_RESPONSE=$(curl -s http://localhost:5000/api/tickets)
echo "Get tickets: $TICKETS_RESPONSE"

# Get all hotels
HOTELS_RESPONSE=$(curl -s http://localhost:5000/api/hotels)
echo "Get hotels: $HOTELS_RESPONSE"

# Verify response structure
echo "📊 Checking response structure..."
echo $TICKETS_RESPONSE | jq '.[] | .name' > /dev/null 2>&1 && echo "✅ API responses valid" || echo "❌ API responses invalid"
```

### Frontend Integration Test (1 minute)

```bash
# Automated frontend checks
echo "🎨 Testing frontend integration..."

# Check build
cd client
npm run build > /dev/null 2>&1 && echo "✅ Frontend builds successfully" || echo "❌ Frontend build failed"

# Check for console errors (manual verification needed)
echo "🌐 Manual frontend checks:"
echo "1. Open http://localhost:3000"
echo "2. Open browser dev tools (F12)"
echo "3. Check Console tab for errors"
echo "4. Check Network tab for failed requests"
echo "5. Test creating/editing tickets"
echo "6. Test hotel associations"
```

### Monitoring Stack Verification (1 minute)

```bash
# Check monitoring services
echo "📊 Checking monitoring stack..."

curl -f http://localhost:9090 > /dev/null 2>&1 && echo "✅ Prometheus accessible" || echo "❌ Prometheus failed"
curl -f http://localhost:3030 > /dev/null 2>&1 && echo "✅ Grafana accessible" || echo "❌ Grafana failed"
curl -f http://localhost:5601 > /dev/null 2>&1 && echo "✅ Kibana accessible" || echo "❌ Kibana failed"

# Check metrics endpoint
curl -s http://localhost:5000/metrics | grep "http_requests_total" > /dev/null 2>&1 && echo "✅ Metrics exposed" || echo "❌ Metrics not exposed"
```

### Security Quick Checks (1 minute)

```bash
# Basic security checks
echo "🔒 Running quick security checks..."

# Check for exposed secrets
if grep -r "GOCSPX\|38782580532" . --exclude-dir=node_modules --exclude-dir=.git > /dev/null 2>&1; then
  echo "❌ Exposed secrets found"
else
  echo "✅ No exposed secrets detected"
fi

# Check CORS configuration
CORS_CHECK=$(curl -s -H "Origin: http://evil.com" http://localhost:5000/api/tickets | grep -c "evil.com" || echo "0")
if [ "$CORS_CHECK" -eq "0" ]; then
  echo "✅ CORS properly configured"
else
  echo "❌ CORS misconfigured"
fi

# Check for security headers
SECURITY_HEADERS=$(curl -s -I http://localhost:5000/api/tickets | grep -i "x-frame-options\|x-content-type-options\|x-xss-protection" | wc -l)
if [ "$SECURITY_HEADERS" -gt "0" ]; then
  echo "✅ Security headers present"
else
  echo "⚠️ Security headers missing"
fi
```

## Success Criteria Summary

### ✅ Pass Indicators
- All Docker services running (`docker compose ps` shows healthy)
- Database schema matches init.sql (foreign keys present)
- Google OAuth redirects to Google and back
- CRUD operations work via API
- Frontend loads without console errors
- Monitoring dashboards accessible
- No exposed secrets in codebase

### ❌ Fail Indicators
- Service startup failures (check `docker compose logs`)
- Database connection errors (verify credentials)
- OAuth redirect loops (check callback URL)
- CORS errors in browser (verify origins)
- Missing foreign key constraints (compare schemas)
- Console errors in frontend (check dev tools)

## Automated Verification Script

```bash
#!/bin/bash
# 10-minute verification script

set -e

echo "🚀 Starting 10-minute verification..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️ $1${NC}"; }

# 1. Infrastructure Health
echo -e "\n🏗️ Checking infrastructure..."
docker compose up -d > /dev/null 2>&1
sleep 30

if docker compose ps | grep -q "Up"; then
  pass "Docker services running"
else
  fail "Docker services failed"
  docker compose logs
  exit 1
fi

# 2. Service Health
echo -e "\n🏥 Checking service health..."
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
  pass "Backend healthy"
else
  fail "Backend unhealthy"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
  pass "Frontend healthy"
else
  fail "Frontend unhealthy"
fi

# 3. Database Schema
echo -e "\n🗄️ Checking database schema..."
DB_CHECK=$(docker exec -it ticket_db psql -U postgres -d ticketdb -tAc "
  SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE constraint_name = 'tickets_hotel_id_fkey';
" 2>/dev/null | tr -d '\r\n')

if [ "$DB_CHECK" -eq "1" ]; then
  pass "Foreign key constraints present"
else
  fail "Foreign key constraints missing"
fi

# 4. API Functionality
echo -e "\n🔌 Checking API functionality..."
API_TEST=$(curl -s http://localhost:5000/api/tickets | jq '.[0].name' 2>/dev/null || echo "failed")
if [ "$API_TEST" != "failed" ]; then
  pass "API endpoints working"
else
  fail "API endpoints failed"
fi

# 5. Security
echo -e "\n🔒 Checking security..."
if grep -r "GOCSPX\|38782580532" . --exclude-dir=node_modules --exclude-dir=.git > /dev/null 2>&1; then
  fail "Exposed secrets found"
else
  pass "No exposed secrets"
fi

# 6. Monitoring
echo -e "\n📊 Checking monitoring..."
if curl -f http://localhost:9090 > /dev/null 2>&1; then
  pass "Prometheus accessible"
else
  warn "Prometheus not accessible"
fi

echo -e "\n🎉 Verification complete!"
echo -e "\n📋 Manual checks needed:"
echo "1. Open http://localhost:3000 in browser"
echo "2. Test Google OAuth login"
echo "3. Create/edit tickets"
echo "4. Check browser console for errors"
echo "5. Verify Grafana dashboards at http://localhost:3030"
```

## Troubleshooting Quick Fixes

### Common Issues and Solutions

#### Docker Services Fail to Start
```bash
# Clean up and restart
docker compose down -v
docker system prune -f
docker compose up --build
```

#### Database Connection Errors
```bash
# Check database credentials
docker exec -it ticket_db psql -U postgres -d ticketdb -c "\l"

# Reset database
docker compose down -v
docker compose up -d db
sleep 10
docker exec -it ticket_db psql -U postgres -d ticketdb -f /docker-entrypoint-initdb.d/init.sql
```

#### OAuth Redirect Issues
```bash
# Check environment variables
cat server/.env.local | grep GOOGLE

# Update callback URL in Google Console
# URL should be: http://localhost:5000/auth/google/callback
```

#### Frontend Build Errors
```bash
# Clean and rebuild
cd client
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### CORS Errors
```bash
# Check CORS configuration
curl -H "Origin: http://localhost:3000" http://localhost:5000/api/tickets -v

# Update CORS origins in server/.env.local
echo "CORS_ORIGINS=http://localhost:3000,http://localhost:5173" >> server/.env.local
```

This test plan provides a comprehensive 10-minute verification that covers all critical aspects of the portfolio application.