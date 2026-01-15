# Ticket Management System

A comprehensive ticket management application built with React, Node.js, and PostgreSQL, featuring Google OAuth authentication, real-time updates, and enterprise-grade security.

## 🚀 **Production-Ready Features**

### **✅ Core Application**
- **Authentication**: Google OAuth with secure session management
- **Ticket Management**: Full CRUD operations with comments and attachments
- **Hotel Management**: Multi-tenant hotel support with analytics
- **Admin Dashboard**: Comprehensive administration interface
- **Real-time Updates**: Live notifications and status changes

### **✅ Security & Performance**
- **Multi-layered Security**: Rate limiting, CSRF protection, input validation
- **Performance Monitoring**: Real-time metrics and Core Web Vitals
- **Caching Strategy**: Redis-based caching with intelligent invalidation
- **Database Optimization**: Indexed queries and connection pooling

### **✅ Production Deployment**
- **Docker Containers**: Multi-stage builds with production optimizations
- **CI/CD Pipeline**: Automated testing, building, and deployment
- **Health Checks**: Comprehensive monitoring with Prometheus/Grafana
- **Database Migrations**: Safe, versioned schema management

## 📁 **Project Structure**

```
react-app1/
├── apps/
│   ├── client/                 # React frontend application
│   └── server/                 # Node.js API backend
├── shared/                     # Shared utilities and types
├── scripts/                    # Deployment and management scripts
├── monitoring/                 # Monitoring configuration
├── migrations/                 # Database migration files
├── docker-compose.*.yml        # Environment-specific Docker configs
└── .github/workflows/          # CI/CD pipeline definitions
```

## 🛠 **Technology Stack**

### **Frontend**
- **React 18** with TypeScript
- **React Query** for data fetching and caching
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Router** for navigation

### **Backend**
- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** with connection pooling
- **Redis** for caching and sessions
- **Passport.js** for authentication

### **Infrastructure**
- **Docker** for containerization
- **GitHub Actions** for CI/CD
- **Prometheus** for metrics collection
- **Grafana** for monitoring dashboards
- **Nginx** for reverse proxy

## 🚀 **Quick Start**

### **Development Setup**

1. **Clone and Install**
```bash
git clone <repository-url>
cd react-app1
npm install
```

2. **Environment Configuration**
```bash
# Initialize development environment
./scripts/manage-env.sh init-dev

# Or on Windows
scripts\manage-env.bat init-dev
```

3. **Start Development Servers**
```bash
npm run dev
```

4. **Access Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Health Check: http://localhost:3000/api/health

### **Production Deployment**

1. **Environment Setup**
```bash
# Initialize production environment
./scripts/manage-env.sh init-prod
```

2. **Database Setup**
```bash
# Run database migrations
./scripts/migrate.sh up
```

3. **Deploy with Docker**
```bash
# Production deployment
docker-compose -f docker-compose.production.yml up -d

# Staging deployment
docker-compose -f docker-compose.staging.yml up -d
```

## 📊 **Monitoring & Health**

### **Health Checks**
```bash
# Comprehensive health check
./scripts/health-check.sh --all

# Quick check
./scripts/health-check.sh --quick

# Load testing
./scripts/health-check.sh --load
```

### **Monitoring Dashboards**
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Application Metrics**: http://localhost:3000/api/metrics

## 🔧 **Configuration Management**

### **Environment Files**
- `.env.development` - Development settings
- `.env.staging` - Staging configuration
- `.env.production` - Production configuration
- `.env.local` - Local overrides

### **Key Configuration**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_SECRET=your-32-char-secret

# Redis
REDIS_URL=redis://localhost:6379

# Application
APP_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
```

## 🗄 **Database Management**

### **Migrations**
```bash
# Run pending migrations
./scripts/migrate.sh up

# Check migration status
./scripts/migrate.sh status

# Create new migration
./scripts/migrate.sh create add_new_table

