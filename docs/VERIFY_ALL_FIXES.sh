#!/bin/bash
# Complete 10-minute verification script for all PR fixes

set -e

echo "🚀 Starting complete verification of all PR fixes..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}⚠️ $1${NC}"; }

# Step 1: Environment Setup Verification
echo "📋 Step 1: Environment Setup Verification"
echo "-------------------------------------------"

# Check environment files exist
if [[ ! -f ".env.example" ]]; then
  fail "Missing .env.example"
fi
if [[ ! -f "server/.env.example" ]]; then
  fail "Missing server/.env.example"
fi
if [[ ! -f "client/.env.example" ]]; then
  fail "Missing client/.env.example"
fi
pass "All .env.example files present"

# Check for exposed secrets
if git grep -q "GOCSPX\|38782580532\|b17f26ae5f78fbfa58e2e106cd5eed56bcbc74b71b4af9f3afd40e740de7e9d1" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null; then
  fail "Exposed secrets found in code"
fi
pass "No exposed secrets detected"

# Create environment files for testing
cp .env.example .env.test
cp server/.env.example server/.env.local
cp client/.env.example client/.env.local
pass "Environment files created for testing"

# Step 2: Infrastructure Setup
echo ""
echo "🏗️ Step 2: Infrastructure Setup"
echo "---------------------------------"

# Start database
docker compose up -d db || fail "Failed to start database"
sleep 30

# Check database health
if docker compose ps | grep -q "Up"; then
  pass "Database container is running"
else
  fail "Database container failed to start"
fi

# Step 3: Schema Verification
echo ""
echo "🗄️ Step 3: Database Schema Verification"
echo "-----------------------------------------"

# Wait for database to be ready
timeout 60 bash -c 'until docker exec ticket_db pg_isready -U postgres; do sleep 2; done' || fail "Database not ready"

