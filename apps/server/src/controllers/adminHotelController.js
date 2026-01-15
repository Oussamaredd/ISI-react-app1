import { 
  getHotels, 
  getHotelById, 
  createHotel, 
  updateHotel, 
  deleteHotel, 
  getHotelStats,
  getHotelsWithTicketStats 
} from '../models/hotelModel.js';
import { AuditLogModel } from '../models/auditLogModel.js';

export class AdminHotelController {
  /**
   * Get all hotels with enhanced statistics
   */
  static async getHotels(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search, 
        is_available,
        sortBy = 'created_at',
        sortOrder = 'DESC' 
      } = req.query;
      
      const filters = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        search,
        is_available: is_available === undefined ? undefined : is_available === 'true'
      };
      
      const result = await getHotels(filters);
      
      res.json({
        success: true,
        data: {
          hotels: result.hotels,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.total,
            totalPages: result.totalPages,
            hasNext: parseInt(page) < result.totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      console.error('Error getting hotels:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch hotels',
        message: error.message
      });
    }
  }

  /**
   * Get hotel by ID with full statistics
   */
  static async getHotelById(req, res) {
    try {
      const { id } = req.params;
      
      const hotel = await getHotelById(id);
      
      if (!hotel) {
        return res.status(404).json({
          success: false,
          error: 'Hotel not found'
        });
      }
      
      // Get ticket history for this hotel
      const ticketHistory = await pool.query(`
        SELECT status, COUNT(*) as count, created_at
        FROM tickets 
        WHERE hotel_id = $1
        GROUP BY status, created_at
        ORDER BY created_at DESC
        LIMIT 30
      `, [id]);
      
      res.json({
        success: true,
        data: {
          ...hotel,
          ticketHistory: ticketHistory.rows
        }
      });
    } catch (error) {
      console.error('Error getting hotel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch hotel',
        message: error.message
      });
    }
  }

  /**
   * Create new hotel (admin only)
   */
  static async createHotel(req, res) {
    try {
      const { name, is_available = true } = req.body;
      
      // Validation
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Hotel name is required'
        });
      }
      
      if (name.length > 255) {
        return res.status(400).json({
          success: false,
          error: 'Hotel name cannot exceed 255 characters'
        });
      }
      
      const hotel = await createHotel({
        name: name.trim(),
        is_available
      });
      
      // Log the action
      await AuditLogModel.create({
        user_id: req.currentUser.id,
        action: 'hotel_created',
        resource_type: 'hotels',
        resource_id: hotel.id,
        new_values: { name: hotel.name, is_available: hotel.is_available },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.status(201).json({
        success: true,
        data: hotel,
        message: 'Hotel created successfully'
      });
    } catch (error) {
      console.error('Error creating hotel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create hotel',
        message: error.message
      });
    }
  }

  /**
   * Update hotel (admin only)
   */
  static async updateHotel(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Get existing hotel for audit
      const existingHotel = await getHotelById(id);
      if (!existingHotel) {
        return res.status(404).json({
          success: false,
          error: 'Hotel not found'
        });
      }
      
      const updatedHotel = await updateHotel(id, updateData);
      
      // Log the action
      await AuditLogModel.create({
        user_id: req.currentUser.id,
        action: 'hotel_updated',
        resource_type: 'hotels',
        resource_id: parseInt(id),
        old_values: {
          name: existingHotel.name,
          is_available: existingHotel.is_available
        },
        new_values: updateData,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        data: updatedHotel,
        message: 'Hotel updated successfully'
      });
    } catch (error) {
      console.error('Error updating hotel:', error);
      
      if (error.message === 'No fields to update') {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to update hotel',
        message: error.message
      });
    }
  }

  /**
   * Delete hotel (admin only)
   */
  static async deleteHotel(req, res) {
    try {
      const { id } = req.params;
      
      // Get existing hotel for audit
      const existingHotel = await getHotelById(id);
      if (!existingHotel) {
        return res.status(404).json({
          success: false,
          error: 'Hotel not found'
        });
      }
      
      const deletedHotel = await deleteHotel(id);
      
      // Log the action
      await AuditLogModel.create({
        user_id: req.currentUser.id,
        action: 'hotel_deleted',
        resource_type: 'hotels',
        resource_id: parseInt(id),
        old_values: existingHotel,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        data: deletedHotel,
        message: 'Hotel deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting hotel:', error);
      
      if (error.message.includes('Cannot delete hotel with associated tickets')) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete hotel with associated tickets',
          message: 'Please reassign or delete all tickets associated with this hotel first'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to delete hotel',
        message: error.message
      });
    }
  }

  /**
   * Get hotel statistics for admin dashboard
   */
  static async getHotelStats(req, res) {
    try {
      const stats = await getHotelStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting hotel stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch hotel statistics'
      });
    }
  }

  /**
   * Get top hotels with ticket statistics
   */
  static async getTopHotels(req, res) {
    try {
      const { limit = 10 } = req.query;
      
      const hotels = await getHotelsWithTicketStats(parseInt(limit));
      
      res.json({
        success: true,
        data: hotels
      });
    } catch (error) {
      console.error('Error getting top hotels:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top hotels'
      });
    }
  }

  /**
   * Toggle hotel availability status
   */
  static async toggleHotelAvailability(req, res) {
    try {
      const { id } = req.params;
      
      const existingHotel = await getHotelById(id);
      if (!existingHotel) {
        return res.status(404).json({
          success: false,
          error: 'Hotel not found'
        });
      }
      
      const updatedHotel = await updateHotel(id, {
        is_available: !existingHotel.is_available
      });
      
      // Log the action
      await AuditLogModel.create({
        user_id: req.currentUser.id,
        action: existingHotel.is_available ? 'hotel_deactivated' : 'hotel_activated',
        resource_type: 'hotels',
        resource_id: parseInt(id),
        old_values: { is_available: existingHotel.is_available },
        new_values: { is_available: !existingHotel.is_available },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        data: updatedHotel,
        message: `Hotel ${updatedHotel.is_available ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling hotel availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update hotel availability'
      });
    }
  }
}