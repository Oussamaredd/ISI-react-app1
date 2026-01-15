// Security enhancements middleware for production protection
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import csrf from 'csurf';

export function createSecurityMiddleware(options = {}) {
  const {
    rateLimit: rateLimitOptions = {},
    ddosProtection: ddosOptions = {},
    sqlInjection = true,
    csrfProtection = true,
    inputValidation = true
  } = options;

  const middleware = [];

  // Rate limiting
  if (rateLimitOptions.enabled !== false) {
    const limiter = rateLimit({
      windowMs: rateLimitOptions.windowMs || 60000, // 1 minute
      max: rateLimitOptions.maxRequests || 100,
      message: rateLimitOptions.message || 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    });
    middleware.push(limiter);
  }

  // Helmet for security headers
  middleware.push(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // SQL injection protection
  if (sqlInjection) {
    middleware.push(mongoSanitize());
  }

  // XSS protection
  if (inputValidation) {
    middleware.push((req, res, next) => {
      // Basic XSS protection
      if (req.body) {
        Object.keys(req.body).forEach(key => {
          if (typeof req.body[key] === 'string') {
            req.body[key] = xss(req.body[key]);
          }
        });
      }
      next();
    });
  }

  // CSRF protection
  if (csrfProtection && process.env.NODE_ENV === 'production') {
    middleware.push(csrf({ cookie: true }));
  }

  return middleware;
}
export function setupFrontendPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Monitor Core Web Vitals
  if ('PerformanceObserver' in window) {
    const vitalsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        const metric = {
          name: entry.name,
          value: entry.value || entry.startTime,
          rating: this.getPerformanceRating(entry),
          timestamp: Date.now()
        };

        // Send to backend for tracking
        this.sendMetricToBackend(metric);
      });
    });

    vitalsObserver.observe({
      entryTypes: [
        'largest-contentful-paint',
        'first-input',
        'cumulative-layout-shift',
        'first-contentful-paint',
        'largest-contentful-paint',
        'interaction-to-next-paint'
      ]
    });
  }

  // Monitor navigation timing
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      const navMetric = {
        type: 'navigation',
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        ssl: navigation.secureConnectionStart - navigation.connectStart,
        ttfb: navigation.responseStart - navigation.requestStart,
        download: navigation.responseEnd - navigation.responseStart,
        domInteractive: navigation.domContentLoadedEventStart - navigation.navigationStart,
        domComplete: navigation.domCompleteEventStart - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        timestamp: Date.now()
      };

      this.sendMetricToBackend(navMetric);
    }
  });

  // Monitor resource loading
  if ('PerformanceObserver' in window) {
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.name.startsWith('http')) {
          const resourceMetric = {
            type: 'resource',
            name: entry.name,
            size: entry.transferSize || 0,
            duration: entry.duration,
            cached: entry.transferSize === 0 && entry.duration < 10,
            timestamp: Date.now()
          };

          this.sendMetricToBackend(resourceMetric);
        }
      });
    });

    resourceObserver.observe({ entryTypes: ['resource'] });
  }

  // Monitor user interactions
  let interactionCount = 0;
  document.addEventListener('click', () => {
    interactionCount++;
    if (interactionCount % 100 === 0) {
      this.sendMetricToBackend({
        type: 'user_interaction',
        name: 'click',
        count: interactionCount,
        timestamp: Date.now()
      });
    }
  });

  // Monitor memory usage
  if ('memory' in performance) {
    setInterval(() => {
      const memoryInfo = performance.memory;
      const memoryMetric = {
        type: 'memory',
        used: memoryInfo.usedJSHeapSize,
        total: memoryInfo.totalJSHeapSize,
        limit: memoryInfo.jsHeapSizeLimit,
        usagePercent: (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100,
        timestamp: Date.now()
      };

      this.sendMetricToBackend(memoryMetric);
    }, 30000); // Every 30 seconds
  }

  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.duration > 50) { // Long task threshold
          this.sendMetricToBackend({
            type: 'long_task',
            name: entry.name || 'unknown',
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: Date.now()
          });
        }
      });
    });

    longTaskObserver.observe({ entryTypes: ['longtask'] });
  }
}

// Performance rating utility
function getPerformanceRating(entry) {
  if (entry.name === 'largest-contentful-paint') {
    if (entry.startTime < 2500) return 'good';
    if (entry.startTime < 4000) return 'needs-improvement';
    return 'poor';
  }

  if (entry.name === 'first-input') {
    if (entry.processingStart - entry.startTime < 100) return 'good';
    if (entry.processingStart - entry.startTime < 300) return 'needs-improvement';
    return 'poor';
  }

  if (entry.name === 'cumulative-layout-shift') {
    if (entry.value < 0.1) return 'good';
    if (entry.value < 0.25) return 'needs-improvement';
    return 'poor';
  }

  return 'unknown';
}

// Metric reporting utility
function sendMetricToBackend(metric) {
  // Send metrics to backend endpoint
  fetch('/api/metrics/frontend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metric)
  }).catch(error => {
    console.error('Failed to send frontend metric:', error);
  });
}

// Performance marks for measuring specific operations
window.markPerformance = (name) => {
  if ('performance' in window && 'mark' in performance) {
    performance.mark(name);
  }
};

window.measurePerformance = (name, startMark, endMark) => {
  if ('performance' in window && 'measure' in performance) {
    performance.measure(name, startMark, endMark);
  }
};

// Initialize monitoring if on client side
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFrontendPerformanceMonitoring);
  } else {
    setupFrontendPerformanceMonitoring();
  }
}