// Health check endpoints
export const healthCheck = async (req, res) => {
  try {
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

    // Don't expose sensitive info in production
    if (process.env.NODE_ENV === 'production') {
      delete health.memory;
      delete health.environment;
    }

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
};

export const readinessCheck = async (req, res) => {
  try {
    // Check database connection
    const { pool } = await import('../config/db.js');
    const result = await pool.query('SELECT 1 as health_check');
    
    if (result.rows[0].health_check === 1) {
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

// Liveness probe - simple check
export const livenessCheck = async (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
};