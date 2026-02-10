-- Migration: Admin seed and supporting indexes
-- Applies idempotent seed data and read indexes for admin features.

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
