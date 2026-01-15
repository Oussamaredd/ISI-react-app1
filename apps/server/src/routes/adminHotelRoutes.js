import express from 'express';
import { AdminHotelController } from '../controllers/adminHotelController.js';
import { requireAuth, requirePermission, logActivity } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// GET /api/admin/hotels - Get all hotels with enhanced statistics
router.get('/', requirePermission('hotels:read'), AdminHotelController.getHotels);

// GET /api/admin/hotels/stats - Get hotel statistics
router.get('/stats', requirePermission('hotels:read'), AdminHotelController.getHotelStats);

// GET /api/admin/hotels/top - Get top hotels by ticket count
router.get('/top', requirePermission('hotels:read'), AdminHotelController.getTopHotels);

// GET /api/admin/hotels/:id - Get hotel by ID with full statistics
router.get('/:id', requirePermission('hotels:read'), AdminHotelController.getHotelById);

// POST /api/admin/hotels - Create new hotel (admin only)
router.post('/', 
  requirePermission('hotels:create'), 
  logActivity('hotel_created', 'hotels'), 
  AdminHotelController.createHotel
);

// PUT /api/admin/hotels/:id - Update hotel (admin only)
router.put('/:id', 
  requirePermission('hotels:update'), 
  logActivity('hotel_updated', 'hotels'), 
  AdminHotelController.updateHotel
);

// PATCH /api/admin/hotels/:id/toggle - Toggle hotel availability
router.patch('/:id/toggle', 
  requirePermission('hotels:update'), 
  AdminHotelController.toggleHotelAvailability
);

// DELETE /api/admin/hotels/:id - Delete hotel (admin only)
router.delete('/:id', 
  requirePermission('hotels:delete'), 
  logActivity('hotel_deleted', 'hotels'), 
  AdminHotelController.deleteHotel
);

export default router;