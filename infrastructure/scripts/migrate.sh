#!/bin/bash

# Database Migration Script for Production
# This script handles database migrations safely in production environments

set -e

# Configuration
DATABASE_URL="${DATABASE_URL:-}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-./migrations}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DRY_RUN="${DRY_RUN:-false}"
ROLLBACK="${ROLLBACK:-false}"
MIGRATION_FILE="${MIGRATION_FILE:-}"

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

# Check dependencies
check_dependencies() {
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) is required but not installed."
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. JSON parsing will be limited."
    fi
}

# Validate database connection
validate_database() {
    print_info "Validating database connection..."
    
    if [[ -z "$DATABASE_URL" ]]; then
        print_error "DATABASE_URL environment variable is not set"
        exit 1
    fi

    # Test database connection
    if ! psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        print_error "Cannot connect to database"
        exit 1
    fi

    print_status "Database connection validated"
}

# Create backup directory
setup_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    print_info "Backup directory: $BACKUP_DIR"
}

# Create database backup
create_backup() {
    if [[ "$DRY_RUN" == "true" ]]; then
        print_warning "DRY RUN: Skipping backup creation"
        return 0
    fi

    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/backup_${timestamp}.sql"
    
    print_info "Creating database backup..."
    
    if pg_dump "$DATABASE_URL" > "$backup_file"; then
        # Compress the backup
        gzip "$backup_file"
        local compressed_file="${backup_file}.gz"
        
        print_status "Backup created: $compressed_file"
        echo "$compressed_file"
    else
        print_error "Failed to create backup"
        exit 1
    fi
}

# Check if migration has been applied
is_migration_applied() {
    local migration_name="$1"
    
    # Check migrations table
    local result=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM schema_migrations WHERE name = '$migration_name';
    " 2>/dev/null | tr -d ' ')

    if [[ "$result" == "1" ]]; then
        return 0
    else
        return 1
    fi
}

# Record migration
record_migration() {
    local migration_name="$1"
    local migration_file="$2"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_warning "DRY RUN: Skipping migration recording"
        return 0
    fi

    psql "$DATABASE_URL" -c "
        INSERT INTO schema_migrations (name, executed_at, checksum) 
        VALUES ('$migration_name', NOW(), md5('$(cat "$migration_file")'));
    " >/dev/null 2>&1
}