# Rollback migration
./scripts/migrate.sh rollback 20231201_120000_add_table
```

### **Database Schema**
- **Users**: Authentication and role management
- **Hotels**: Multi-tenant hotel management
- **Tickets**: Core ticket management with workflow
- **Comments**: Threaded discussions on tickets
- **Attachments**: File management with security
- **Audit Logs**: Complete activity tracking

## 🔒 **Security Features**

### **Authentication & Authorization**
- Google OAuth integration
- Role-based access control (RBAC)
- Secure session management
- JWT token authentication

### **Input Validation & Sanitization**
- XSS prevention
- SQL injection protection
- CSRF token validation
- Rate limiting per IP/user

### **Data Protection**
- Encrypted sensitive data
- Secure file upload handling
- Audit logging for all actions
- GDPR compliance features

## 📈 **Performance Features**

### **Caching Strategy**
- Redis-based caching
- Query result caching
- Session caching
- Cache invalidation on updates

### **Database Optimization**
- Indexed queries
- Connection pooling
- Query optimization
- Performance monitoring

### **Frontend Performance**
- Code splitting
- Lazy loading
- Image optimization
- Core Web Vitals monitoring

## 🧪 **Testing**

### **Test Suites**
```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### **Security Testing**
```bash
# Security audit
npm audit

# Security scanning
npm run test:security

# Load testing
npm run test:performance
```

## 📚 **API Documentation**

### **Documentation**
- **API Reference**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Interactive Docs**: Available at `/api/docs` (when enabled)
- **OpenAPI Specification**: Available at `/api/openapi.json`

### **Key Endpoints**
- Authentication: `/auth/*`
- Tickets: `/tickets/*`
- Hotels: `/hotels/*`
- Admin: `/admin/*`
- Health: `/health/*`

## 🔧 **Development Scripts**

### **Available Scripts**
```bash
# Development
npm run dev              # Start development servers
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed development data
npm run db:reset         # Reset database

# Testing
npm run test             # Run all tests
npm run lint             # Run linting
npm run type-check       # TypeScript validation

# Production
npm run deploy:staging   # Deploy to staging
npm run deploy:prod      # Deploy to production
```

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Database Connection**
```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1;"

# Reset migrations
./scripts/migrate.sh rollback all
./scripts/migrate.sh up
```

2. **Authentication Issues**
```bash
# Check Google OAuth setup
curl https://accounts.google.com/.well-known/openid_configuration

# Clear sessions
redis-cli FLUSHALL
```

3. **Performance Issues**
```bash
# Check system resources
./scripts/health-check.sh --docker

# Monitor database
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"
```

## 📋 **Checklists**

### **Pre-deployment Checklist**
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Health checks passing
- [ ] Security audit completed
- [ ] Performance tests passing
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Documentation updated

### **Production Health Monitoring**
- [ ] Application health endpoint
- [ ] Database performance
- [ ] Redis connectivity
- [ ] Memory usage
- [ ] Disk space
- [ ] Error rates
- [ ] Response times

## 🤝 **Contributing**

### **Development Workflow**
1. Create feature branch from `develop`
2. Implement changes with tests
3. Run test suite and linting
4. Submit pull request to `develop`
5. Review and merge
6. Deploy to staging for testing
7. Merge to `main` for production

### **Code Standards**
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Conventional commits for messages
- Test coverage > 80%

## 📞 **Support**

### **Resources**
- **Documentation**: See inline documentation
- **API Reference**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Health Status**: `/api/health`
- **Metrics**: `/api/metrics`

### **Emergency Contacts**
- **Technical Support**: tech-support@yourdomain.com
- **Security Issues**: security@yourdomain.com
- **Production Issues**: ops@yourdomain.com

---

## 🎉 **Ready for Production**

This application is **production-ready** with:
- ✅ **Enterprise-grade security**
- ✅ **Comprehensive monitoring**
- ✅ **Automated deployment**
- ✅ **Performance optimization**
- ✅ **Complete documentation**
- ✅ **Health checks and alerts**
- ✅ **Database migration management**
- ✅ **Scalable architecture**

**Status: DEPLOYMENT READY** 🚀

Built with ❤️ for scalable, secure, and maintainable ticket management.