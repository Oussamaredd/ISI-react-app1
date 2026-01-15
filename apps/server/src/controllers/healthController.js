import { pool } from '../config/db.js';

/**
 * Health check endpoint with security considerations
 */
export const healthCheck = (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
    },
    version: process.env.npm_package_version || '1.0.0'
  };

  // Don't expose sensitive information in production
  if (process.env.NODE_ENV === 'production') {
    delete health.memory;
    delete health.environment;
  }

  res.status(200).json(health);
};

/**
 * Readiness check endpoint (for Kubernetes/container orchestration)
 */
export const readinessCheck = async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await pool.query('SELECT 1 as health_check');
    
    if (dbCheck.rows[0].health_check === 1) {
      res.status(200).json({
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};