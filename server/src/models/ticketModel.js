// server/src/models/ticketModel.js
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) fetch ticket to know if it had a hotel
    const tRes = await client.query(
      "SELECT id, status, hotel_id FROM tickets WHERE id = $1 FOR UPDATE",
      [id]
    );
    const ticket = tRes.rows[0];
    
    if (!ticket) {
      await client.query("ROLLBACK");
      throw new Error("Ticket not found");
    }

    // 2) if completed and linked to hotel -> free hotel
    if (ticket.status === "COMPLETED" && ticket.hotel_id) {
      await client.query(
        "UPDATE hotels SET is_available = TRUE WHERE id = $1",
        [ticket.hotel_id]
      );
    }

    // 3) delete the ticket
    await client.query("DELETE FROM tickets WHERE id = $1", [id]);

    await client.query("COMMIT");
    return { message: "Ticket deleted" };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Assign a hotel to a ticket:
 * - checks ticket exists and is OPEN
 * - checks hotel exists and is Available
 * - sets ticket.hotel_id and marks ticket COMPLETED
 * - marks hotel unavailable
 * - transaction-safe
 */
export async function assignHotelToTicketModel(ticketId, hotelId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Check ticket
    const tRes = await client.query(
      "SELECT id, status FROM tickets WHERE id = $1 FOR UPDATE",
      [ticketId]
    );
    const ticket = tRes.rows[0];
    if (!ticket) throw new Error("Ticket not found");
    if (ticket.status === "COMPLETED") throw new Error("Ticket already completed");

    // 2) Check hotel
    const hRes = await client.query(
      "SELECT id, is_available FROM hotels WHERE id = $1 FOR UPDATE",
      [hotelId]
    );
    const hotel = hRes.rows[0];
    if (!hotel) throw new Error("Hotel not found");
    if (!hotel.is_available) throw new Error("Hotel not available");

    // 3) Update ticket -> COMPLETED + link hotel
    const updatedTicketRes = await client.query(
      `
      UPDATE tickets
      SET hotel_id = $1, status = 'COMPLETED'
      WHERE id = $2
      RETURNING *
      `,
      [hotelId, ticketId]
    );

    // 4) Update hotel -> unavailable
    const updatedHotelRes = await client.query(
      `
      UPDATE hotels
      SET is_available = FALSE
      WHERE id = $1
      RETURNING *
      `,
      [hotelId]
    );

    await client.query("COMMIT");

    return {
      ticket: updatedTicketRes.rows[0],
      hotel: updatedHotelRes.rows[0],
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
