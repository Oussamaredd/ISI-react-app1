/**
 * Error handling middleware
 * Provides consistent error responses and proper error logging
 */

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.statusCode = 400;
  }
}

export class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

export class DatabaseError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.originalError = originalError;
  }
}

/**
 * Main error handling middleware
 */
export const errorHandler = (error, req, res, next) => {
  // Log error for debugging
  console.error('Error occurred:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle different error types
  let statusCode = 500;
  let errorResponse = {
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  };

  // Validation errors
  if (error.name === 'ValidationError' || error.name === 'ZodError') {
    statusCode = 400;
    errorResponse = {
      error: 'Validation failed',
      details: error.details || error.errors?.map(err => ({
        field: err.path?.join('.') || 'unknown',
        message: err.message
      })),
      timestamp: new Date().toISOString()
    };
  }
  
  // Not found errors
  else if (error.name === 'NotFoundError' || error.message?.includes('not found')) {
    statusCode = 404;
    errorResponse = {
      error: error.message || 'Resource not found',
      timestamp: new Date().toISOString()
    };
  }
  
  // Conflict errors
  else if (error.name === 'ConflictError' || error.message?.includes('duplicate')) {
    statusCode = 409;
    errorResponse = {
      error: error.message || 'Resource conflict',
      timestamp: new Date().toISOString()
    };
  }
  
  // Database errors
  else if (error.name === 'DatabaseError') {
    statusCode = 500;
    errorResponse = {
      error: 'Database operation failed',
      timestamp: new Date().toISOString()
    };
  }
  
  // JWT/Authentication errors
  else if (error.name === 'JsonWebTokenError' || error.name === 'AuthenticationError') {
    statusCode = 401;
    errorResponse = {
      error: 'Authentication failed',
      timestamp: new Date().toISOString()
    };
  }
  
  // Authorization errors
  else if (error.name === 'AuthorizationError' || error.message?.includes('unauthorized')) {
    statusCode = 403;
    errorResponse = {
      error: 'Access denied',
      timestamp: new Date().toISOString()
    };
  }
  
  // Rate limiting errors
  else if (error.name === 'RateLimitError') {
    statusCode = 429;
    errorResponse = {
      error: 'Too many requests',
      retryAfter: error.retryAfter || '15 minutes',
      timestamp: new Date().toISOString()
    };
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.error = 'Internal server error';
  } else if (process.env.NODE_ENV !== 'production') {
    errorResponse.debug = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};