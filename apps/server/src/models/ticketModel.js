// server/src/models/ticketModel.js
import { pool } from "../config/db.js";
import { isValidTransition, TICKET_STATUSES, canAssignHotel, canReopen, getNextPossibleStatuses } from "../domain/ticketStateMachine.js";

/**
 * Get all tickets with optional filtering
 */
export async function getTickets(filters = {}) {
  console.log("Connected to DB:", process.env.DB_HOST, process.env.DB_NAME);
  let query = "SELECT * FROM tickets";
  const params = [];
  const whereConditions = [];
  
  if (filters.status) {
    whereConditions.push(`status = $${params.length + 1}`);
    params.push(filters.status);
  }
  
  if (filters.hotel_id) {
    whereConditions.push(`hotel_id = $${params.length + 1}`);
    params.push(filters.hotel_id);
  }
  
  if (whereConditions.length > 0) {
    query += " WHERE " + whereConditions.join(" AND ");
  }
  
  query += " ORDER BY id ASC";
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Delete a ticket with proper state validation
 */
export async function deleteTicket(id) {
  const client = await pool.connect();
  try {
    // Get ticket with current status
    const currentTicket = await getTicketById(id);
    if (!currentTicket) {
      throw new Error("Ticket not found");
    }
    
    // Delete ticket
    const result = await pool.query("DELETE FROM tickets WHERE id = $1", [id]);
    
    await client.query("COMMIT");
    
    return { deletedId: id, message: "Ticket deleted" };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Assign a hotel to a ticket with state machine validation
 */
export async function assignHotelToTicket(ticketId, hotelId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Get ticket and hotel for validation
    const [ticket] = await getTicketById(ticketId);
    const [hotel] = await pool.query("SELECT * FROM hotels WHERE id = $1", [hotelId]);
    
    // Validation
    if (!ticket) {
      throw new Error("Ticket not found");
    }
    if (!hotel) {
      throw new Error("Hotel not found");
    }
    if (!canAssignHotel(ticket[0].status)) {
      throw new Error(`Cannot assign hotel to ticket with status: ${ticket[0].status}`);
    }
    
    // Perform the assignment
    const updatedTicket = await updateTicket(ticketId, { hotel_id: hotel.id });
    
    await client.query("COMMIT");
    
    return updatedTicket;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}