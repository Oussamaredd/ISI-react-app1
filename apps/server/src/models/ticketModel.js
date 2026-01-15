// server/src/models/ticketModel.js
import { pool } from "../config/db.js";
import { isValidTransition, TICKET_STATUSES, canAssignHotel, canReopen, getNextPossibleStatuses } from "../domain/ticketStateMachine.js";

/**
 * Get all tickets with optional filtering, search, and pagination
 */
export async function getTickets(filters = {}) {
  console.log("Connected to DB:", process.env.DB_HOST, process.env.DB_NAME);
  let query = `
    SELECT t.*, h.name as hotel_name 
    FROM tickets t 
    LEFT JOIN hotels h ON t.hotel_id = h.id
  `;
  const params = [];
  const whereConditions = [];
  
  if (filters.status) {
    whereConditions.push(`t.status = $${params.length + 1}`);
    params.push(filters.status);
  }
  
  if (filters.hotel_id) {
    whereConditions.push(`t.hotel_id = $${params.length + 1}`);
    params.push(filters.hotel_id);
  }
  
  if (filters.q) {
    whereConditions.push(`t.name ILIKE $${params.length + 1}`);
    params.push(`%${filters.q}%`);
  }
  
  if (filters.assigneeId) {
    whereConditions.push(`t.assignee_id = $${params.length + 1}`);
    params.push(filters.assigneeId);
  }
  
  if (whereConditions.length > 0) {
    query += " WHERE " + whereConditions.join(" AND ");
  }
  
  query += " ORDER BY t.updated_at DESC, t.id DESC";
  
  // Add pagination
  if (filters.limit) {
    query += ` LIMIT $${params.length + 1}`;
    params.push(filters.limit);
  }
  
  if (filters.offset) {
    query += ` OFFSET $${params.length + 1}`;
    params.push(filters.offset);
  }
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get total count of tickets with filtering (for pagination)
 */
export async function getTicketsCount(filters = {}) {
  let query = "SELECT COUNT(*) as total FROM tickets t";
  const params = [];
  const whereConditions = [];
  
  if (filters.status) {
    whereConditions.push(`t.status = $${params.length + 1}`);
    params.push(filters.status);
  }
  
  if (filters.hotel_id) {
    whereConditions.push(`t.hotel_id = $${params.length + 1}`);
    params.push(filters.hotel_id);
  }
  
  if (filters.q) {
    whereConditions.push(`t.name ILIKE $${params.length + 1}`);
    params.push(`%${filters.q}%`);
  }
  
  if (filters.assigneeId) {
    whereConditions.push(`t.assignee_id = $${params.length + 1}`);
    params.push(filters.assigneeId);
  }
  
  if (whereConditions.length > 0) {
    query += " WHERE " + whereConditions.join(" AND ");
  }
  
  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
}

/**
 * Get a single ticket by ID
 */
export async function getTicketById(id) {
  const result = await pool.query(
    `SELECT t.*, h.name as hotel_name 
     FROM tickets t 
     LEFT JOIN hotels h ON t.hotel_id = h.id 
     WHERE t.id = $1`,
    [id]
  );
  
  return result.rows[0];
}

/**
 * Update a ticket
 */
export async function updateTicket(id, updateData) {
  const { name, price, status, hotel_id } = updateData;
  
  const result = await pool.query(
    `UPDATE tickets 
     SET name = COALESCE($2, name),
         price = COALESCE($3, price),
         status = COALESCE($4, status),
         hotel_id = COALESCE($5, hotel_id),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, name, price, status, hotel_id]
  );
  
  return result.rows[0];
}

/**
 * Delete a ticket
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
 * Assign a hotel to a ticket with state machine validation and activity logging
 */
export async function assignHotelToTicket(ticketId, hotelId, actorUserId) {
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
    
    // Create activity entry before assignment
    await client.query(
      `INSERT INTO ticket_activity (ticket_id, actor_user_id, type, metadata, created_at)
       VALUES ($1, $2, 'hotel_assignment_attempt', $3, NOW())`,
      [ticketId, actorUserId, JSON.stringify({
        old_status: ticket[0].status,
        hotel_id: hotelId,
        hotel_name: hotel.name
      })]
    );
    
    // Perform the assignment
    const updatedTicket = await updateTicket(ticketId, { hotel_id: hotel.id });
    
    // Create success activity
    await client.query(
      `INSERT INTO ticket_activity (ticket_id, actor_user_id, type, metadata, created_at)
       VALUES (
         (SELECT ticket_id FROM tickets WHERE id = $1),
         (SELECT actor_user_id FROM ticket_activity WHERE id = (
           SELECT MAX(id) FROM ticket_activity WHERE ticket_id = $1
         )),
         'hotel_assignment',
         $3,
         NOW()
       )`,
      [ticketId, actorUserId, JSON.stringify({
        hotel_id: hotelId,
        hotel_name: hotel.name,
        success: true
      })]
    );
    
    await client.query("COMMIT");
    
    return updatedTicket;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}