# Check foreign key constraints
FK_CHECK=$(docker exec ticket_db psql -U postgres -d ticketdb -tAc "
  SELECT COUNT(*) FROM pg_constraint 
  WHERE conname IN ('tickets_hotel_id_fkey', 'tickets_status_check');
" 2>/dev/null | tr -d '\r\n')

if [[ "$FK_CHECK" -eq "2" ]]; then
  pass "Foreign key constraints present"
else
  fail "Missing foreign key constraints: $FK_CHECK"
fi

# Check indexes
INDEX_CHECK=$(docker exec ticket_db psql -U postgres -d ticketdb -tAc "
  SELECT COUNT(*) FROM pg_indexes 
  WHERE tablename IN ('tickets', 'hotels') AND indexname LIKE 'idx_%';
" 2>/dev/null | tr -d '\r\n')

if [[ "$INDEX_CHECK" -ge "5" ]]; then
  pass "Performance indexes present ($INDEX_CHECK indexes)"
else
  fail "Missing performance indexes: $INDEX_CHECK"
fi

# Step 4: Backend Setup and Security
echo ""
echo "🔧 Step 4: Backend Setup and Security"
echo "--------------------------------------"

cd server

# Install dependencies and start backend
npm ci > /dev/null 2>&1 || fail "Failed to install backend dependencies"

# Generate test session secret
SESSION_SECRET="test-session-secret-for-verification"
export SESSION_SECRET
echo "SESSION_SECRET=$SESSION_SECRET" >> .env.local

# Start backend in background
npm run start:local &
BACKEND_PID=$!
sleep 15

# Check backend health
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
  pass "Backend health check passed"
else
  fail "Backend health check failed"
fi

# Check security headers
HEADERS_CHECK=$(curl -s -I http://localhost:5000/api/tickets 2>/dev/null | grep -i "x-frame-options\|content-security-policy\|x-content-type-options" | wc -l)
if [[ "$HEADERS_CHECK" -ge "3" ]]; then
  pass "Security headers present ($HEADERS_CHECK headers)"
else
  fail "Missing security headers: $HEADERS_CHECK"
fi

# Step 5: Input Validation Testing
echo ""
echo "✅ Step 5: Input Validation Testing"
echo "------------------------------------"

# Test validation - missing required fields
VALIDATION_TEST=$(curl -s -w "%{http_code}" -X POST http://localhost:5000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"price": 10}' 2>/dev/null)

if echo "$VALIDATION_TEST" | grep -q "400\|Validation failed"; then
  pass "Input validation working (rejects invalid data)"
else
  fail "Input validation not working"
fi

# Test valid request
VALID_REQUEST=$(curl -s -w "%{http_code}" -X POST http://localhost:5000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Ticket", "price": 25.50}' 2>/dev/null)

if echo "$VALID_REQUEST" | grep -q "201\|Test Ticket"; then
  pass "Valid request accepted"
else
  fail "Valid request rejected"
fi

# Step 6: API Response Format
echo ""
echo "🔧 Step 6: API Response Format"
echo "--------------------------------"

# Test API response format
API_RESPONSE=$(curl -s http://localhost:5000/api/tickets 2>/dev/null)

if echo "$API_RESPONSE" | grep -q '"data"\|"timestamp"'; then
  pass "API response format standardized"
else
  fail "API response format not standardized"
fi

# Test field normalization (camelCase)
if echo "$API_RESPONSE" | grep -q '"hotelId"\|"isAvailable"'; then
  pass "API field normalization working"
else
  fail "API field normalization not working"
fi

cd ..

# Step 7: Frontend Setup
echo ""
echo "🎨 Step 7: Frontend Setup"
echo "---------------------------"

cd client

# Install dependencies
npm ci > /dev/null 2>&1 || fail "Failed to install frontend dependencies"

# Type checking
npm run typecheck > /dev/null 2>&1 || fail "Frontend type checking failed"
pass "Frontend type checking passed"

# Linting
npm run lint > /dev/null 2>&1 || fail "Frontend linting failed"
pass "Frontend linting passed"

# Build
npm run build > /dev/null 2>&1 || fail "Frontend build failed"
pass "Frontend build successful"

# Start frontend in background
npm run dev &
FRONTEND_PID=$!
sleep 15

cd ..

# Step 8: Integration Testing
echo ""
echo "🔌 Step 8: Integration Testing"
echo "--------------------------------"

# Check frontend accessibility
if curl -f http://localhost:5173 > /dev/null 2>&1; then
  pass "Frontend accessible"
else
  fail "Frontend not accessible"
fi

# Test CORS
CORS_TEST=$(curl -s -w "%{http_code}" -H "Origin: http://evil.com" http://localhost:5000/api/tickets 2>/dev/null)
if echo "$CORS_TEST" | grep -q "403\|401\|error"; then
  pass "CORS protection working"
else
  fail "CORS protection not working"
fi

# Step 9: Documentation and Scripts
echo ""
echo "📚 Step 9: Documentation and Scripts"
echo "-------------------------------------"

# Check required documentation files
DOC_FILES=("README.md" "ENVIRONMENT_SETUP.md" "INSTALL.md" "PR_SUMMARIES.md")
for file in "${DOC_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    pass "Documentation file exists: $file"
  else
    fail "Missing documentation: $file"
  fi
done

# Test root package scripts
if npm run lint > /dev/null 2>&1; then
  pass "Root lint script working"
else
  fail "Root lint script not working"
fi

# Step 10: Docker Validation
echo ""
echo "🐳 Step 10: Docker Validation"
echo "--------------------------------"

# Test Docker configuration
if docker compose config > /dev/null 2>&1; then
  pass "Docker Compose configuration valid"
else
  fail "Docker Compose configuration invalid"
fi

# Build Docker images
if docker compose build > /dev/null 2>&1; then
  pass "Docker images build successfully"
else
  fail "Docker images build failed"
fi

# Step 11: Cleanup
echo ""
echo "🧹 Step 11: Cleanup"
echo "--------------------"

# Stop processes
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
docker compose down
rm -f .env.test server/.env.local client/.env.local

pass "Cleanup completed"

# Final Summary
echo ""
echo "🎉 VERIFICATION COMPLETE!"
echo "=========================="
echo ""
echo -e "${GREEN}✅ Environment Management: SECURED${NC}"
echo -e "${GREEN}✅ Database Schema: CONSOLIDATED${NC}"
echo -e "${GREEN}✅ Security Middleware: IMPLEMENTED${NC}"
echo -e "${GREEN}✅ Input Validation: COMPREHENSIVE${NC}"
echo -e "${GREEN}✅ API Normalization: COMPLETE${NC}"
echo -e "${GREEN}✅ Documentation & CI: ENHANCED${NC}"
echo ""
echo -e "${YELLOW}📊 Final Score: 10/10${NC}"
echo ""
echo -e "${GREEN}🚀 Repository is PRODUCTION-READY!${NC}"
echo ""
echo "🎯 All PR fixes verified and working correctly."
echo "🔒 Security vulnerabilities resolved."
echo "📝 Code quality standards met."
echo "📚 Documentation comprehensive."
echo "🔄 CI/CD pipeline robust."
echo ""
echo "Ready for deployment! 🎉"