import { performanceMonitor } from '../monitoring/performanceMonitor.js';

// Request timing middleware
export function requestTimingMiddleware(req, res, next) {
  const startTime = process.hrtime.bigint();
  
  // Add unique request ID
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Log request start
  console.log(`[${requestId}] ${req.method} ${req.url} - Request started`);
  
  // Override res.end to measure response time
  const originalEnd = res.end;
  const originalJson = res.json;
  
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Record metrics
    performanceMonitor.recordAPIRequest(
      req.url,
      req.method,
      duration,
      res.statusCode,
      res.get('Content-Length') || 0
    );
    
    // Log request completion
    console.log(`[${requestId}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    
    // Add performance headers
    res.setHeader('X-Response-Time', duration);
    res.setHeader('X-Server-Timing', `req;dur=${duration}`);
    
    originalEnd.apply(this, args);
  };
  
  res.json = function(...args) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;
    
    performanceMonitor.recordAPIRequest(
      req.url,
      req.method,
      duration,
      200,
      JSON.stringify(args[0]).length
    );
    
    console.log(`[${requestId}] ${req.method} ${req.url} - 200 - ${duration}ms`);
    
    res.setHeader('X-Response-Time', duration);
    res.setHeader('X-Server-Timing', `req;dur=${duration}`);
    
    originalJson.apply(this, args);
  };
  
  next();
}

// Memory usage monitoring
export function memoryMonitoringMiddleware(req, res, next) {
  const memUsage = process.memoryUsage();
  
  // Record memory metrics
  performanceMonitor.recordMemoryUsage({
    type: 'server_memory',
    rss: memUsage.rss,
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    external: memUsage.external,
    arrayBuffers: memUsage.arrayBuffers
  });
  
  // Alert on high memory usage
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
  const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  if (usagePercent > 80) {
    console.warn(`High memory usage: ${usagePercent.toFixed(2)}% (${heapUsedMB.toFixed(2)}MB/${heapTotalMB.toFixed(2)}MB)`);
    
    // Could trigger garbage collection or alerting
    if (global.gc) {
      global.gc();
    }
  }
  
  res.setHeader('X-Memory-Usage', `${usagePercent.toFixed(2)}%`);
  
  next();
}

// Database query monitoring
export function databaseMonitoringMiddleware(req, res, next) {
  // Override pool query to monitor database performance
  const originalQuery = req.app.locals.pool.query;
  
  req.app.locals.pool.query = async function(text, params, callback) {
    const startTime = process.hrtime.bigint();
    
    try {
      const result = await originalQuery.call(this, text, params, callback);
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      performanceMonitor.recordDatabaseQuery(text, duration, result?.rows?.length || 0);
      
      if (duration > 500) {
        console.warn(`Slow query detected (${duration}ms): ${text.substring(0, 100)}`);
      }
      
      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      performanceMonitor.recordDatabaseQuery(text, duration, 0, true);
      console.error(`Query error (${duration}ms): ${text.substring(0, 100)}`, error);
      
      throw error;
    }
  };
  
  next();
}

// Error rate monitoring
export function errorRateMonitoringMiddleware(err, req, res, next) {
  if (err) {
    performanceMonitor.recordAPIRequest(
      req.url,
      req.method,
      0,
      500,
      0,
      true
    );
    
    console.error(`[${req.requestId || 'unknown'}] ${req.method} ${req.url} - ERROR:`, err.message);
  }
  
  next(err);
}

// Combined performance monitoring middleware
export function createPerformanceMiddleware() {
  return [
    requestTimingMiddleware,
    memoryMonitoringMiddleware,
    databaseMonitoringMiddleware,
    errorRateMonitoringMiddleware
  ];
}