-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  hotel_id INTEGER,
  CONSTRAINT tickets_status_check CHECK (status = ANY (ARRAY['OPEN'::text, 'COMPLETED'::text]))
);

-- Create hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE
);

-- Add foreign key constraint
ALTER TABLE tickets 
ADD CONSTRAINT tickets_hotel_id_fkey 
FOREIGN KEY (hotel_id) REFERENCES hotels(id);

-- Insert sample hotels
INSERT INTO hotels (name, is_available) VALUES
('Hotel A', TRUE),
('Hotel B', TRUE),
('Hotel C', FALSE),
('Hotel D', TRUE);

-- Insert sample tickets
INSERT INTO tickets (name, price, status, hotel_id) VALUES
('Sample Ticket 1', 10.00, 'OPEN', 1),
('Sample Ticket 2', 20.50, 'COMPLETED', 2),
('Sample Ticket 3', 15.75, 'OPEN', 3),
('Sample Ticket 4', 30.00, 'OPEN', 1);