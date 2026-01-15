// apps/server/src/models/activityModel.js
import { pool } from '../config/db.js';

// Activity types
export const ACTIVITY_TYPES = {
  CREATION: 'creation',
  STATUS_CHANGE: 'status_change',
  HOTEL_ASSIGNMENT: 'hotel_assignment',
  COMMENT_ADDED: 'comment_added',
  COMMENT_UPDATED: 'comment_updated',
  COMMENT_DELETED: 'comment_deleted',
  TICKET_UPDATED: 'ticket_updated',
  TICKET_DELETED: 'ticket_deleted',
};

/**
 * Get activity timeline for a ticket
 */
export async function getTicketActivity(ticketId, options = {}) {
  const { limit = 50, offset = 0 } = options;
  
  const query = `
    SELECT 
      ta.*,
      u.name as actor_name,
      u.email as actor_email,
      u.role as actor_role
    FROM ticket_activity ta
    JOIN users u ON ta.actor_user_id = u.id
    WHERE ta.ticket_id = $1
    ORDER BY ta.created_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const result = await pool.query(query, [ticketId, limit, offset]);
  return result.rows.map(row => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }));
}

/**
 * Create activity entry
 */
export async function createActivity(ticketId, actorUserId, type, metadata = {}) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO ticket_activity (ticket_id, actor_user_id, type, metadata, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [ticketId, actorUserId, type, JSON.stringify(metadata)]
    );
    return result.rows[0];
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create status change activity
 */
export async function createStatusChangeActivity(ticketId, actorUserId, oldStatus, newStatus) {
  return createActivity(ticketId, actorUserId, ACTIVITY_TYPES.STATUS_CHANGE, {
    old_status: oldStatus,
    new_status: newStatus,
    status_changed_at: new Date().toISOString(),
  });
}

/**
 * Create hotel assignment activity
 */
export async function createHotelAssignmentActivity(ticketId, actorUserId, hotelId, hotelName) {
  return createActivity(ticketId, actorUserId, ACTIVITY_TYPES.HOTEL_ASSIGNMENT, {
    hotel_id: hotelId,
    hotel_name: hotelName,
    assigned_at: new Date().toISOString(),
  });
}

/**
 * Get activity count for pagination
 */
export async function getActivityCount(ticketId) {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM ticket_activity WHERE ticket_id = $1',
    [ticketId]
  );
  return parseInt(result.rows[0].count);
}