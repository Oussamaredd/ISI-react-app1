#!/bin/bash

# Production Health Check Script
# This script checks the health of the deployed application

set -e

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-/api/health}"
LIVENESS_ENDPOINT="${LIVENESS_ENDPOINT:-/api/health/liveness}"
READINESS_ENDPOINT="${READINESS_ENDPOINT:-/api/health/readiness}"
TIMEOUT="${TIMEOUT:-30}"
RETRY_COUNT="${RETRY_COUNT:-3}"
RETRY_DELAY="${RETRY_DELAY:-5}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Health check function
check_endpoint() {
    local endpoint="$1"
    local description="$2"
    local expected_status="${3:-200}"
    
    print_info "Checking $description..."
    
    local attempt=1
    local success=false
    
    while [ $attempt -le $RETRY_COUNT ]; do
        if curl -f -s -m $TIMEOUT -o /dev/null -w "%{http_code}" "$APP_URL$endpoint" | grep -q "$expected_status"; then
            print_status "$description is healthy (attempt $attempt/$RETRY_COUNT)"
            success=true
            break
        else
            print_warning "$description check failed (attempt $attempt/$RETRY_COUNT)"
            if [ $attempt -lt $RETRY_COUNT ]; then
                print_info "Waiting $RETRY_DELAY seconds before retry..."
                sleep $RETRY_DELAY
            fi
        fi
        attempt=$((attempt + 1))
    done
    
    if [ "$success" = false ]; then
        print_error "$description is unhealthy after $RETRY_COUNT attempts"
        return 1
    fi
    
    return 0
}

