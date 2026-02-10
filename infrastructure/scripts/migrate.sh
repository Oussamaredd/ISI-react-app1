#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
cd "$REPO_ROOT"

MIGRATE_COMMAND=${MIGRATE_COMMAND:-npm run db:migrate --workspace=react-app1-database}
ENABLE_SEED_DATA=${ENABLE_SEED_DATA:-false}
SEED_COMMAND=${SEED_COMMAND:-npm run db:seed --workspace=react-app1-database}
DRY_RUN=${DRY_RUN:-false}

print_info() {
  printf '%s\n' "[INFO] $1"
}

print_warn() {
  printf '%s\n' "[WARN] $1"
}

print_error() {
  printf '%s\n' "[ERROR] $1" >&2
}

is_true() {
  normalized=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')
  case "$normalized" in
    true|1|yes|y) return 0 ;;
    *) return 1 ;;
  esac
}

run_command() {
  if is_true "$DRY_RUN"; then
    print_warn "DRY RUN: $1"
    return 0
  fi

  sh -c "$1"
}

validate_runtime() {
  if ! command -v npm >/dev/null 2>&1; then
    print_error "npm is required but was not found"
    exit 1
  fi

  if [ -z "${DATABASE_URL:-}" ]; then
    print_warn "DATABASE_URL is not set; drizzle config fallback will be used"
  fi
}

migrate_up() {
  print_info "Running migrate command"
  run_command "$MIGRATE_COMMAND"

  if is_true "$ENABLE_SEED_DATA"; then
    print_info "Seeding is enabled"
    run_command "$SEED_COMMAND"
  else
    print_info "Seeding is disabled"
  fi

  print_info "Migration workflow completed successfully"
}

show_status() {
  print_info "Repository root: $REPO_ROOT"
  print_info "MIGRATE_COMMAND=$MIGRATE_COMMAND"
  print_info "ENABLE_SEED_DATA=$ENABLE_SEED_DATA"
  print_info "SEED_COMMAND=$SEED_COMMAND"
  print_info "DRY_RUN=$DRY_RUN"
}

show_help() {
  cat <<EOF
Database migration helper

Usage: $0 <command>

Commands:
  up        Run migration command and optional seed command
  status    Print effective migration configuration
  help      Show this help

Environment variables:
  MIGRATE_COMMAND   Default: npm run db:migrate --workspace=react-app1-database
  ENABLE_SEED_DATA  Default: false
  SEED_COMMAND      Default: npm run db:seed --workspace=react-app1-database
  DRY_RUN           Default: false
EOF
}

main() {
  validate_runtime

  case "${1:-help}" in
    up)
      migrate_up
      ;;
    status)
      show_status
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

main "$@"
