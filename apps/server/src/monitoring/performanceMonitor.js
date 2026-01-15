// Performance monitoring utility for tracking application metrics
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = {
      responseTime: 1000, // 1 second
      memoryUsage: 80, // 80%
      errorRate: 5 // 5%
    };
  }

  // Record API request metrics
  recordAPIRequest(url, method, duration, statusCode, responseSize, isError = false) {
    const key = `${method}:${url}`;
    const metric = this.metrics.get(key) || {
      count: 0,
      totalDuration: 0,
      errors: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: Infinity
    };

    metric.count++;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.count;
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.minDuration = Math.min(metric.minDuration, duration);

    if (isError || statusCode >= 400) {
      metric.errors++;
    }

    this.metrics.set(key, metric);

    // Check for performance alerts
    if (duration > this.thresholds.responseTime) {
      this.triggerAlert('SLOW_REQUEST', `${method} ${url} took ${duration}ms`);
    }

    if (isError || statusCode >= 400) {
      this.triggerAlert('ERROR_REQUEST', `${method} ${url} returned ${statusCode}`);
    }
  }

  // Record memory usage metrics
  recordMemoryUsage(memoryData) {
    const memoryMetric = this.metrics.get('memory') || {
      rss: 0,
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0
    };

    Object.assign(memoryMetric, memoryData);
    this.metrics.set('memory', memoryMetric);

    // Check memory threshold
    const heapUsagePercent = (memoryData.heapUsed / memoryData.heapTotal) * 100;
    if (heapUsagePercent > this.thresholds.memoryUsage) {
      this.triggerAlert('HIGH_MEMORY', `Memory usage at ${heapUsagePercent.toFixed(2)}%`);
    }
  }

  // Record database query metrics
  recordDatabaseQuery(query, duration, rowCount, isError = false) {
    const queryMetric = this.metrics.get('database') || {
      totalQueries: 0,
      totalDuration: 0,
      avgDuration: 0,
      errors: 0,
      slowQueries: 0
    };

    queryMetric.totalQueries++;
    queryMetric.totalDuration += duration;
    queryMetric.avgDuration = queryMetric.totalDuration / queryMetric.totalQueries;

    if (isError) {
      queryMetric.errors++;
    }

    if (duration > 500) { // Slow query threshold
      queryMetric.slowQueries++;
      this.triggerAlert('SLOW_QUERY', `Query took ${duration}ms: ${query.substring(0, 50)}...`);
    }

    this.metrics.set('database', queryMetric);
  }

  // Record frontend metrics
  recordFrontendMetric(metric) {
    const key = `frontend:${metric.type}:${metric.name}`;
    const frontendMetric = this.metrics.get(key) || {
      count: 0,
      totalValue: 0,
      avgValue: 0,
      maxValue: 0,
      minValue: Infinity
    };

    frontendMetric.count++;
    frontendMetric.totalValue += metric.value;
    frontendMetric.avgValue = frontendMetric.totalValue / frontendMetric.count;
    frontendMetric.maxValue = Math.max(frontendMetric.maxValue, metric.value);
    frontendMetric.minValue = Math.min(frontendMetric.minValue, metric.value);

    this.metrics.set(key, frontendMetric);
  }

  // Trigger performance alert
  triggerAlert(type, message) {
    const alert = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(type)
    };

    this.alerts.push(alert);
    console.warn(`[PERFORMANCE ALERT] ${type}: ${message}`);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  // Get alert severity based on type
  getAlertSeverity(type) {
    const severityMap = {
      'SLOW_REQUEST': 'medium',
      'ERROR_REQUEST': 'high',
      'HIGH_MEMORY': 'high',
      'SLOW_QUERY': 'medium',
      'HIGH_ERROR_RATE': 'critical'
    };
    return severityMap[type] || 'low';
  }

  // Get metrics summary
  getMetricsSummary() {
    const summary = {
      totalRequests: 0,
      avgResponseTime: 0,
      errorRate: 0,
      memoryUsage: this.metrics.get('memory'),
      databaseStats: this.metrics.get('database'),
      alerts: this.alerts.slice(-10), // Last 10 alerts
      endpoints: {}
    };

    // Calculate request statistics
    for (const [key, metric] of this.metrics.entries()) {
      if (key.includes(':') && !key.startsWith('frontend') && key !== 'memory' && key !== 'database') {
        summary.totalRequests += metric.count;
        summary.avgResponseTime += metric.totalDuration;
        summary.endpoints[key] = metric;
      }
    }

    if (summary.totalRequests > 0) {
      summary.avgResponseTime = summary.avgResponseTime / summary.totalRequests;
    }

    // Calculate error rate
    let totalErrors = 0;
    for (const metric of this.metrics.values()) {
      if (metric.errors) {
        totalErrors += metric.errors;
      }
    }
    summary.errorRate = summary.totalRequests > 0 ? (totalErrors / summary.totalRequests) * 100 : 0;

    return summary;
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
    this.alerts = [];
  }

  // Export metrics for monitoring systems
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(this.metrics),
      alerts: this.alerts,
      summary: this.getMetricsSummary()
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export class for testing
export { PerformanceMonitor };