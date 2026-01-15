/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Reuse the same table creation logic for consistency
  return knex.raw(`
    -- Create hotels table
    CREATE TABLE IF NOT EXISTS hotels (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      is_available BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Create tickets table with proper constraints
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      hotel_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT tickets_status_check CHECK (status IN ('OPEN', 'COMPLETED')),
      CONSTRAINT tickets_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE SET NULL
    );

    -- Create users table for authentication
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_hotels_available ON hotels(is_available);
    CREATE INDEX IF NOT EXISTS idx_tickets_hotel_id ON tickets(hotel_id);
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS tickets CASCADE;
    DROP TABLE IF EXISTS hotels CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);
}