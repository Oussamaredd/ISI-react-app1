import { pool } from '../config/db.js';

/**
 * Get all hotels with optional filtering and pagination
 */
export async function getHotels(filters = {}) {
  const { is_available, limit = 20, offset = 0, search } = filters;
  
  let query = `
    SELECT h.*, 
           COUNT(t.id) as ticket_count,
           COALESCE(AVG(t.price), 0) as avg_price
    FROM hotels h
    LEFT JOIN tickets t ON h.id = t.hotel_id
  `;
  
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  if (is_available !== undefined) {
    conditions.push(`h.is_available = $${paramIndex++}`);
    params.push(is_available);
  }
  
  if (search) {
    conditions.push(`h.name ILIKE $${paramIndex++}`);
    params.push(`%${search}%`);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ` GROUP BY h.id, h.name, h.is_available, h.created_at, h.updated_at
             ORDER BY h.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  
  // Get total count
  let countQuery = `SELECT COUNT(DISTINCT h.id) FROM hotels h`;
  const countParams = [];
  let countParamIndex = 1;
  
  if (is_available !== undefined) {
    countQuery += ` WHERE h.is_available = $${countParamIndex++}`;
    countParams.push(is_available);
  }
  
  if (search) {
    if (countParams.length === 0) countQuery += ' WHERE';
    else countQuery += ' AND';
    countQuery += ` h.name ILIKE $${countParamIndex++}`;
    countParams.push(`%${search}%`);
  }
  
  const countResult = await pool.query(countQuery, countParams);
  
  return {
    hotels: result.rows,
    total: parseInt(countResult.rows[0].count),
    limit: parseInt(limit),
    offset: parseInt(offset),
    totalPages: Math.ceil(countResult.rows[0].count / limit)
  };
}

/**
 * Get hotel by ID with statistics
 */
export async function getHotelById(id) {
  const result = await pool.query(`
    SELECT h.*, 
           COUNT(t.id) as ticket_count,
           COALESCE(AVG(t.price), 0) as avg_price,
           MIN(t.price) as min_price,
           MAX(t.price) as max_price
    FROM hotels h
    LEFT JOIN tickets t ON h.id = t.hotel_id
    WHERE h.id = $1
    GROUP BY h.id, h.name, h.is_available, h.created_at, h.updated_at
  `, [id]);
  
  return result.rows[0];
}

/**
 * Create new hotel
 */
export async function createHotel(hotelData) {
  const { name, is_available = true } = hotelData;
  
  const result = await pool.query(`
    INSERT INTO hotels (name, is_available, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    RETURNING *
  `, [name, is_available]);
  
  return result.rows[0];
}

/**
 * Update hotel
 */
export async function updateHotel(id, updateData) {
  const { name, is_available } = updateData;
  
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  
  if (is_available !== undefined) {
    updates.push(`is_available = $${paramIndex++}`);
    values.push(is_available);
  }
  
  if (updates.length === 0) {
    throw new Error('No fields to update');
  }
  
  updates.push(`updated_at = NOW()`);
  values.push(id);
  
  const result = await pool.query(`
    UPDATE hotels 
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);
  
  return result.rows[0];
}

/**
 * Delete hotel
 */
export async function deleteHotel(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if hotel has associated tickets
    const ticketCheck = await client.query(
      'SELECT COUNT(*) as count FROM tickets WHERE hotel_id = $1',
      [id]
    );
    
    if (parseInt(ticketCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete hotel with associated tickets');
    }
    
    const result = await client.query(
      'DELETE FROM hotels WHERE id = $1 RETURNING id, name',
      [id]
    );
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get hotel statistics for admin dashboard
 */
export async function getHotelStats() {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_hotels,
      COUNT(*) FILTER (WHERE is_available = true) as active_hotels,
      COUNT(*) FILTER (WHERE is_available = false) as inactive_hotels,
      COUNT(DISTINCT hotel_id) FILTER (WHERE hotel_id IS NOT NULL) as hotels_with_tickets
    FROM hotels
  `);
  
  return result.rows[0];
}

/**
 * Get hotels with ticket statistics
 */
export async function getHotelsWithTicketStats(limit = 10) {
  const result = await pool.query(`
    SELECT 
      h.id,
      h.name,
      h.is_available,
      h.created_at,
      COUNT(t.id) as total_tickets,
      COUNT(t.id) FILTER (WHERE t.status = 'OPEN') as open_tickets,
      COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED') as completed_tickets,
      COALESCE(AVG(t.price), 0) as avg_ticket_price
    FROM hotels h
    LEFT JOIN tickets t ON h.id = t.hotel_id
    GROUP BY h.id, h.name, h.is_available, h.created_at
    ORDER BY total_tickets DESC, h.created_at DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows;
}