# Portfolio Monorepo Audit Report

## Executive Summary

This audit examined the ISI-react-app1 portfolio monorepo, a full-stack ticket management application with React frontend, Node.js backend, and comprehensive observability stack. The project demonstrates strong technical architecture but requires attention to security, schema consistency, and deployment readiness before being portfolio-ready.

## 1. Runtime Stack Inventory

### Client Stack
- **Framework**: React 18.3.1 + Vite 5.4.8
- **Language**: TypeScript 5.9.3
- **Testing**: Vitest 4.0.10 + Testing Library
- **Build**: Vite with Nginx deployment
- **Deployment**: GitHub Pages (via CD workflow)

### Server Stack
- **Runtime**: Node.js 20 + Express 5.1.0
- **Authentication**: Passport.js with Google OAuth 2.0
- **Database**: PostgreSQL 15 (via pg library)
- **Session Management**: express-session
- **Testing**: Jest 30.2.0 + Supertest

### Database
- **Engine**: PostgreSQL 15
- **Schema**: Tickets and Hotels tables with foreign key relationships
- **Initialization**: SQL scripts in infra/init.sql

### Docker Compose Services
- **db**: PostgreSQL 15 (port 5432)
- **backend**: Node.js API (port 5000)
- **frontend**: Nginx + React build (port 3000)
- **sonarqube**: Code analysis (port 9000)
- **prometheus**: Metrics collection (port 9090)
- **grafana**: Visualization (port 3030)
- **elasticsearch**: Search engine (port 9200)
- **logstash**: Log processing (port 5044, 5001)
- **kibana**: Log visualization (port 5601)

### CI/CD Workflows
- **CI.yml**: Frontend/backend testing, linting, SonarQube analysis
- **CD.yml**: Frontend deployment to GitHub Pages
- **Triggers**: Push/PR to main branch
- **Requirements**: Self-hosted runner for SonarQube

## 2. Environment Variables Analysis

### Client Environment Variables
```bash
# client/.env.local
VITE_API_BASE_URL=http://localhost:5000    # API endpoint
VITE_BASE=/                                 # Build base path
```

### Server Environment Variables
```bash
# server/.env.local
PORT=5000                                    # Server port
NODE_ENV=development                         # Environment
SESSION_SECRET=                              # Session security
DB_USER=postgres                             # Database user
DB_PASSWORD=postgres                         # Database password
DB_HOST=db                                   # Database host
DB_NAME=ticketdb                             # Database name
DB_PORT=5432                                 # Database port
GOOGLE_CLIENT_ID=                           # OAuth client ID
GOOGLE_CLIENT_SECRET=                        # OAuth client secret
GOOGLE_CALLBACK_URL=                         # OAuth callback
CLIENT_ORIGIN=                               # Frontend origin
CORS_ORIGINS=                                # Allowed origins
TELEGRAM_BOT_TOKEN=                          # Alert bot token
TELEGRAM_CHAT_ID=                            # Alert chat ID
ENABLE_LOGSTASH=false                        # ELK integration
LOGSTASH_HOST=logstash                       # Logstash host
LOGSTASH_PORT=5001                           # Logstash port
ELASTIC_URL=http://elasticsearch:9200       # Elasticsearch URL
```

### Docker Compose Variables
```bash
# .env (root)
POSTGRES_USER=postgres                       # DB user
POSTGRES_PASSWORD=postgres                    # DB password
POSTGRES_DB=ticketdb                         # DB name
```

### Variable References
- **Client**: `import.meta.env.VITE_*` (3 locations)
- **Server**: `process.env.*` (56 locations across 12 files)
- **Docker**: Variable substitution in docker-compose.yml

## 3. Definition of Done Checklist

### Security ✅
- [ ] All secrets moved to secure vault (no hardcoded credentials)
- [ ] Session security hardened (timeout, secure flags)
- [ ] Input validation implemented on all endpoints
- [ ] SQL injection protection verified
- [ ] XSS protection implemented
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Security headers added (HSTS, CSP, etc.)

### Correctness ✅
- [ ] All unit tests passing (>80% coverage)
- [ ] Integration tests for API endpoints
- [ ] Database schema consistency verified
- [ ] Error handling implemented
- [ ] Input validation covers all edge cases
- [ ] Transaction integrity verified
- [ ] Data type consistency enforced

### Developer Experience ✅
- [ ] Local development setup documented
- [ ] Environment configuration automated
- [ ] Code formatting enforced (Prettier/ESLint)
- [ ] Type checking enabled (no TypeScript errors)
- [ ] Hot reload working
- [ ] Debugging configuration provided
- [ ] API documentation available

### Documentation ✅
- [ ] README with quick start guide
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Database schema documentation
- [ ] Deployment guide
- [ ] Environment setup guide
- [ ] Contributing guidelines
- [ ] Architecture documentation

### Demo & Deployment ✅
- [ ] Docker containers build successfully
- [ ] Docker Compose starts all services
- [ ] Health checks implemented
- [ ] Production deployment tested
- [ ] Monitoring dashboards configured
- [ ] Backup/restore procedures documented
- [ ] Demo data available for testing

### Performance ✅
- [ ] Database indexes optimized
- [ ] API response times <200ms
- [ ] Frontend bundle size optimized
- [ ] Image optimization implemented
- [ ] Caching strategy implemented
- [ ] CDN configuration tested
- [ ] Memory usage optimized

## 4. Risks and Bugs (Ordered by Severity)

### 🔴 Critical Risks

