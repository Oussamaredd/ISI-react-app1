import { performanceMonitor } from '../monitoring/performanceMonitor.js';

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute window
    this.maxRequests = options.maxRequests || 100;
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
    this.message = options.message || 'Too many requests, please try again later.';
    
    this.clients = new Map();
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.windowMs);
  }

  middleware(req, res, next) {
    const now = Date.now();
    const clientIdentifier = this.getClientIdentifier(req);
    const clientData = this.clients.get(clientIdentifier);
    
    if (!clientData) {
      // Initialize client data
      this.clients.set(clientIdentifier, {
        requests: [{ timestamp: now, method: req.method }],
        resetTime: now + this.windowMs
      });
      
      req.rateLimit = {
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
      
      return next();
    }
    
    // Remove old requests outside window
    clientData.requests = clientData.requests.filter(
      request => request.timestamp > now - this.windowMs
    );
    
    // Count requests in current window
    let requestCount = clientData.requests.length;
    
    // Apply filters
    if (this.skipSuccessfulRequests) {
      requestCount = clientData.requests.filter(
        request => this.isLikelyFailedRequest(req, request.method)
      ).length;
    }
    
    if (this.skipFailedRequests) {
      requestCount = clientData.requests.filter(
        request => this.isLikelySuccessfulRequest(req, request.method)
      ).length;
    }
    
    // Update client data
    clientData.requests.push({ timestamp: now, method: req.method });
    clientData.resetTime = now + this.windowMs;
    
    req.rateLimit = {
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - requestCount),
      resetTime: clientData.resetTime,
      totalRequests: requestCount
    };
    
    if (requestCount >= this.maxRequests) {
      performanceMonitor.recordSecurityEvent('rate_limit_exceeded', {
        clientIdentifier,
        requestCount,
        windowMs: this.windowMs,
        endpoint: req.path
      });
      
      const retryAfter = Math.ceil(clientData.resetTime / 1000);
      
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - requestCount));
      res.setHeader('X-RateLimit-Reset', retryAfter);
      res.setHeader('Retry-After', retryAfter);
      
      return res.status(429).json({
        error: this.message,
        retryAfter,
        limit: this.maxRequests,
        remaining: 0
      });
    }
    
    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', this.maxRequests - requestCount);
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000));
    
    next();
  }

  getClientIdentifier(req) {
    // Try multiple identification methods
    return req.ip ||
           req.headers['x-forwarded-for'] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'unknown';
  }

  isLikelyFailedRequest(req, method) {
    // Consider POST, PUT, DELETE as potentially failing requests
    // Also consider requests to sensitive endpoints
    const sensitivePatterns = ['/api/admin/', '/api/login', '/api/auth'];
    const isSensitiveEndpoint = sensitivePatterns.some(pattern => req.path.includes(pattern));
    
    return ['POST', 'PUT', 'DELETE'].includes(method) || isSensitiveEndpoint;
  }

  isLikelySuccessfulRequest(req, method) {
    // Consider GET requests as successful
    // Also consider requests to data endpoints
    const dataPatterns = ['/api/tickets', '/api/hotels', '/api/dashboard'];
    const isDataEndpoint = dataPatterns.some(pattern => req.path.includes(pattern));
    
    return method === 'GET' || isDataEndpoint;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, clientData] of this.clients.entries()) {
      if (now > clientData.resetTime) {
        this.clients.delete(key);
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clients.clear();
  }
}

// DDoS Protection
class DDoSProtection {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.maxConcurrentConnections = options.maxConcurrentConnections || 100;
    this.suspensionTime = options.suspensionTime || 300000; // 5 minutes
    this.blockedIPs = new Map();
    
    this.activeConnections = new Map();
    this.suspiciousIPs = new Map();
    
