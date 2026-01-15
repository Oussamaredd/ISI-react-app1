import { z } from 'zod';

/**
 * Zod validation schemas for API endpoints
 * Provides type-safe input validation with clean error messages
 */

// Base numeric validation
const priceValidation = z
  .number({
    required_error: 'Price is required',
    invalid_type_error: 'Price must be a number'
  })
  .positive('Price must be greater than 0')
  .max(999999.99, 'Price cannot exceed 999,999.99')
  .refine((val) => Number.isFinite(val), 'Price must be a finite number');

// Text validation helpers
const nameValidation = z
  .string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be a string'
  })
  .trim()
  .min(1, 'Name cannot be empty')
  .max(255, 'Name cannot exceed 255 characters')
  .refine((val) => !val.includes('<script>'), 'Name contains invalid characters');

const hotelNameValidation = z
  .string({
    required_error: 'Hotel name is required',
    invalid_type_error: 'Hotel name must be a string'
  })
  .trim()
  .min(1, 'Hotel name cannot be empty')
  .max(255, 'Hotel name cannot exceed 255 characters');

// Ticket validation schemas
export const ticketSchemas = {
  create: z.object({
    name: nameValidation,
    price: priceValidation,
    status: z
      .enum(['OPEN', 'COMPLETED'], {
        required_error: 'Status is required',
        invalid_type_error: 'Status must be either OPEN or COMPLETED'
      })
      .optional()
      .default('OPEN'),
    hotel_id: z
      .number({
        invalid_type_error: 'Hotel ID must be a number'
      })
      .int('Hotel ID must be an integer')
      .positive('Hotel ID must be positive')
      .optional()
      .nullable()
  }),

  update: z.object({
    name: nameValidation.optional(),
    price: priceValidation.optional(),
    status: z
      .enum(['OPEN', 'COMPLETED'], {
        invalid_type_error: 'Status must be either OPEN or COMPLETED'
      })
      .optional(),
    hotel_id: z
      .number({
        invalid_type_error: 'Hotel ID must be a number'
      })
      .int('Hotel ID must be an integer')
      .positive('Hotel ID must be positive')
      .nullable()
      .optional()
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  ),

  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(
        z
          .number({
            invalid_type_error: 'Ticket ID must be a number'
          })
          .int('Ticket ID must be an integer')
          .positive('Ticket ID must be positive')
      )
  }),

  query: z.object({
    status: z
      .enum(['OPEN', 'COMPLETED'])
      .optional(),
    hotel_id: z
      .string()
      .transform((val) => val ? parseInt(val, 10) : undefined)
      .pipe(
        z
          .number()
          .int()
          .positive()
          .optional()
      )
      .optional(),
    limit: z
      .string()
      .transform((val) => val ? parseInt(val, 10) : undefined)
      .pipe(
        z
          .number()
          .int()
          .positive()
          .max(100, 'Limit cannot exceed 100')
          .optional()
          .default(20)
      )
      .optional(),
    offset: z
      .string()
      .transform((val) => val ? parseInt(val, 10) : undefined)
      .pipe(
        z
          .number()
          .int()
          .min(0, 'Offset cannot be negative')
          .optional()
          .default(0)
      )
      .optional()
  })
};

// Hotel validation schemas
export const hotelSchemas = {
  create: z.object({
    name: hotelNameValidation,
    is_available: z
      .boolean({
        invalid_type_error: 'is_available must be a boolean'
      })
      .optional()
      .default(true)
  }),

  update: z.object({
    name: hotelNameValidation.optional(),
    is_available: z
      .boolean({
        invalid_type_error: 'is_available must be a boolean'
      })
      .optional()
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  ),

  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(
        z
          .number({
            invalid_type_error: 'Hotel ID must be a number'
          })
          .int('Hotel ID must be an integer')
          .positive('Hotel ID must be positive')
      )
  }),

  query: z.object({
    is_available: z
      .string()
      .transform((val) => val === 'true' ? true : val === 'false' ? false : undefined)
      .pipe(
        z
          .boolean({
            invalid_type_error: 'is_available must be true or false'
          })
          .optional()
      )
      .optional(),
    limit: z
      .string()
      .transform((val) => val ? parseInt(val, 10) : undefined)
      .pipe(
        z
          .number()
          .int()
          .positive()
          .max(100, 'Limit cannot exceed 100')
          .optional()
          .default(20)
      )
      .optional(),
    offset: z
      .string()
      .transform((val) => val ? parseInt(val, 10) : undefined)
      .pipe(
        z
          .number()
          .int()
          .min(0, 'Offset cannot be negative')
          .optional()
          .default(0)
      )
      .optional()
  })
};

// User validation schemas
export const userSchemas = {
  update: z.object({
    name: z
      .string({
        invalid_type_error: 'Name must be a string'
      })
      .trim()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name cannot exceed 100 characters')
      .optional(),
    role: z
      .enum(['user', 'admin'], {
        invalid_type_error: 'Role must be either user or admin'
      })
      .optional()
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  )
};

/**
 * Validation middleware factory
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Request property to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        });
      }
      
      // Attach validated data to request
      req.validated = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        error: 'Internal validation error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Global validation error handler
 */
export const handleValidationError = (error, req, res, next) => {
  if (error.name === 'ZodError') {
    const errors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }
  
  next(error);
};