1. **Exposed Secrets in Environment Files**
   - **Location**: `.env`, `.env.docker`
   - **Issue**: Google OAuth credentials, session secrets hardcoded
   - **Impact**: Complete authentication bypass possible
   - **Verification**: Check for non-empty values in env files

2. **Missing Foreign Key Constraints**
   - **Location**: `server/src/index.js` schema creation
   - **Issue**: Runtime schema missing FK constraints present in init.sql
   - **Impact**: Data integrity corruption possible
   - **Verification**: Compare `\d tickets` output with init.sql

3. **Database Schema Inconsistency**
   - **Location**: Dual schema definitions (init.sql vs index.js)
   - **Issue**: Different constraints between initialization methods
   - **Impact**: Production data integrity issues
   - **Verification**: `docker compose up` vs fresh DB init

### 🟡 High Risks

4. **Weak Session Security**
   - **Location**: `server/src/index.js:46-59`
   - **Issue**: No session timeout, missing secure flags
   - **Impact**: Session hijacking possible
   - **Verification**: Check session cookie settings

5. **Insufficient Input Validation**
   - **Location**: `server/src/controllers/ticketController.js`
   - **Issue**: Basic presence validation only
   - **Impact**: Invalid data entry, potential XSS
   - **Verification**: Test with malformed input

6. **Hardcoded URLs in Client Code**
   - **Location**: Multiple client components
   - **Issue**: Fallback URLs assume localhost:5000
   - **Impact**: Production deployment failures
   - **Verification**: Check network requests in browser

### 🟢 Medium Risks

7. **Missing Database Indexes**
   - **Location**: Schema definition
   - **Issue**: No indexes on frequently queried columns
   - **Impact**: Poor query performance
   - **Verification**: `EXPLAIN ANALYZE` on queries

8. **Information Disclosure**
   - **Location**: 50+ console.log statements
   - **Issue**: Internal details exposed in logs
   - **Impact**: Information leakage
   - **Verification**: Check browser console/network

9. **Field Name Inconsistencies**
   - **Location**: Client-server API contract
   - **Issue**: name/title, hotel_id/hotelId mismatches
   - **Impact**: Client-side mapping errors
   - **Verification**: API response vs client expectations

### 🟢 Low Risks

10. **Dependency Vulnerabilities**
    - **Location**: client/package.json
    - **Issue**: 2 moderate severity vulnerabilities
    - **Impact**: Potential security exploits
    - **Verification**: `npm audit`

## 5. Test Plan - "How to Verify Locally in 10 Minutes"

### Prerequisites
```bash
# Clone and setup
git clone https://github.com/Oussamaredd/ISI-react-app1
cd ISI-react-app1
docker compose --version
node --version
npm --version
```

### Quick Verification Steps

#### 1. Infrastructure Health (2 minutes)
```bash
# Start all services
docker compose up -d

# Check service status
docker compose ps
curl http://localhost:5432  # PostgreSQL
curl http://localhost:5000/health  # Backend
curl http://localhost:3000  # Frontend
```

#### 2. Database Schema Verification (1 minute)
```bash
# Connect to database
docker exec -it ticket_db psql -U postgres -d ticketdb

# Verify schema
\d tickets
\d hotels

# Check constraints
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'tickets'::regclass;
```

#### 3. Authentication Flow (2 minutes)
```bash
# Test Google OAuth
curl http://localhost:5000/auth/google

# Verify session creation
curl -c cookies.txt http://localhost:5000/api/tickets
curl -b cookies.txt http://localhost:5000/api/tickets
```

#### 4. API Endpoints (2 minutes)
```bash
# Test CRUD operations
curl -X POST http://localhost:5000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Ticket","price":10.00}'

curl http://localhost:5000/api/tickets
curl http://localhost:5000/api/hotels
```

#### 5. Frontend Integration (2 minutes)
```bash
# Open browser and test
# 1. Visit http://localhost:3000
# 2. Click Google Login
# 3. Create/view tickets
# 4. Verify hotel associations
```

#### 6. Monitoring Stack (1 minute)
```bash
# Verify monitoring services
curl http://localhost:9090  # Prometheus
curl http://localhost:3030  # Grafana
curl http://localhost:5601  # Kibana
```

### Success Criteria
- ✅ All Docker services running
- ✅ Database schema matches init.sql
- ✅ Google OAuth redirects properly
- ✅ CRUD operations functional
- ✅ Frontend loads and interacts
- ✅ Monitoring dashboards accessible

### Failure Indicators
- ❌ Service startup failures
- ❌ Database connection errors
- ❌ OAuth redirect loops
- ❌ CORS errors in browser
- ❌ Missing foreign key constraints
- ❌ Console errors in frontend

## Recommendations

### Immediate Actions (24-48 hours)
1. Revoke all exposed OAuth credentials
2. Implement proper secret management
3. Fix database schema consistency
4. Add missing foreign key constraints

### Short-term (1 week)
1. Implement comprehensive input validation
2. Add session security configurations
3. Standardize API field naming
4. Add database indexes

### Long-term (1 month)
1. Implement proper migration system
2. Add comprehensive test suite
3. Enhance monitoring and alerting
4. Document deployment procedures

## Overall Assessment

**Score: 6/10** - Strong architecture with significant security and consistency issues. The project demonstrates excellent technical scope and modern development practices, but requires immediate attention to security hardening and data integrity before production deployment.

**Portfolio Readiness**: With the critical security issues resolved and schema consistency fixed, this project would be an excellent portfolio piece demonstrating full-stack development, DevOps practices, and observability implementation.