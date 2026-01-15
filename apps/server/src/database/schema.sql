-- Database Schema Definition
-- Single source of truth for database structure
-- This file should be used for both initialization and migrations

-- Create hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE
);

-- Create tickets table with proper constraints
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  hotel_id INTEGER,
  CONSTRAINT tickets_status_check CHECK (status = ANY (ARRAY['OPEN'::text, 'COMPLETED'::text])),
  CONSTRAINT tickets_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE SET NULL
);

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_hotels_available ON hotels(is_available);
CREATE INDEX IF NOT EXISTS idx_tickets_hotel_id ON tickets(hotel_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert sample data (only if tables are empty)
INSERT INTO hotels (name, is_available) 
SELECT 'Hotel A', TRUE WHERE NOT EXISTS (SELECT 1 FROM hotels LIMIT 1);

INSERT INTO hotels (name, is_available) 
VALUES ('Hotel B', TRUE), ('Hotel C', FALSE), ('Hotel D', TRUE)
WHERE (SELECT COUNT(*) FROM hotels) = 1;

INSERT INTO tickets (name, price, status, hotel_id) 
SELECT 'Sample Ticket 1', 10.00, 'OPEN', 1 WHERE NOT EXISTS (SELECT 1 FROM tickets LIMIT 1);

INSERT INTO tickets (name, price, status, hotel_id) 
VALUES 
  ('Sample Ticket 2', 20.50, 'COMPLETED', 2),
  ('Sample Ticket 3', 15.75, 'OPEN', 3),
  ('Sample Ticket 4', 30.00, 'OPEN', 1)
WHERE (SELECT COUNT(*) FROM tickets) = 1;