import { pool } from "../config/db.js";
import { asyncHandler, NotFoundError } from "../middleware/errorHandler.js";
import { hotelDTO, createResponse, createPagination } from "../utils/dto.js";

/**
 * Get all hotels with optional filtering
 */
export const getAllHotels = asyncHandler(async (req, res) => {
  const { is_available, limit = 20, offset = 0 } = req.validated || req.query;
  
  let query = "SELECT id, name, is_available FROM hotels";
  const params = [];
  const conditions = [];
  
  if (is_available !== undefined) {
    conditions.push("is_available = $" + (params.length + 1));
    params.push(is_available);
  }
  
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  
  query += " ORDER BY id LIMIT $" + (params.length + 1) + " OFFSET $" + (params.length + 2);
  params.push(parseInt(limit), parseInt(offset));
  
  const result = await pool.query(query, params);
  
  // Get total count for pagination
  let countQuery = "SELECT COUNT(*) FROM hotels";
  if (conditions.length > 0) {
    countQuery += " WHERE " + conditions.join(" AND ");
  }
  const countResult = await pool.query(countQuery, params.slice(0, -2));
  
  const mappedHotels = hotelDTO.toAPIArray(result.rows);
  const total = parseInt(countResult.rows[0].count);
  
  const response = createResponse(
    mappedHotels,
    null,
    createPagination(limit, offset, total, mappedHotels.length)
  );
  
  res.json(response);
});

export const getHotelById = asyncHandler(async (req, res) => {
  const { id } = req.validated || req.params;
  
  const result = await pool.query(
    "SELECT id, name, is_available FROM hotels WHERE id = $1",
    [parseInt(id)]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Hotel');
  }
  
  const mappedHotel = hotelDTO.toAPI(result.rows[0]);
  res.json(createResponse(mappedHotel));
});

export const getAvailableHotels = asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.validated || req.query;
  
  const result = await pool.query(
    "SELECT id, name FROM hotels WHERE is_available = TRUE ORDER BY id LIMIT $1 OFFSET $2",
    [parseInt(limit), parseInt(offset)]
  );
  
  const mappedHotels = hotelDTO.toAPIArray(result.rows.map(row => ({
    ...row,
    is_available: true
  })));
  
  const response = createResponse(
    mappedHotels,
    null,
    createPagination(limit, offset, mappedHotels.length, mappedHotels.length)
  );
  
  res.json(response);
});

export const createHotel = asyncHandler(async (req, res) => {
  const validatedData = req.validated || req.body;
  const { name, is_available = true } = validatedData;
  
  const result = await pool.query(
    "INSERT INTO hotels (name, is_available) VALUES ($1, $2) RETURNING id, name, is_available",
    [name, is_available]
  );
  
  const mappedHotel = hotelDTO.toAPI(result.rows[0]);
  res.status(201).json(createResponse(mappedHotel, 'Hotel created successfully'));
});

export const updateHotel = asyncHandler(async (req, res) => {
  const { id } = req.validated || req.params;
  const updateData = req.validated || req.body;
  
  // Check if hotel exists
  const existingHotel = await pool.query(
    "SELECT id FROM hotels WHERE id = $1",
    [parseInt(id)]
  );
  
  if (existingHotel.rows.length === 0) {
    throw new NotFoundError('Hotel');
  }
  
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  if (updateData.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(updateData.name);
  }
  
  if (updateData.is_available !== undefined) {
    updates.push(`is_available = $${paramIndex++}`);
    values.push(updateData.is_available);
  }
  
  if (updates.length === 0) {
    const { statusCode, response } = createErrorResponse('No fields to update', 400);
    return res.status(statusCode).json(response);
  }
  
  values.push(parseInt(id));
  
  const result = await pool.query(
    `UPDATE hotels SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, is_available`,
    values
  );
  
  const mappedHotel = hotelDTO.toAPI(result.rows[0]);
  res.json(createResponse(mappedHotel, 'Hotel updated successfully'));
});

