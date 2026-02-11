#!/bin/bash

# Environment Variable Management Script
# Usage: ./scripts/host-bash/manage-env.sh [command] [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

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

# Check if required tools are installed
check_dependencies() {
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL is required but not installed. Please install OpenSSL."
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. Some features may not work."
    fi
}

# Generate secure random string
generate_secret() {
    local length=${1:-32}
    openssl rand -hex "$length"
}

# Validate environment file
validate_env_file() {
    local env_file="$1"
    
    if [[ ! -f "$env_file" ]]; then
        print_error "Environment file '$env_file' does not exist."
        return 1
    fi

    # Check for required variables
    local required_vars=("SESSION_SECRET" "JWT_SECRET" "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET")
    local missing_vars=()

    while IFS= read -r line; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue

        # Extract variable name
        if [[ "$line" =~ ^([^=]+)= ]]; then
            var_name="${BASH_REMATCH[1]}"
            for required_var in "${required_vars[@]}"; do
                if [[ "$var_name" == "$required_var" ]]; then
                    # Remove from missing vars if found
                    missing_vars=("${missing_vars[@]/$required_var}")
                fi
            done
        fi
    done < "$env_file"

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi

    # Check secret lengths
    while IFS= read -r line; do
        if [[ "$line" =~ ^(SESSION_SECRET|JWT_SECRET)= ]]; then
            secret_value="${line#*=}"
            if [[ ${#secret_value} -lt 32 ]]; then
                print_warning "Secret ${line%%=*} should be at least 32 characters long"
            fi
        fi
    done < "$env_file"

    print_status "Environment file '$env_file' is valid"
    return 0
}

# Initialize environment for development
init_dev() {
    print_info "Initializing development environment..."
    
    local env_file="$PROJECT_DIR/.env.development"
    
    if [[ -f "$env_file" ]]; then
        print_warning "Development environment file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi

    # Generate secrets
    local session_secret=$(generate_secret)
    local jwt_secret=$(generate_secret)

    # Copy template and replace secrets
    cp "$PROJECT_DIR/.env.example" "$env_file"
    sed -i.bak "s/your-32-character-session-secret-minimum/$session_secret/g" "$env_file"
    sed -i "s/your-32-character-jwt-secret-minimum/$jwt_secret/g" "$env_file"
    rm "$env_file.bak"

    print_status "Development environment initialized"
    print_warning "Please update the following variables in $env_file:"
    print_warning "  - GOOGLE_CLIENT_ID"
    print_warning "  - GOOGLE_CLIENT_SECRET"
    print_warning "  - DATABASE_URL"
}

# Initialize environment for production
init_prod() {
    print_info "Initializing production environment..."
    
    local env_file="$PROJECT_DIR/.env.production"
    
    if [[ -f "$env_file" ]]; then
        print_error "Production environment file already exists. Refusing to overwrite."
        return 1
    fi

    # Generate stronger secrets for production
    local session_secret=$(generate_secret 64)
    local jwt_secret=$(generate_secret 64)

    # Copy template and replace secrets
    cp "$PROJECT_DIR/.env.example" "$env_file"
    sed -i.bak "s/your-32-character-session-secret-minimum/$session_secret/g" "$env_file"
    sed -i "s/your-32-character-jwt-secret-minimum/$jwt_secret/g" "$env_file"
    rm "$env_file.bak"

    # Update production-specific settings
    sed -i 's/SESSION_SECURE=false/SESSION_SECURE=true/g' "$env_file"
    sed -i 's/NODE_ENV=development/NODE_ENV=production/g' "$env_file"
    sed -i 's/ENABLE_SEED_DATA=true/ENABLE_SEED_DATA=false/g' "$env_file"
    sed -i 's/ENABLE_SWAGGER=true/ENABLE_SWAGGER=false/g' "$env_file"

    print_status "Production environment initialized"
    print_warning "Please update the following variables in $env_file:"
    print_warning "  - GOOGLE_CLIENT_ID (production credentials)"
    print_warning "  - GOOGLE_CLIENT_SECRET (production credentials)"
    print_warning "  - DATABASE_URL (production database)"
    print_warning "  - REDIS_URL (production Redis)"
    print_warning "  - APP_URL (production URL)"
    print_warning "  - SMTP_* (email configuration)"
}

# Rotate secrets
rotate_secrets() {
    local env_type="$1"
    local env_file="$PROJECT_DIR/.env.$env_type"

    if [[ ! -f "$env_file" ]]; then
        print_error "Environment file '$env_file' does not exist"
        return 1
    fi

    print_info "Rotating secrets for $env_type environment..."

    # Generate new secrets
    local new_session_secret=$(generate_secret 64)
    local new_jwt_secret=$(generate_secret 64)

    # Backup old file
    cp "$env_file" "$env_file.backup.$(date +%Y%m%d_%H%M%S)"

    # Update secrets
    sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$new_session_secret/g" "$env_file"
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$new_jwt_secret/g" "$env_file"

    print_status "Secrets rotated for $env_type environment"
    print_warning "Backup saved to $env_file.backup.$(date +%Y%m%d_%H%M%S)"
}

# Show environment status
show_status() {
    print_info "Environment Status:"
    echo
    
    local env_files=(".env.development" ".env.staging" ".env.production" ".env.local")
    
    for env_file in "${env_files[@]}"; do
        local full_path="$PROJECT_DIR/$env_file"
        
        if [[ -f "$full_path" ]]; then
            local status="VALID"
            if ! validate_env_file "$full_path" >/dev/null 2>&1; then
                status="INVALID"
            fi
            echo -e "  ${GREEN}✓${NC} $env_file - $status"
        else
            echo -e "  ${RED}✗${NC} $env_file - MISSING"
        fi
    done
    
    echo
    print_info "Docker Compose Files:"
    local compose_files=("docker-compose.yml" "docker-compose.staging.yml" "docker-compose.production.yml")
    
    for compose_file in "${compose_files[@]}"; do
        local full_path="$PROJECT_DIR/$compose_file"
        
        if [[ -f "$full_path" ]]; then
            echo -e "  ${GREEN}✓${NC} $compose_file"
        else
            echo -e "  ${RED}✗${NC} $compose_file"
        fi
    done
}

# Export environment variables
export_env() {
    local env_type="$1"
    local env_file="$PROJECT_DIR/.env.$env_type"

    if [[ ! -f "$env_file" ]]; then
        print_error "Environment file '$env_file' does not exist"
        return 1
    fi

    print_info "Exporting environment variables from $env_file..."
    
    # Source the environment file
    set -a
    source "$env_file"
    set +a
    
    print_status "Environment variables exported"
}

# Show help
show_help() {
    cat << EOF
Environment Variable Management Script

Usage: $0 [command] [options]

Commands:
    init-dev           Initialize development environment
    init-prod          Initialize production environment
    validate [file]    Validate environment file
    rotate [env]       Rotate secrets for environment (dev/staging/prod)
    status             Show environment status
    export [env]       Export environment variables to shell
    help               Show this help message

Examples:
    $0 init-dev
    $0 init-prod
    $0 validate .env.production
    $0 rotate production
    $0 status
    $0 export production

Environment files are located in the project root:
    - .env.development
    - .env.staging
    - .env.production
    - .env.local

EOF
}

# Main script logic
main() {
    check_dependencies

    case "${1:-help}" in
        init-dev)
            init_dev
            ;;
        init-prod)
            init_prod
            ;;
        validate)
            if [[ -z "${2:-}" ]]; then
                print_error "Please specify an environment file to validate"
                exit 1
            fi
            validate_env_file "$2"
            ;;
        rotate)
            if [[ -z "${2:-}" ]]; then
                print_error "Please specify environment type (dev, staging, prod)"
                exit 1
            fi
            rotate_secrets "$2"
            ;;
        status)
            show_status
            ;;
        export)
            if [[ -z "${2:-}" ]]; then
                print_error "Please specify environment type (dev, staging, prod)"
                exit 1
            fi
            export_env "$2"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
