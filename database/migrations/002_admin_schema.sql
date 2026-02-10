-- Migration: Admin schema extensions
-- Adds roles, user_roles, audit_logs, system_settings and admin-related columns.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

INSERT INTO roles (name, description, permissions)
VALUES
  ('admin', 'Administrator', '["users.read","users.write","roles.read","roles.write","hotels.read","hotels.write","audit.read","settings.write"]'),
  ('manager', 'Manager', '["users.read","hotels.read","tickets.read","audit.read"]'),
  ('agent', 'Agent', '["tickets.read","tickets.write"]')
ON CONFLICT (name) DO NOTHING;

INSERT INTO system_settings (key, value, description, is_public)
VALUES
  ('user_registration', 'true', 'Allow user self-registration', false),
  ('default_user_role', '"agent"', 'Default role for new users', false),
  ('session_timeout', '86400000', 'Session timeout in milliseconds', false),
  ('audit_log_retention', '90', 'Audit log retention days', false),
  ('max_login_attempts', '5', 'Maximum login attempts before lockout', false),
  ('password_min_length', '8', 'Minimum password length', false),
  ('email_notifications', 'true', 'Email notifications enabled', false),
  ('maintenance_mode', 'false', 'Maintenance mode flag', false),
  ('site_name', '"Ticket Management System"', 'Site name', true),
  ('site_description', '"Professional ticket and hotel management platform"', 'Site description', true),
  ('timezone', '"UTC"', 'Default timezone', true),
  ('date_format', '"MM/DD/YYYY"', 'Default date format', true),
  ('currency', '"USD"', 'Default currency', true)
ON CONFLICT (key) DO NOTHING;

COMMIT;
