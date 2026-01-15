import { Request, Response } from 'express';
import { performance } from 'perf_hooks';
import { config } from '../config';
import { db } from '../database';
import { metricsService } from '../services/metrics';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckItem;
    redis: HealthCheckItem;
    memory: HealthCheckItem;
    disk: HealthCheckItem;
    dependencies: HealthCheckItem;
  };
  metrics: {
    responseTime: number;
    activeConnections: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

interface HealthCheckItem {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

class HealthCheckService {
  private startTime: number;
  private dependencies: Map<string, () => Promise<boolean>>;

  constructor() {
    this.startTime = Date.now();
    this.dependencies = new Map();
    this.setupDefaultDependencies();
  }

  private setupDefaultDependencies(): void {
    // Database health check
    this.dependencies.set('database', async () => {
      const start = performance.now();
      try {
        await db.raw('SELECT 1');
        const responseTime = performance.now() - start;
        return responseTime < 1000; // Database should respond within 1 second
      } catch (error) {
        return false;
      }
    });

    // Redis health check (if configured)
    if (config.redis.url) {
      this.dependencies.set('redis', async () => {
        const start = performance.now();
        try {
          const redis = require('redis');
          const client = redis.createClient({ url: config.redis.url });
          await client.connect();
          await client.ping();
          await client.disconnect();
          const responseTime = performance.now() - start;
          return responseTime < 500; // Redis should respond within 500ms
        } catch (error) {
          return false;
        }
      });
    }
  }

  async checkDatabase(): Promise<HealthCheckItem> {
    const start = performance.now();
    try {
      // Test database connection with a simple query
      await db.raw('SELECT 1 as health_check');
      
      // Get connection pool status
      const pool = db.client.pool;
      const poolStats = {
        used: pool.numUsed(),
        free: pool.numFree(),
        pending: pool.numPendingAcquires(),
        total: pool.numUsed() + pool.numFree(),
      };

      const responseTime = performance.now() - start;

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime: Math.round(responseTime),
        details: {
          pool: poolStats,
          threshold: '1000ms'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  async checkRedis(): Promise<HealthCheckItem> {
    const start = performance.now();
    try {
      if (!config.redis.url) {
        return {
          status: 'healthy',
          details: { message: 'Redis not configured' }
        };
      }

      const redis = require('redis');
      const client = redis.createClient({ 
        url: config.redis.url,
        socket: {
          connectTimeout: 5000
        }
      });

      await client.connect();
      const pong = await client.ping();
      await client.disconnect();

      const responseTime = performance.now() - start;

      return {
        status: responseTime < 500 && pong === 'PONG' ? 'healthy' : 'degraded',
        responseTime: Math.round(responseTime),
        details: {
          ping: pong,
          threshold: '500ms'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Redis connection failed'
      };
    }
  }

  checkMemory(): HealthCheckItem {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = (usedMem / totalMem) * 100;

    // Node.js process memory limits
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (heapUsagePercent > 90 || memoryUsagePercent > 90) {
      status = 'unhealthy';
    } else if (heapUsagePercent > 75 || memoryUsagePercent > 75) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        process: {
          heap: {
            used: `${Math.round(heapUsedMB)}MB`,
            total: `${Math.round(heapTotalMB)}MB`,
            usage: `${Math.round(heapUsagePercent)}%`
          },
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
        },
        system: {
          total: `${Math.round(totalMem / 1024 / 1024)}MB`,
          used: `${Math.round(usedMem / 1024 / 1024)}MB`,
          free: `${Math.round(freeMem / 1024 / 1024)}MB`,
          usage: `${Math.round(memoryUsagePercent)}%`
        },
        thresholds: {
          healthy: '< 75%',
          degraded: '75-90%',
          unhealthy: '> 90%'
        }
      }
    };
  }

  checkDisk(): HealthCheckItem {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Check upload directory
      const uploadDir = config.upload.path;
      const stats = fs.statSync(uploadDir);
      
      // Get disk space (simplified check)
      const diskUsage = process.platform === 'win32' 
        ? this.getWindowsDiskSpace(path.parse(uploadDir).root)
        : this.getUnixDiskSpace(path.parse(uploadDir).root);

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (diskUsage.usage > 90) {
        status = 'unhealthy';
      } else if (diskUsage.usage > 80) {
        status = 'degraded';
      }

      return {
        status,
        details: {
          uploadDir: {
            path: uploadDir,
            writable: stats ? true : false,
            exists: stats ? true : false
          },
          disk: diskUsage,
          thresholds: {
            healthy: '< 80%',
            degraded: '80-90%',
            unhealthy: '> 90%'
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Disk check failed'
      };
    }
  }

  private getWindowsDiskSpace(drive: string): any {
    // Simplified Windows disk space check
    // In production, you might want to use a proper library
    return {
      total: 'N/A',
      free: 'N/A',
      used: 'N/A',
      usage: 0,
      note: 'Windows disk space monitoring not implemented'
    };
  }

  private getUnixDiskSpace(mountPoint: string): any {
    try {
      const fs = require('fs');
      const stats = fs.statSync(mountPoint);
      // This is a simplified version - in production use proper disk space checking
      return {
        total: 'N/A',
        free: 'N/A',
        used: 'N/A',
        usage: 0,
        note: 'Disk space monitoring simplified'
      };
    } catch (error) {
      return {
        total: 'N/A',
        free: 'N/A',
        used: 'N/A',
        usage: 0,
        error: 'Unable to check disk space'
      };
    }
  }

  async checkDependencies(): Promise<HealthCheckItem> {
    const results: { [key: string]: HealthCheckItem } = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const [name, checkFn] of this.dependencies) {
      const start = performance.now();
      try {
        const isHealthy = await checkFn();
        const responseTime = performance.now() - start;
        
        results[name] = {
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime: Math.round(responseTime)
        };

        if (!isHealthy) {
          overallStatus = 'unhealthy';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Dependency check failed'
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      details: results
    };
  }

  async getHealthCheck(): Promise<HealthCheckResult> {
    const start = performance.now();
    
    // Run all health checks in parallel
    const [database, redis, memory, disk, dependencies] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      Promise.resolve(this.checkMemory()),
      Promise.resolve(this.checkDisk()),
      this.checkDependencies()
    ]);

    const responseTime = performance.now() - start;

    // Determine overall status
    const allChecks = [database, redis, memory, disk, dependencies];
    const hasUnhealthy = allChecks.some(check => check.status === 'unhealthy');
    const hasDegraded = allChecks.some(check => check.status === 'degraded');
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: config.env,
      checks: {
        database,
        redis,
        memory,
        disk,
        dependencies
      },
      metrics: {
        responseTime: Math.round(responseTime),
        activeConnections: 0, // Could be tracked via middleware
        memoryUsage: process.memoryUsage()
      }
    };
  }

  async getLivenessProbe(): Promise<{ status: string; timestamp: string }> {
    // Simple liveness check - just check if the process is running
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }

  async getReadinessProbe(): Promise<{ status: string; timestamp: string; checks: any }> {
    // Readiness check - verify essential dependencies
    const database = await this.checkDatabase();
    const redis = await this.checkRedis();
    
    const isReady = database.status === 'healthy' && 
                   (redis.status === 'healthy' || redis.details?.message === 'Redis not configured');

    return {
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: database.status,
        redis: redis.status
      }
    };
  }
}

export const healthCheckService = new HealthCheckService();

// Health check endpoints
export async function healthCheck(req: Request, res: Response): Promise<void> {
  try {
    const health = await healthCheckService.getHealthCheck();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
}

export async function livenessProbe(req: Request, res: Response): Promise<void> {
  try {
    const liveness = await healthCheckService.getLivenessProbe();
    res.status(200).json(liveness);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Liveness probe failed'
    });
  }
}

export async function readinessProbe(req: Request, res: Response): Promise<void> {
  try {
    const readiness = await healthCheckService.getReadinessProbe();
    const statusCode = readiness.status === 'ready' ? 200 : 503;
    res.status(statusCode).json(readiness);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Readiness probe failed'
    });
  }
}