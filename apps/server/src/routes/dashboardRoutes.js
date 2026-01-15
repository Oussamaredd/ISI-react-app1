// apps/server/src/routes/dashboardRoutes.js
import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard - Get dashboard statistics
router.get('/', requireAuth, getDashboardStats);

export default router;