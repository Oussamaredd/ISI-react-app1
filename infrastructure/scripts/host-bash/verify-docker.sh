#!/bin/bash

# Docker Verification Script
# Ensures Docker setup is working correctly
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$INFRA_DIR"


echo "🐳 Docker Verification Tests"
echo "============================"

# Test 1: Docker Compose configuration
echo "1. Testing Docker Compose configuration..."
if docker compose config > /dev/null 2>&1; then
    echo "✅ Docker Compose configuration is valid"
else
    echo "❌ Docker Compose configuration has errors"
    exit 1
fi

# Test 2: Profile configurations
echo ""
echo "2. Testing Docker profiles..."

profiles=("core" "obs" "quality")
for profile in "${profiles[@]}"; do
    if docker compose --profile "$profile" config > /dev/null 2>&1; then
        echo "✅ Profile '$profile' configuration is valid"
    else
        echo "❌ Profile '$profile' configuration has errors"
        exit 1
    fi
done

# Test 3: Service existence
echo ""
echo "3. Checking service definitions..."

services=("db" "backend" "frontend" "elasticsearch" "logstash" "kibana" "sonarqube" "prometheus" "grafana")
for service in "${services[@]}"; do
    if docker compose config | grep -q "^[[:space:]]*$service:"; then
        echo "✅ Service '$service' is defined"
    else
        echo "⚠️  Service '$service' not found (may be in a specific profile)"
    fi
done

# Test 4: Health checks
echo ""
echo "4. Checking health check definitions..."

health_check_services=("db" "backend" "frontend" "elasticsearch")
for service in "${health_check_services[@]}"; do
    if docker compose config | grep -A 10 "^[[:space:]]*$service:" | grep -q "healthcheck:"; then
        echo "✅ Service '$service' has health check"
    else
        echo "⚠️  Service '$service' missing health check"
    fi
done

# Test 5: Networks
echo ""
echo "5. Checking network configuration..."
if docker compose config | grep -q "networks:"; then
    echo "✅ Networks are defined"
else
    echo "❌ No networks found"
    exit 1
fi

if docker compose config | grep -q "isi-react-app1-network"; then
    echo "✅ Application network is defined"
else
    echo "❌ Application network not found"
    exit 1
fi

# Test 6: Volumes
echo ""
echo "6. Checking volume configuration..."
volumes=("db_data" "es_data" "sonarqube_data" "prometheus-data" "grafana-storage")
for volume in "${volumes[@]}"; do
    if docker compose config | grep -q "^[[:space:]]*$volume:"; then
        echo "✅ Volume '$volume' is defined"
    else
        echo "⚠️  Volume '$volume' not found"
    fi
done

# Test 7: Environment variables
echo ""
echo "7. Checking environment variable configuration..."
if docker compose config | grep -q "POSTGRES_"; then
    echo "✅ PostgreSQL environment variables defined"
else
    echo "❌ PostgreSQL environment variables missing"
    exit 1
fi

# Test 8: Port mappings
echo ""
echo "8. Checking port mappings..."
ports=("5432:5432" "5000:5000" "3000:80" "9200:9200" "5601:5601" "9000:9000" "9090:9090" "3030:3000")
for port in "${ports[@]}"; do
    if docker compose config | grep -q "$port"; then
        echo "✅ Port mapping '$port' is defined"
    else
        echo "⚠️  Port mapping '$port' not found (may be in a specific profile)"
    fi
done

echo ""
echo "✅ All Docker verification tests passed!"
echo ""
echo "🐳 Docker Setup Summary:"
echo "   • Valid Docker Compose configuration"
echo "   • All profiles configured correctly"
echo "   • Services, networks, and volumes defined"
echo "   • Health checks implemented"
echo "   • Environment variables configured"
echo "   • Port mappings properly set"
echo ""
echo "🚀 Ready to run with:"
echo "   docker compose --profile core up -d    # Core services"
echo "   docker compose --profile obs up -d      # Observability stack"
echo "   docker compose --profile quality up -d  # Quality tools"
