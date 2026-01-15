// apps/server/tests/dashboard.test.js
import request from 'supertest';
import { app } from '../src/index.js';

// Mock database queries
jest.mock('../src/config/db.js', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('Dashboard API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard', () => {
    test('should return dashboard statistics for authenticated user', async () => {
      // Mock successful authentication
      const mockUser = { id: '123', name: 'Test User', email: 'test@example.com' };
      
      // Mock database responses
      const { pool } = require('../src/config/db.js');
      
      pool.query
        .mockResolvedValueOnce({
          rows: [
            { status: 'OPEN', count: '45' },
            { status: 'COMPLETED', count: '105' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, name: 'Grand Hotel', ticket_count: '25', avg_price: '150.00' },
            { id: 2, name: 'City Inn', ticket_count: '18', avg_price: '120.00' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { date: '2026-01-15', created_count: '5', updated_count: '8' },
            { date: '2026-01-14', created_count: '3', updated_count: '6' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{
            total_tickets: '150',
            open_tickets: '45',
            completed_tickets: '105',
            assigned_tickets: '78',
            avg_price: '125.50',
            total_revenue: '18825.00',
            min_price: '25.00',
            max_price: '500.00'
          }]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: 'Room 101',
              price: '150.00',
              status: 'OPEN',
              hotel_id: 1,
              hotel_name: 'Grand Hotel',
              created_at: '2026-01-15T10:00:00Z',
              updated_at: '2026-01-15T10:30:00Z'
            }
          ]
        });

      // Mock authenticated session
      const agent = request.agent(app);
      
      // Mock session middleware
      agent.jar = {
        cookies: {
          'isi.sid': 'mock-session-id'
        }
      };

      const response = await agent
        .get('/api/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('statusBreakdown');
      expect(response.body).toHaveProperty('hotels');
      expect(response.body).toHaveProperty('recentActivity');
      expect(response.body).toHaveProperty('recentTickets');

      expect(response.body.summary).toMatchObject({
        total: 150,
        open: 45,
        completed: 105,
        assigned: 78,
        avgPrice: 125.50,
        totalRevenue: 18825.00,
      });

      expect(response.body.hotels).toHaveLength(2);
      expect(response.body.hotels[0]).toMatchObject({
        id: 1,
        name: 'Grand Hotel',
        ticketCount: 25,
        avgPrice: 150.00,
      });
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle database errors gracefully', async () => {
      const { pool } = require('../src/config/db.js');
      pool.query.mockRejectedValue(new Error('Database connection failed'));

      const agent = request.agent(app);
      agent.jar = {
        cookies: {
          'isi.sid': 'mock-session-id'
        }
      };

      const response = await agent
        .get('/api/dashboard')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to fetch dashboard statistics');
    });

    test('should handle empty data gracefully', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            total_tickets: '0',
            open_tickets: '0',
            completed_tickets: '0',
            assigned_tickets: '0',
            avg_price: null,
            total_revenue: '0',
            min_price: null,
            max_price: null
          }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const agent = request.agent(app);
      agent.jar = {
        cookies: {
          'isi.sid': 'mock-session-id'
        }
      };

      const response = await agent
        .get('/api/dashboard')
        .expect(200);

      expect(response.body.summary).toMatchObject({
        total: 0,
        open: 0,
        completed: 0,
        assigned: 0,
        avgPrice: 0,
        totalRevenue: 0,
      });

      expect(response.body.hotels).toHaveLength(0);
      expect(response.body.recentTickets).toHaveLength(0);
    });
  });
});