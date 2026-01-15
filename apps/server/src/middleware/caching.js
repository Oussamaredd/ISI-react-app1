import { performanceMonitor } from '../monitoring/performanceMonitor.js';

class CacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 1000;
    this.hitCount = 0;
    this.missCount = 0;
    
    // Cleanup expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  set(key, value, customTTL) {
    const ttl = customTTL || this.ttl;
    const expiration = Date.now() + ttl;
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      value,
      expiration
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      return null;
    }
    
    if (Date.now() > item.expiration) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }
    
    this.hitCount++;
    return item.value;
  }

  has(key) {
    const item = this.cache.get(key);
    return item && Date.now() <= item.expiration;
  }

  delete(key) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiration) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount),
      hits: this.hitCount,
      misses: this.missCount
    };
  }

  clear() {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
}

// Memory cache instance
const memoryCache = new CacheManager({
  ttl: 300000,      // 5 minutes
  maxSize: 1000       // Max 1000 items
});

export class CachingService {
  static async middleware(req, res, next) {
    const startTime = Date.now();
    const cacheKey = CachingService.generateCacheKey(req);
    
    // Check if we have cached response
    if (req.method === 'GET' && memoryCache.has(cacheKey)) {
      const cachedData = memoryCache.get(cacheKey);
      
      if (cachedData) {
        performanceMonitor.recordCacheHit(cacheKey, startTime);
        
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        res.setHeader('X-Cache-Age', Math.max(0, cachedData.expiration - Date.now()));
        
        return res.json(cachedData.value);
      }
    }
    
    // Continue with request
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Override send/json to cache the response
    res.send = function(data) {
      if (req.method === 'GET' && res.statusCode === 200) {
        memoryCache.set(cacheKey, {
          value: data,
          expiration: Date.now() + 300000 // 5 minutes
        });
        
        performanceMonitor.recordCacheSet(cacheKey, startTime);
        
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
      }
      
      originalSend.call(this, data);
    };
    
    res.json = function(data) {
      if (req.method === 'GET' && res.statusCode === 200) {
        memoryCache.set(cacheKey, {
          value: data,
          expiration: Date.now() + 300000 // 5 minutes
        });
        
        performanceMonitor.recordCacheSet(cacheKey, startTime);
        
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
      }
      
      originalJson.call(this, data);
    };
    
    next();
  }

  static generateCacheKey(req) {
    const url = req.originalUrl || req.url;
    const userAgent = req.get('User-Agent') || '';
    const user = req.user?.id || 'anonymous';
    
    // Create a cache key based on URL and user context
    return `${req.method}:${url}:${user}:${Buffer.from(userAgent).toString('base64').substring(0, 20)}`;
  }

  static async get(key) {
    return memoryCache.get(key);
  }

  static async set(key, value, ttl) {
    memoryCache.set(key, value, ttl);
  }

  static async delete(key) {
    memoryCache.delete(key);
  }

  static getCacheStats() {
    return memoryCache.getStats();
  }

  static clearCache() {
    memoryCache.clear();
  }
}

export { CachingService, memoryCache };