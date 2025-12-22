CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  hotel_id INTEGER
);

CREATE TABLE IF NOT EXISTS hotels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO tickets (name, price) VALUES
('Sample Ticket 1', 10.00),
('Sample Ticket 2', 20.50);

INSERT INTO hotels (name, is_available) VALUES
('Hotel A', TRUE),
('Hotel B', TRUE);
