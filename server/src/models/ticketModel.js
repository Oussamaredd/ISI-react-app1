import { pool } from "../config/db.js";

// Get all tickets
export async function getTickets() {
  console.log("Connected to DB:", process.env.DB_HOST, process.env.DB_NAME);
  const result = await pool.query("SELECT * FROM tickets ORDER BY id ASC");
  return result.rows;
}

// Create a new ticket
export async function createTicket(name, price) {
  console.log("Connected to DB:", process.env.DB_HOST, process.env.DB_NAME);
  const result = await pool.query(
    "INSERT INTO tickets (name, price) VALUES ($1, $2) RETURNING *",
    [name, price]
  );
  return result.rows[0];
}

// Update ticket
export async function updateTicket(id, name, price) {
  const result = await pool.query(
    "UPDATE tickets SET name = $1, price = $2 WHERE id = $3 RETURNING *",
    [name, price, id]
  );
  return result.rows[0];
}

// Delete ticket
export async function deleteTicket(id) {
  await pool.query("DELETE FROM tickets WHERE id = $1", [id]);
}
