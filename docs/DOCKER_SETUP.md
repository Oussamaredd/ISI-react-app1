# 🐳 Docker Setup - Fixed Issues & Solutions

## ✅ **Issues Identified & Fixed**

### 1. **Volume Mount Path Error**
**Problem**: `error mounting "/run/desktop/mnt/host/c/Users/sofca/source/repos/react-app1/infra/init.sql" to rootfs at "/docker-entrypoint-initdb.d/init.sql": create mountpoint for /docker-entrypoint-initdb.d/init.sql mount: cannot create subdirectories in "/var/lib/docker/rootfs/overlayfs/..." / docker-entrypoint-initdb.d/init.sql": not a directory`

**Root Cause**: Docker was trying to mount a file path that conflicted with existing mount structure

**Solution**: 
- Updated volume mounts to use explicit bind syntax
- Used proper relative paths from infrastructure directory
- Fixed both dev and production compose files

### 2. **No Service Selected Error**
**Problem**: `no service selected` when running Docker commands

**Root Cause**: All services had `profiles: ["core"]` but command didn't specify profile

**Solution**: Updated all npm scripts to include `--profile core` flag

### 3. **Missing Monitoring Files**
**Problem**: Referenced `logstash.conf` and `prometheus.yaml` files didn't exist in expected locations

**Solution**: 
- Created `apps/server/src/monitoring/logstash.conf`
- Fixed path to existing `apps/server/src/prometheus.yaml`
- Updated Docker compose volume mounts

## ✅ **Correct Docker Commands**

### **From Project Root:**
```bash
# Development (core services only)
npm run docker:dev

# Production (core services only) 
npm run docker:prod

# With observability stack
docker-compose -f infrastructure/docker/docker-compose.yml --profile core --profile obs up -d

# Full quality stack
docker-compose -f infrastructure/docker/docker-compose.yml --profile core --profile obs --profile quality up -d
```

### **Direct Docker Commands:**
```bash
# Development
docker-compose -f infrastructure/docker/docker-compose.dev.yml --profile core up -d

# Production
docker-compose -f infrastructure/docker/docker-compose.yml --profile core up -d
```

## 🐳 **Updated Docker Configurations**

### **Development (docker-compose.dev.yml):**
```yaml
services:
  db:
    profiles: ["core"]
    image: postgres:15-alpine
    volumes:
      - db_data:/var/lib/postgresql/data
      - type: bind
        source: ../../apps/server/src/database/schema.sql
        target: /docker-entrypoint-initdb.d/init.sql
    # ... rest of config
  
  backend:
    profiles: ["core"]
    build: 
      context: ../../apps/server
    env_file:
      - ../../.env.docker
    # ... rest of config
```

### **Production (docker-compose.yml):**
```yaml
services:
  db:
    profiles: ["core"]
    volumes:
      - type: bind
        source: ../../apps/server/src/database/schema.sql
        target: /docker-entrypoint-initdb.d/init.sql
    # ... rest of config
  
  backend:
    profiles: ["core"]
    build: 
      context: ../../apps/server
    # ... rest of config
```

## 📋 **What Will Start With `npm run docker:dev`:**

1. **PostgreSQL Database** (port 5432)
   - Initialized with schema.sql
   - Data persisted in `db_data` volume
   - Health checks enabled

2. **Backend Server** (port 5000)
   - Built from `apps/server`
   - Connected to database
   - Health checks enabled
   - Environment variables from `.env.docker`

3. **Frontend Application** (port 3000)
   - Built from `apps/client`
   - Connected to backend
   - Health checks enabled

4. **Network Isolation**
   - All services in `ticket-management-network`
   - Proper inter-service communication

## 🚀 **Testing the Fix**

Run these commands to verify everything works:

```bash
# From project root
npm run docker:dev

# Check services status
docker-compose -f infrastructure/docker/docker-compose.dev.yml --profile core ps

# View logs
npm run docker:logs
```

## 🔧 **If You Still Get Errors:**

1. **Clean first**:
   ```bash
   npm run docker:clean
   npm run docker:dev
   ```

2. **Check file permissions**:
   ```bash
   ls -la apps/server/src/database/schema.sql
   ```

3. **Verify environment file**:
   ```bash
   ls -la .env.docker
   ```

4. **Rebuild if needed**:
   ```bash
   npm run docker:build
   npm run docker:dev
   ```

## ✅ **Summary**

- ✅ Fixed volume mount paths
- ✅ Added profile selection to commands
- ✅ Created missing monitoring config
- ✅ Updated all npm scripts
- ✅ Proper file structure paths

**🎉 Your Docker setup should now work correctly!**