    // Cleanup interval
    setInterval(() => {
      this.cleanupSuspensions();
    }, 60000); // Every minute
  }

  middleware(req, res, next) {
    if (!this.enabled) {
      return next();
    }

    const clientIP = this.getClientIP(req);
    const now = Date.now();
    
    // Check if IP is currently suspended
    if (this.blockedIPs.has(clientIP)) {
      const suspension = this.blockedIPs.get(clientIP);
      
      if (now < suspension.until) {
        performanceMonitor.recordSecurityEvent('blocked_request', {
          clientIP,
          reason: suspension.reason,
          blockedUntil: suspension.until
        });
        
        return res.status(403).json({
          error: 'Access temporarily suspended due to suspicious activity',
          retryAfter: suspension.until
        });
      }
    }
    
    // Track active connections
    const connectionKey = `${clientIP}_${req.path}`;
    const currentConnections = this.activeConnections.get(clientIP) || 0;
    
    if (currentConnections >= this.maxConcurrentConnections) {
      this.handleSuspiciousActivity(clientIP, 'too_many_connections');
      return res.status(429).json({
        error: 'Too many concurrent connections',
        retryAfter: new Date(now + 60000).toISOString()
      });
    }
    
    this.activeConnections.set(clientIP, currentConnections + 1);
    
    // Add connection cleanup
    res.on('finish', () => {
      const connections = this.activeConnections.get(clientIP) || 1;
      this.activeConnections.set(clientIP, Math.max(0, connections - 1));
    });
    
    next();
  }

  getClientIP(req) {
    return req.ip ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'unknown';
  }

  handleSuspiciousActivity(clientIP, reason) {
    console.warn(`Suspicious activity from ${clientIP}: ${reason}`);
    
    const now = Date.now();
    const suspiciousData = this.suspiciousIPs.get(clientIP) || { count: 0, firstSeen: now };
    
    suspiciousData.count++;
    this.suspiciousIPs.set(clientIP, suspiciousData);
    
    // Suspend after multiple suspicious activities
    if (suspiciousData.count >= 5) {
      this.blockIP(clientIP, reason);
    }
    
    performanceMonitor.recordSecurityEvent('suspicious_activity', {
      clientIP,
      reason,
      count: suspiciousData.count
    });
  }

  blockIP(clientIP, reason) {
    const suspension = {
      until: Date.now() + this.suspensionTime,
      reason
    };
    
    this.blockedIPs.set(clientIP, suspension);
    this.suspiciousIPs.delete(clientIP);
    
    console.warn(`IP ${clientIP} suspended until ${new Date(suspension.until).toISOString()} for ${reason}`);
  }

  cleanupSuspensions() {
    const now = Date.now();
    
    for (const [ip, suspension] of this.blockedIPs.entries()) {
      if (now >= suspension.until) {
        this.blockedIPs.delete(ip);
        console.log(`Suspension lifted for IP: ${ip}`);
      }
    }
    
    // Clean old suspicious IP data
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (now - data.firstSeen > 300000) { // 5 minutes
        this.suspiciousIPs.delete(ip);
      }
    }
  }

  getBlockedIPs() {
    return Array.from(this.blockedIPs.entries()).map(([ip, suspension]) => ({
      ip,
      suspendedUntil: new Date(suspension.until).toISOString(),
      reason: suspension.reason
    }));
  }

  destroy() {
    this.activeConnections.clear();
    this.blockedIPs.clear();
    this.suspiciousIPs.clear();
  }
}

// Factory functions for creating middleware
export function createRateLimiter(options) {
  const limiter = new RateLimiter(options);
  return limiter.middleware.bind(limiter);
}

export function createDDoSProtection(options) {
  const protection = new DDoSProtection(options);
  return protection.middleware.bind(protection);
}

// Combined security middleware
export function createSecurityMiddleware(options = {}) {
  const rateLimiter = new RateLimiter(options.rateLimit);
  const ddosProtection = new DDoSProtection(options.ddosProtection);
  
  return [
    (req, res, next) => {
      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'default-src \'self\'');
      
      next();
    },
    rateLimiter.middleware.bind(rateLimiter),
    ddosProtection.middleware.bind(ddosProtection)
  ];
}

// Memory-based rate limiting for higher performance
export class MemoryRateLimiter {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 10000; // Track last 10k requests
    this.requests = [];
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.maxRequests || 100;
  }

  middleware(req, res, next) {
    const now = Date.now();
    const requestData = {
      timestamp: now,
      ip: req.ip,
      method: req.method,
      path: req.path
    };
    
    // Add request to memory
    this.requests.push(requestData);
    
    // Keep only recent requests in memory
    this.requests = this.requests.filter(
      request => now - request.timestamp < this.windowMs
    );
    
    // Count requests from this IP in the window
    const recentRequests = this.requests.filter(
      request => request.ip === req.ip
    );
    
    const requestCount = recentRequests.length;
    
    if (requestCount >= this.maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        limit: this.maxRequests,
        windowMs: this.windowMs
      });
    }
    
    // Clean old requests periodically
    if (this.requests.length > this.maxSize) {
      this.requests = this.requests.slice(-this.maxSize);
    }
    
    next();
  }
}