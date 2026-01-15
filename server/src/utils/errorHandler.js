// Centralized error handling for consistent API responses

/**
 * Error response formatter
 */
export const formatError = (res, error, statusCode = 500) => {
  const response = {
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Success response formatter
 */
export const formatSuccess = (res, data, message = null, statusCode = 200) => {
  const response = {
    data,
    timestamp: new Date().toISOString()
  };

  if (message) {
    response.message = message;
  }

  res.status(statusCode).json(response);
};

/**
 * Async error handler wrapper
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handling middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (res.headersSent) {
    return next(err);
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return formatError(res, err, 400);
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    return formatError(res, new Error('Resource already exists'), 409);
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return formatError(res, new Error('Invalid reference'), 400);
  }

  // Default error
  formatError(res, err);
};

/**
 * 404 handler
 */
export const notFoundHandler = (req, res) => {
  formatError(res, new Error(`Route ${req.method} ${req.path} not found`), 404);
};