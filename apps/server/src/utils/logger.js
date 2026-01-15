import { randomUUID } from 'crypto';

// Structured logging utility with requestId and correlationId
export class StructuredLogger {
  constructor(serviceName = 'express-backend') {
    this.serviceName = serviceName;
  }

  // Generate unique request ID
  generateRequestId() {
    return randomUUID();
  }

  // Create structured log object
  createLogObject(level, message, meta = {}) {
    const logObject = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: this.serviceName,
      message,
      requestId: meta.requestId,
      correlationId: meta.correlationId,
      ...meta,
    };

    return logObject;
  }

  // Logging methods
  info(message, meta = {}) {
    const logObject = this.createLogObject('info', message, meta);
    console.log(JSON.stringify(logObject));
    return logObject;
  }

  error(message, meta = {}) {
    const logObject = this.createLogObject('error', message, meta);
    console.error(JSON.stringify(logObject));
    return logObject;
  }

  warn(message, meta = {}) {
    const logObject = this.createLogObject('warn', message, meta);
    console.warn(JSON.stringify(logObject));
    return logObject;
  }

  debug(message, meta = {}) {
    const logObject = this.createLogObject('debug', message, meta);
    console.debug(JSON.stringify(logObject));
    return logObject;
  }
}

// Create global logger instance
export const logger = new StructuredLogger();

// Middleware to add requestId to request
export const requestLoggingMiddleware = (req, res, next) => {
  req.requestId = logger.generateRequestId();
  
  // Log request start
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId: req.requestId,
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      requestId: req.requestId,
      duration: Date.now() - req.startTime,
    });
    originalEnd.call(this, chunk, encoding);
  };

  req.startTime = Date.now();
  next();
};