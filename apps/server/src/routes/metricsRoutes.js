import express from 'express';
import { MetricsController } from '../controllers/metricsController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all metrics endpoints
router.use(requireAuth);

// GET /api/metrics - Get performance metrics
router.get('/', requirePermission('system:manage'), MetricsController.getMetrics);

// GET /api/metrics/health - Health check endpoint
router.get('/health', MetricsController.getHealth);

// GET /api/metrics/health - Detailed health checks
router.get('/detailed-health', requirePermission('system:manage'), MetricsController.getHealth);

// POST /api/metrics/reset - Reset metrics
router.post('/reset', requirePermission('system:manage'), MetricsController.resetMetrics);

// GET /api/metrics/load-test - Get load test reports
router.get('/load-test', requirePermission('system:manage'), MetricsController.getLoadTestReport);

export default router;