export const deleteHotel = asyncHandler(async (req, res) => {
  const { id } = req.validated || req.params;
  
  // Check if hotel exists
  const existingHotel = await pool.query(
    "SELECT id FROM hotels WHERE id = $1",
    [parseInt(id)]
  );
  
  if (existingHotel.rows.length === 0) {
    throw new NotFoundError('Hotel');
  }
  
  // Check if hotel is referenced by any tickets
  const ticketReference = await pool.query(
    "SELECT COUNT(*) FROM tickets WHERE hotel_id = $1",
    [parseInt(id)]
  );
  
  if (parseInt(ticketReference.rows[0].count) > 0) {
    const { statusCode, response } = createErrorResponse('Cannot delete hotel with associated tickets', 400);
    return res.status(statusCode).json(response);
  }
  
  const result = await pool.query(
    "DELETE FROM hotels WHERE id = $1 RETURNING id, name",
    [parseInt(id)]
  );
  
  res.json(createResponse(
    { deletedId: parseInt(id), deleted: true },
    'Hotel deleted successfully'
  ));
});
});

/**
 * Get hotel by ID
 */
export const getHotelById = asyncHandler(async (req, res) => {
  const { id } = req.validated || req.params;
  
  const result = await pool.query(
    "SELECT id, name, is_available FROM hotels WHERE id = $1",
    [parseInt(id)]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Hotel');
  }
  
  res.json({
    data: result.rows[0],
    timestamp: new Date().toISOString()
  });
});

/**
 * Get only available hotels
 */
export const getAvailableHotels = asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.validated || req.query;
  
  const result = await pool.query(
    "SELECT id, name FROM hotels WHERE is_available = TRUE ORDER BY id LIMIT $1 OFFSET $2",
    [parseInt(limit), parseInt(offset)]
  );
  
  res.json({
    data: result.rows,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      count: result.rows.length
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Create new hotel
 */
export const createHotel = asyncHandler(async (req, res) => {
  const { name, is_available = true } = req.validated || req.body;
  
  const result = await pool.query(
    "INSERT INTO hotels (name, is_available) VALUES ($1, $2) RETURNING id, name, is_available",
    [name, is_available]
  );
  
  res.status(201).json({
    data: result.rows[0],
    message: 'Hotel created successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * Update hotel
 */
export const updateHotel = asyncHandler(async (req, res) => {
  const { id } = req.validated || req.params;
  const updateData = req.validated || req.body;
  
  // Check if hotel exists
  const existingHotel = await pool.query(
    "SELECT id FROM hotels WHERE id = $1",
    [parseInt(id)]
  );
  
  if (existingHotel.rows.length === 0) {
    throw new NotFoundError('Hotel');
  }
  
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  if (updateData.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(updateData.name);
  }
  
  if (updateData.is_available !== undefined) {
    updates.push(`is_available = $${paramIndex++}`);
    values.push(updateData.is_available);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({
      error: 'No fields to update',
      timestamp: new Date().toISOString()
    });
  }
  
  values.push(parseInt(id));
  
  const result = await pool.query(
    `UPDATE hotels SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, is_available`,
    values
  );
  
  res.json({
    data: result.rows[0],
    message: 'Hotel updated successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * Delete hotel
 */
export const deleteHotel = asyncHandler(async (req, res) => {
  const { id } = req.validated || req.params;
  
  // Check if hotel exists
  const existingHotel = await pool.query(
    "SELECT id FROM hotels WHERE id = $1",
    [parseInt(id)]
  );
  
  if (existingHotel.rows.length === 0) {
    throw new NotFoundError('Hotel');
  }
  
  // Check if hotel is referenced by any tickets
  const ticketReference = await pool.query(
    "SELECT COUNT(*) FROM tickets WHERE hotel_id = $1",
    [parseInt(id)]
  );
  
  if (parseInt(ticketReference.rows[0].count) > 0) {
    return res.status(400).json({
      error: 'Cannot delete hotel with associated tickets',
      timestamp: new Date().toISOString()
    });
  }
  
  const result = await pool.query(
    "DELETE FROM hotels WHERE id = $1 RETURNING id, name",
    [parseInt(id)]
  );
  
  res.json({
    data: result.rows[0],
    message: 'Hotel deleted successfully',
    timestamp: new Date().toISOString()
  });
});