/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  return knex.raw(`
    -- Add enhanced role management to users table
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{user}',
    ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

    -- Create roles table for role definitions
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      permissions JSONB DEFAULT '{}',
      is_system BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Create user_role_assignments table for many-to-many relationship
    CREATE TABLE IF NOT EXISTS user_role_assignments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP,
      UNIQUE(user_id, role_id)
    );

    -- Create audit_logs table for tracking admin actions
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER,
      old_values JSONB,
      new_values JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Insert default system roles
    INSERT INTO roles (name, display_name, description, permissions, is_system) VALUES
    ('super_admin', 'Super Admin', 'Full system access', '{
      "users": ["create", "read", "update", "delete"],
      "roles": ["create", "read", "update", "delete"],
      "hotels": ["create", "read", "update", "delete"],
      "tickets": ["create", "read", "update", "delete"],
      "audit_logs": ["read"],
      "system": ["manage"]
    }', true),
    ('admin', 'Admin', 'Administrative access', '{
      "users": ["read", "update"],
      "hotels": ["create", "read", "update"],
      "tickets": ["create", "read", "update", "delete"],
      "audit_logs": ["read"]
    }', true),
    ('manager', 'Manager', 'Management access', '{
      "hotels": ["read"],
      "tickets": ["create", "read", "update", "delete"],
      "users": ["read"]
    }', true),
    ('user', 'User', 'Basic user access', '{
      "tickets": ["create", "read"],
      "hotels": ["read"]
    }', true)
    ON CONFLICT (name) DO NOTHING;

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments(role_id);
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS user_role_assignments CASCADE;
    DROP TABLE IF EXISTS roles CASCADE;
    
    ALTER TABLE users 
    DROP COLUMN IF EXISTS roles,
    DROP COLUMN IF EXISTS permissions,
    DROP COLUMN IF EXISTS is_active,
    DROP COLUMN IF EXISTS last_login;
  `);
}