# Detailed health check
detailed_health_check() {
    print_info "Performing detailed health check..."
    
    local response=$(curl -s -m $TIMEOUT "$APP_URL$HEALTH_ENDPOINT" 2>/dev/null || echo '{"status":"error"}')
    
    # Check overall status
    local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    case "$status" in
        "healthy")
            print_status "Application is healthy"
            ;;
        "degraded")
            print_warning "Application is degraded"
            ;;
        "unhealthy")
            print_error "Application is unhealthy"
            return 1
            ;;
        *)
            print_error "Could not determine application status"
            print_error "Response: $response"
            return 1
            ;;
    esac
    
    # Check individual components
    print_info "Checking individual components..."
    
    # Database
    local db_status=$(echo "$response" | grep -o '"database":{"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$db_status" = "healthy" ]; then
        print_status "Database: $db_status"
    else
        print_warning "Database: $db_status"
    fi
    
    # Redis
    local redis_status=$(echo "$response" | grep -o '"redis":{"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$redis_status" = "healthy" ]; then
        print_status "Redis: $redis_status"
    else
        print_warning "Redis: $redis_status"
    fi
    
    # Memory
    local memory_status=$(echo "$response" | grep -o '"memory":{"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$memory_status" = "healthy" ]; then
        print_status "Memory: $memory_status"
    else
        print_warning "Memory: $memory_status"
    fi
    
    # Show uptime and version
    local uptime=$(echo "$response" | grep -o '"uptime":[0-9]*' | cut -d':' -f2)
    local version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$uptime" ]; then
        local uptime_seconds=$((uptime / 1000))
        local uptime_formatted=$(printf '%02d:%02d:%02d' $((uptime_seconds/3600)) $((uptime_seconds%3600/60)) $((uptime_seconds%60)))
        print_info "Uptime: $uptime_formatted"
    fi
    
    if [ -n "$version" ]; then
        print_info "Version: $version"
    fi
    
    return 0
}

# Load test
load_test() {
    print_info "Performing simple load test..."
    
    local concurrent_requests=10
    local total_requests=100
    local success_count=0
    
    for i in $(seq 1 $total_requests); do
        if curl -f -s -m $TIMEOUT -o /dev/null "$APP_URL$HEALTH_ENDPOINT" && \
           curl -f -s -m $TIMEOUT -o /dev/null "$APP_URL$LIVENESS_ENDPOINT" && \
           curl -f -s -m $TIMEOUT -o /dev/null "$APP_URL$READINESS_ENDPOINT"; then
            success_count=$((success_count + 1))
        fi
        
        # Simple concurrency control
        if [ $((i % concurrent_requests)) -eq 0 ]; then
            sleep 1
        fi
    done
    
    local success_rate=$((success_count * 100 / total_requests))
    
    if [ $success_rate -ge 95 ]; then
        print_status "Load test passed: $success_count/$total_requests requests successful ($success_rate%)"
    elif [ $success_rate -ge 80 ]; then
        print_warning "Load test degraded: $success_count/$total_requests requests successful ($success_rate%)"
    else
        print_error "Load test failed: $success_count/$total_requests requests successful ($success_rate%)"
        return 1
    fi
}

# Check Docker containers (if running in Docker)
check_docker_containers() {
    if command -v docker &> /dev/null; then
        print_info "Checking Docker containers..."
        
        local containers=("ticketapp-prod" "ticketapp-postgres-prod" "ticketapp-redis-prod")
        
        for container in "${containers[@]}"; do
            if docker ps --format "table {{.Names}}" | grep -q "$container"; then
                local status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
                local health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
                
                if [ "$status" = "running" ]; then
                    if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
                        print_status "Container $container: running ($health)"
                    else
                        print_warning "Container $container: running but unhealthy ($health)"
                    fi
                else
                    print_error "Container $container: $status"
                    return 1
                fi
            else
                print_warning "Container $container: not found or not running"
            fi
        done
    else
        print_info "Docker not available, skipping container checks"
    fi
}

# Show help
show_help() {
    cat << EOF
Production Health Check Script

Usage: $0 [options]

Environment Variables:
    APP_URL               Application URL (default: http://localhost:3000)
    HEALTH_ENDPOINT       Health check endpoint (default: /api/health)
    LIVENESS_ENDPOINT     Liveness probe endpoint (default: /api/health/liveness)
    READINESS_ENDPOINT    Readiness probe endpoint (default: /api/health/readiness)
    TIMEOUT               Request timeout in seconds (default: 30)
    RETRY_COUNT           Number of retry attempts (default: 3)
    RETRY_DELAY           Delay between retries in seconds (default: 5)

Options:
    --quick               Quick health check only
    --detailed            Detailed health check with component status
    --load                Include load test
    --docker              Check Docker containers
    --all                 Run all checks (default)
    --help                Show this help message

Examples:
    $0                           # Run all health checks
    $0 --quick                    # Quick health check only
    $0 --detailed                 # Detailed health check
    $0 --load                     # Health check with load test
    APP_URL=https://app.example.com $0    # Check remote application

EOF
}

# Main execution
main() {
    local quick=false
    local detailed=false
    local load=false
    local docker=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --quick)
                quick=true
                shift
                ;;
            --detailed)
                detailed=true
                shift
                ;;
            --load)
                load=true
                shift
                ;;
            --docker)
                docker=true
                shift
                ;;
            --all)
                detailed=true
                load=true
                docker=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Default to all checks if no specific option provided
    if [ "$quick" = false ] && [ "$detailed" = false ] && [ "$load" = false ] && [ "$docker" = false ]; then
        detailed=true
        load=true
        docker=true
    fi
    
    print_status "Starting health check for $APP_URL"
    echo
    
    # Basic health checks
    check_endpoint "$HEALTH_ENDPOINT" "Health endpoint"
    check_endpoint "$LIVENESS_ENDPOINT" "Liveness probe"
    check_endpoint "$READINESS_ENDPOINT" "Readiness probe"
    
    if [ "$detailed" = true ]; then
        echo
        detailed_health_check
    fi
    
    if [ "$load" = true ]; then
        echo
        load_test
    fi
    
    if [ "$docker" = true ]; then
        echo
        check_docker_containers
    fi
    
    echo
    print_status "Health check completed"
}

# Run main function
main "$@"