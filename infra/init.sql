CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);

INSERT INTO tickets (name, price) VALUES
('Sample Ticket 1', 10.00),
('Sample Ticket 2', 20.50);
