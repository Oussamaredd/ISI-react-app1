import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * Security middleware configuration
 * Implements security best practices for Express.js
 */

// Rate limiting configuration
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks and metrics
  skip: (req) => req.path === '/health' || req.path === '/metrics'
});

// Stricter rate limiting for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful auth requests
});

// Helmet configuration for security headers
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false,
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // DNS Prefetch Control
  dnsPrefetchControl: true,
  
  // Frameguard
  frameguard: { action: 'deny' },
  
  // Hide Powered-By header
  hidePoweredBy: true,
  
  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // IE Compatibility
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permission Policy
  permissionPolicy: {
    features: [
      "geolocation",
      "microphone",
      "camera"
    ]
  },
  
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  // X-Content-Type-Options
  xContentTypeOptions: true,
  
  // X-DNS-Prefetch-Control
  xDnsPrefetchControl: true,
  
  // X-Download-Options
  xDownloadOptions: true,
  
  // X-Frame-Options
  xFrameOptions: 'DENY',
  
  // X-Permitted-Cross-Domain-Policies
  xPermittedCrossDomainPolicies: false,
  
  // X-XSS-Protection
  xXssProtection: '1; mode=block'
});

/**
 * Apply security middleware to Express app
 * @param {Express} app - Express application instance
 * @param {boolean} isProduction - Whether running in production
 */
export const applySecurityMiddleware = (app, isProduction = false) => {
  // Apply Helmet security headers
  app.use(helmetConfig);
  
  // Apply rate limiting
  app.use(rateLimiter);
  
  // Apply stricter rate limiting to auth routes
  app.use('/auth', authRateLimiter);
  
  // Trust proxy for rate limiting and security headers (when behind reverse proxy)
  if (isProduction) {
    app.set('trust proxy', 1);
  }
  
  console.log('🔒 Security middleware applied');
};