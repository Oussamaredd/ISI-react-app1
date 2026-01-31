-- Rollback: Initial Schema Setup
-- Created: Auto-generated
-- Description: Rolls back the initial database schema

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
DROP TRIGGER IF EXISTS update_rate_limits_updated_at ON rate_limits;
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
DROP TRIGGER IF EXISTS update_ticket_comments_updated_at ON ticket_comments;
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
DROP TRIGGER IF EXISTS update_hotels_updated_at ON hotels;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_system_settings_key;
DROP INDEX IF EXISTS idx_rate_limits_window_end;
DROP INDEX IF EXISTS idx_rate_limits_identifier_endpoint;
DROP INDEX IF EXISTS idx_api_keys_created_by;
DROP INDEX IF EXISTS idx_api_keys_key_hash;
DROP INDEX IF EXISTS idx_user_sessions_expires_at;
DROP INDEX IF EXISTS idx_user_sessions_session_token;
DROP INDEX IF EXISTS idx_user_sessions_user_id;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_entity;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_ticket_attachments_uploaded_by;
DROP INDEX IF EXISTS idx_ticket_attachments_ticket_id;
DROP INDEX IF EXISTS idx_ticket_comments_created_at;
DROP INDEX IF EXISTS idx_ticket_comments_user_id;
DROP INDEX IF EXISTS idx_ticket_comments_ticket_id;
DROP INDEX IF EXISTS idx_tickets_created_at;
DROP INDEX IF EXISTS idx_tickets_priority;
DROP INDEX IF EXISTS idx_tickets_status;
DROP INDEX IF EXISTS idx_tickets_created_by;
DROP INDEX IF EXISTS idx_tickets_assigned_to;
DROP INDEX IF EXISTS idx_tickets_hotel_id;

-- Drop tables
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS ticket_attachments;
DROP TABLE IF EXISTS ticket_comments;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS hotels;
DROP TABLE IF EXISTS users;

-- Drop schema migrations table last
DROP TABLE IF EXISTS schema_migrations;

COMMIT;