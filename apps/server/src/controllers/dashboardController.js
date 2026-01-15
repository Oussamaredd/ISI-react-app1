// apps/server/src/controllers/dashboardController.js
import { pool } from '../config/db.js';

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(req, res) {
  try {
    // Get ticket counts by status
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM tickets
      GROUP BY status
    `;
    const statusResult = await pool.query(statusQuery);
    const statusCounts = statusResult.rows.reduce((acc, row) => {
      acc[row.status.toLowerCase()] = parseInt(row.count);
      return acc;
    }, {});

    // Get tickets per hotel
    const hotelQuery = `
      SELECT 
        h.id,
        h.name,
        COUNT(t.id) as ticket_count,
        AVG(t.price) as avg_price
      FROM hotels h
      LEFT JOIN tickets t ON h.id = t.hotel_id
      GROUP BY h.id, h.name
      ORDER BY ticket_count DESC
    `;
    const hotelResult = await pool.query(hotelQuery);

    // Get recent activity (last 7 days)
    const activityQuery = `
      SELECT 
        DATE(t.created_at) as date,
        COUNT(*) as created_count,
        COUNT(CASE WHEN t.updated_at > t.created_at THEN 1 END) as updated_count
      FROM tickets t
      WHERE t.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(t.created_at)
      ORDER BY date DESC
    `;
    const activityResult = await pool.query(activityQuery);

    // Get total revenue and metrics
    const metricsQuery = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_tickets,
        COUNT(CASE WHEN hotel_id IS NOT NULL THEN 1 END) as assigned_tickets,
        AVG(price) as avg_price,
        SUM(price) as total_revenue,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM tickets
    `;
    const metricsResult = await pool.query(metricsQuery);

    // Get recent tickets
    const recentTicketsQuery = `
      SELECT 
        t.id,
        t.name,
        t.price,
        t.status,
        t.hotel_id,
        h.name as hotel_name,
        t.created_at,
        t.updated_at
      FROM tickets t
      LEFT JOIN hotels h ON t.hotel_id = h.id
      ORDER BY t.updated_at DESC
      LIMIT 10
    `;
    const recentTicketsResult = await pool.query(recentTicketsQuery);

    const dashboardData = {
      summary: {
        total: parseInt(metricsResult.rows[0].total_tickets),
        open: parseInt(metricsResult.rows[0].open_tickets),
        completed: parseInt(metricsResult.rows[0].completed_tickets),
        assigned: parseInt(metricsResult.rows[0].assigned_tickets),
        avgPrice: parseFloat(metricsResult.rows[0].avg_price || 0),
        totalRevenue: parseFloat(metricsResult.rows[0].total_revenue || 0),
        minPrice: parseFloat(metricsResult.rows[0].min_price || 0),
        maxPrice: parseFloat(metricsResult.rows[0].max_price || 0),
      },
      statusBreakdown: {
        open: statusCounts.open || 0,
        completed: statusCounts.completed || 0,
      },
      hotels: hotelResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        ticketCount: parseInt(row.ticket_count),
        avgPrice: parseFloat(row.avg_price || 0),
      })),
      recentActivity: activityResult.rows.map(row => ({
        date: row.date,
        created: parseInt(row.created_count),
        updated: parseInt(row.updated_count),
      })),
      recentTickets: recentTicketsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        status: row.status,
        hotelId: row.hotel_id,
        hotelName: row.hotel_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard statistics',
      details: error.message,
    });
  }
}