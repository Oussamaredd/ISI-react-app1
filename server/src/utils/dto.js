/**
 * DTO (Data Transfer Object) mappers
 * Standardizes API field names between database and client
 * Uses snake_case in database, camelCase in API responses
 */

/**
 * Ticket DTO mappers
 */
export const ticketDTO = {
  /**
   * Convert database row to API response format
   */
  toAPI: (dbRow) => {
    if (!dbRow) return null;
    
    return {
      id: dbRow.id,
      name: dbRow.name,
      price: parseFloat(dbRow.price),
      status: dbRow.status,
      hotelId: dbRow.hotel_id,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  },

  /**
   * Convert API request body to database format
   */
  fromAPI: (apiData) => {
    if (!apiData) return {};
    
    return {
      id: apiData.id,
      name: apiData.name,
      price: apiData.price,
      status: apiData.status,
      hotel_id: apiData.hotelId,
      created_at: apiData.createdAt,
      updated_at: apiData.updatedAt
    };
  },

  /**
   * Convert array of database rows to API format
   */
  toAPIArray: (dbRows) => {
    return dbRows.map(row => ticketDTO.toAPI(row));
  }
};

/**
 * Hotel DTO mappers
 */
export const hotelDTO = {
  /**
   * Convert database row to API response format
   */
  toAPI: (dbRow) => {
    if (!dbRow) return null;
    
    return {
      id: dbRow.id,
      name: dbRow.name,
      isAvailable: dbRow.is_available,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  },

  /**
   * Convert API request body to database format
   */
  fromAPI: (apiData) => {
    if (!apiData) return {};
    
    return {
      id: apiData.id,
      name: apiData.name,
      is_available: apiData.isAvailable,
      created_at: apiData.createdAt,
      updated_at: apiData.updatedAt
    };
  },

  /**
   * Convert array of database rows to API format
   */
  toAPIArray: (dbRows) => {
    return dbRows.map(row => hotelDTO.toAPI(row));
  }
};

/**
 * User DTO mappers
 */
export const userDTO = {
  /**
   * Convert database row to API response format (excludes sensitive data)
   */
  toAPI: (dbRow) => {
    if (!dbRow) return null;
    
    return {
      id: dbRow.id,
      googleId: dbRow.google_id,
      email: dbRow.email,
      name: dbRow.name,
      role: dbRow.role,
      createdAt: dbRow.created_at
    };
  },

  /**
   * Convert API request body to database format
   */
  fromAPI: (apiData) => {
    if (!apiData) return {};
    
    return {
      id: apiData.id,
      google_id: apiData.googleId,
      email: apiData.email,
      name: apiData.name,
      role: apiData.role,
      created_at: apiData.createdAt
    };
  },

  /**
   * Convert array of database rows to API format
   */
  toAPIArray: (dbRows) => {
    return dbRows.map(row => userDTO.toAPI(row));
  }
};

/**
 * Response wrapper for consistent API responses
 */
export const createResponse = (data, message = null, pagination = null) => {
  const response = {
    data,
    timestamp: new Date().toISOString()
  };
  
  if (message) {
    response.message = message;
  }
  
  if (pagination) {
    response.pagination = pagination;
  }
  
  return response;
};

/**
 * Error response wrapper
 */
export const createErrorResponse = (error, statusCode = 500, details = null) => {
  const response = {
    error: typeof error === 'string' ? error : error.message,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    response.details = details;
  }
  
  return { statusCode, response };
};

/**
 * Pagination metadata creator
 */
export const createPagination = (limit, offset, total, count) => {
  return {
    limit: parseInt(limit),
    offset: parseInt(offset),
    total: parseInt(total),
    count: parseInt(count),
    hasMore: (parseInt(offset) + parseInt(count)) < parseInt(total)
  };
};