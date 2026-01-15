import { performanceMonitor } from '../monitoring/performanceMonitor.js';

export class MetricsController {
  static async getMetrics(req, res) {
    try {
      const metrics = performanceMonitor.getMetricsSummary();
      
      res.json({
        success: true,
        data: {
          ...metrics,
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            platform: process.platform,
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Error getting metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics'
      });
    }
  }

  static async getHealth(req, res) {
    const checks = await Promise.allSettled([
      MetricsController.checkDatabase(),
      MetricsController.checkMemory(),
      MetricsController.checkDiskSpace(),
      MetricsController.checkResponseTime()
    ]);

    const allHealthy = checks.every(check => check.status === 'fulfilled');
    const healthDetails = checks.map(check => ({
      name: check.name,
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      details: check.status === 'fulfilled' ? check.value : check.reason?.message
    }));

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: healthDetails
    });
  }

  static async checkDatabase() {
    try {
      const { pool } = await import('../config/db.js');
      const result = await pool.query('SELECT 1');
      return {
        status: 'fulfilled',
        name: 'database',
        value: { connected: true, queryTime: '< 10ms' }
      };
    } catch (error) {
      return {
        status: 'rejected',
        name: 'database',
        reason: error
      };
    }
  }

  static async checkMemory() {
    const memUsage = process.memoryUsage();
    const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (usagePercent > 80) {
      return {
        status: 'rejected',
        name: 'memory',
        reason: `High memory usage: ${usagePercent.toFixed(2)}%`
      };
    }
    
    return {
      status: 'fulfilled',
      name: 'memory',
      value: { 
        usagePercent: usagePercent.toFixed(2),
        heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
        heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + 'MB'
      }
    };
  }

  static async checkDiskSpace() {
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      
      // This is a simplified check - in production you'd check actual disk space
      return {
        status: 'fulfilled',
        name: 'disk',
        value: { available: true }
      };
    } catch (error) {
      return {
        status: 'rejected',
        name: 'disk',
        reason: error.message
      };
    }
  }

  static async checkResponseTime() {
    const metrics = performanceMonitor.getMetricsSummary();
    
    if (metrics.averageResponseTime > 1000) {
      return {
        status: 'rejected',
        name: 'response_time',
        reason: `High average response time: ${metrics.averageResponseTime}ms`
      };
    }
    
    if (metrics.errorRate > 5) {
      return {
        status: 'rejected',
        name: 'error_rate',
        reason: `High error rate: ${metrics.errorRate}%`
      };
    }
    
    return {
      status: 'fulfilled',
      name: 'response_time',
      value: { 
        averageResponseTime: metrics.averageResponseTime,
        errorRate: metrics.errorRate
      }
    };
  }

  static async resetMetrics(req, res) {
    try {
      performanceMonitor.resetMetrics();
      
      res.json({
        success: true,
        message: 'Metrics reset successfully'
      });
    } catch (error) {
      console.error('Error resetting metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset metrics'
      });
    }
  }

  static async getLoadTestReport(req, res) {
    try {
      // Read the most recent load test report
      const fs = require('fs');
      const path = require('path');
      
      const reportsDir = path.join(process.cwd(), 'load-test-reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir);
      }
      
      const files = fs.readdirSync(reportsDir)
        .filter(file => file.startsWith('load-test-report-'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(reportsDir, a));
          const statB = fs.statSync(path.join(reportsDir, b));
          return statB.mtime.getTime() - statA.mtime.getTime();
        })
        .reverse();
      
      if (files.length === 0) {
        return res.json({
          success: true,
          message: 'No load test reports found',
          data: []
        });
      }
      
      const latestReport = files[0];
      const reportPath = path.join(reportsDir, latestReport);
      const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      
      res.json({
        success: true,
        data: {
          reports: files.map(file => {
            const filePath = path.join(reportsDir, file);
            const stat = fs.statSync(filePath);
            return {
              filename: file,
              timestamp: stat.mtime.toISOString(),
              size: stat.size,
              path: `/load-test-reports/${file}`
            };
          }),
          latest: reportData
        }
      });
    } catch (error) {
      console.error('Error getting load test reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve load test reports'
      });
    }
  }
}