# Get all pending migrations
get_pending_migrations() {
    local pending_migrations=()
    
    # Ensure migrations table exists
    psql "$DATABASE_URL" -c "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            name VARCHAR(255) PRIMARY KEY,
            executed_at TIMESTAMP DEFAULT NOW(),
            checksum VARCHAR(32)
        );
    " >/dev/null 2>&1

    # Get all migration files
    if [[ -d "$MIGRATIONS_DIR" ]]; then
        for migration_file in "$MIGRATIONS_DIR"/*.sql; do
            if [[ -f "$migration_file" ]]; then
                local migration_name=$(basename "$migration_file" .sql)
                if ! is_migration_applied "$migration_name"; then
                    pending_migrations+=("$migration_file")
                fi
            fi
        done
    fi

    echo "${pending_migrations[@]}"
}

# Execute migration
execute_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)
    
    print_info "Executing migration: $migration_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_warning "DRY RUN: Would execute migration: $migration_name"
        print_info "Migration file: $migration_file"
        print_info "SQL content:"
        echo "----------------------------------------"
        cat "$migration_file"
        echo "----------------------------------------"
        return 0
    fi

    # Execute migration in a transaction
    if psql "$DATABASE_URL" -f "$migration_file"; then
        record_migration "$migration_name" "$migration_file"
        print_status "Migration executed successfully: $migration_name"
        return 0
    else
        print_error "Migration failed: $migration_name"
        return 1
    fi
}

# Rollback migration
rollback_migration() {
    local migration_name="$1"
    
    print_info "Rolling back migration: $migration_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_warning "DRY RUN: Would rollback migration: $migration_name"
        return 0
    fi

    # Look for rollback file
    local rollback_file="$MIGRATIONS_DIR/rollback_${migration_name}.sql"
    
    if [[ -f "$rollback_file" ]]; then
        if psql "$DATABASE_URL" -f "$rollback_file"; then
            # Remove from migrations table
            psql "$DATABASE_URL" -c "
                DELETE FROM schema_migrations WHERE name = '$migration_name';
            " >/dev/null 2>&1
            
            print_status "Migration rolled back successfully: $migration_name"
            return 0
        else
            print_error "Rollback failed: $migration_name"
            return 1
        fi
    else
        print_error "Rollback file not found: $rollback_file"
        return 1
    fi
}

# Run migrations
run_migrations() {
    print_info "Checking for pending migrations..."
    
    local pending_migrations=($(get_pending_migrations))
    
    if [[ ${#pending_migrations[@]} -eq 0 ]]; then
        print_status "No pending migrations"
        return 0
    fi
    
    print_status "Found ${#pending_migrations[@]} pending migrations:"
    for migration in "${pending_migrations[@]}"; do
        echo "  - $(basename "$migration" .sql)"
    done
    
    if [[ "$DRY_RUN" == "false" ]]; then
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Migration cancelled"
            exit 0
        fi
    fi
    
    # Create backup before running migrations
    local backup_file=$(create_backup)
    
    # Execute migrations in order
    local failed_migrations=()
    for migration_file in "${pending_migrations[@]}"; do
        if ! execute_migration "$migration_file"; then
            failed_migrations+=("$migration_file")
        fi
    done
    
    if [[ ${#failed_migrations[@]} -gt 0 ]]; then
        print_error "The following migrations failed:"
        for migration in "${failed_migrations[@]}"; do
            echo "  - $(basename "$migration" .sql)"
        done
        print_info "Backup available: $backup_file"
        exit 1
    else
        print_status "All migrations executed successfully"
    fi
}

# Show migration status
show_status() {
    print_info "Migration status:"
    echo
    
    # Get migration info from database
    local applied_migrations=$(psql "$DATABASE_URL" -t -c "
        SELECT name, executed_at::text, checksum 
        FROM schema_migrations 
        ORDER BY executed_at;
    " 2>/dev/null || echo "")
    
    if [[ -n "$applied_migrations" ]]; then
        print_status "Applied migrations:"
        echo "$applied_migrations" | while read -r name executed_at checksum; do
            if [[ -n "$name" ]]; then
                echo "  ✓ $name (executed: $executed_at)"
            fi
        done
    else
        print_warning "No migrations have been applied"
    fi
    
    echo
    
    # Show pending migrations
    local pending_migrations=($(get_pending_migrations))
    if [[ ${#pending_migrations[@]} -gt 0 ]]; then
        print_status "Pending migrations:"
        for migration in "${pending_migrations[@]}"; do
            echo "  ○ $(basename "$migration" .sql)"
        done
    else
        print_status "No pending migrations"
    fi
}

# Generate new migration
generate_migration() {
    local migration_name="$1"
    
    if [[ -z "$migration_name" ]]; then
        print_error "Migration name is required"
        exit 1
    fi
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local migration_file="$MIGRATIONS_DIR/${timestamp}_${migration_name}.sql"
    
    mkdir -p "$MIGRATIONS_DIR"
    
    cat > "$migration_file" << EOF
-- Migration: ${migration_name}
-- Created: $(date)
-- Description: 

-- Add your migration SQL here
BEGIN;

-- Example:
-- CREATE TABLE example_table (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT NOW()
-- );

COMMIT;
EOF
    
    print_status "Migration created: $migration_file"
    
    # Create rollback file template
    local rollback_file="$MIGRATIONS_DIR/rollback_${timestamp}_${migration_name}.sql"
    
    cat > "$rollback_file" << EOF
-- Rollback: ${migration_name}
-- Created: $(date)

BEGIN;

-- Add your rollback SQL here
-- Example:
-- DROP TABLE IF EXISTS example_table;

COMMIT;
EOF
    
    print_status "Rollback template created: $rollback_file"
}

# Show help
show_help() {
    cat << EOF
Database Migration Script for Production

Usage: $0 [command] [options]

Environment Variables:
    DATABASE_URL          Database connection URL (required)
    MIGRATIONS_DIR        Directory containing migration files (default: ./migrations)
    BACKUP_DIR            Directory for backup files (default: ./backups)
    DRY_RUN              Run in dry-run mode (default: false)
    ROLLBACK             Enable rollback mode (default: false)

Commands:
    up                   Run all pending migrations
    status               Show migration status
    create <name>        Create a new migration file
    rollback <name>      Rollback a specific migration
    backup               Create a database backup
    help                 Show this help message

Options:
    --dry-run            Show what would be done without executing
    --force              Skip confirmation prompts

Examples:
    $0 up                               # Run pending migrations
    $0 up --dry-run                     # Dry run migrations
    $0 status                           # Show migration status
    $0 create add_user_table            # Create new migration
    $0 rollback 20231201_120000_add_user_table  # Rollback migration
    $0 backup                           # Create backup

Migration Files:
    Migrations should be SQL files in the migrations directory.
    Filename format: YYYYMMDD_HHMMSS_description.sql
    Rollback files: rollback_YYYYMMDD_HHMMSS_description.sql

EOF
}

# Main execution
main() {
    check_dependencies
    validate_database
    setup_backup_dir
    
    case "${1:-help}" in
        up)
            if [[ "$ROLLBACK" == "true" ]]; then
                print_error "Cannot use ROLLBACK mode with 'up' command"
                exit 1
            fi
            run_migrations
            ;;
        status)
            show_status
            ;;
        create)
            generate_migration "$2"
            ;;
        rollback)
            if [[ -z "$2" ]]; then
                print_error "Migration name is required for rollback"
                exit 1
            fi
            rollback_migration "$2"
            ;;
        backup)
            create_backup
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

# Run main function
main "$@"