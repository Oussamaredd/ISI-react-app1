// apps/server/tests/advancedTickets.test.js
import request from 'supertest';
import { app } from '../src/index.js';

// Mock database queries
jest.mock('../src/config/db.js', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('Advanced Tickets API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tickets with advanced features', () => {
    test('should support search query', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query.mockResolvedValue({
        rows: [
          { 
            id: 1, 
            name: 'Test Ticket', 
            price: '150.00', 
            status: 'OPEN',
            hotel_name: 'Grand Hotel'
          }
        ]
      });

      const response = await request(app)
        .get('/api/tickets?q=Test')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.name ILIKE'),
        expect.arrayContaining(['%Test%'])
      );
      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.tickets[0].name).toBe('Test Ticket');
    });

    test('should support status filtering', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query.mockResolvedValue({
        rows: [
          { 
            id: 1, 
            name: 'Open Ticket', 
            price: '100.00', 
            status: 'OPEN'
          }
        ]
      });

      const response = await request(app)
        .get('/api/tickets?status=OPEN')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.status ='),
        expect.arrayContaining(['OPEN'])
      );
      expect(response.body.tickets[0].status).toBe('OPEN');
    });

    test('should support hotel filtering', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query.mockResolvedValue({
        rows: [
          { 
            id: 1, 
            name: 'Hotel Ticket', 
            price: '200.00', 
            status: 'OPEN',
            hotel_id: 1
          }
        ]
      });

      const response = await request(app)
        .get('/api/tickets?hotel_id=1')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.hotel_id ='),
        expect.arrayContaining([1])
      );
    });

    test('should support pagination', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, name: 'Ticket 1' },
          { id: 2, name: 'Ticket 2' }
        ]
      });

      const response = await request(app)
        .get('/api/tickets?limit=10&offset=20')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10])
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET'),
        expect.arrayContaining([20])
      );
      expect(response.body.pagination).toMatchObject({
        limit: 10,
        offset: 20,
        hasMore: false,
        currentPage: 3,
        totalPages: 3
      });
    });

    test('should support multiple filters combined', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query.mockResolvedValue({
        rows: [
          { 
            id: 1, 
            name: 'Search Result', 
            price: '150.00', 
            status: 'OPEN',
            hotel_id: 1
          }
        ]
      });

      const response = await request(app)
        .get('/api/tickets?q=Search&status=OPEN&hotel_id=1&limit=5')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.name ILIKE'),
        expect.arrayContaining(['%Search%'])
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.status ='),
        expect.arrayContaining(['OPEN'])
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.hotel_id ='),
        expect.arrayContaining([1])
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([5])
      );
    });

    test('should include hotel names in results', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query.mockResolvedValue({
        rows: [
          { 
            id: 1, 
            name: 'Test Ticket', 
            price: '150.00', 
            status: 'OPEN',
            hotel_name: 'Grand Hotel'
          }
        ]
      });

      const response = await request(app)
        .get('/api/tickets')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN hotels h ON t.hotel_id = h.id')
      );
      expect(response.body.tickets[0]).toHaveProperty('hotel_name');
      expect(response.body.tickets[0].hotel_name).toBe('Grand Hotel');
    });

    test('should return pagination metadata', async () => {
      const { pool } = require('../src/config/db.js');
      
      // Mock count query for pagination
      pool.query
        .mockResolvedValueOnce({
          rows: Array(20).fill({ id: 1, name: 'Ticket' })
        })
        .mockResolvedValueOnce({
          rows: [{ total: '100' }]
        });

      const response = await request(app)
        .get('/api/tickets?limit=20&offset=0')
        .expect(200);

      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toMatchObject({
        limit: 20,
        offset: 0,
        hasMore: true,
        currentPage: 1,
        totalPages: 5
      });
      expect(response.body.total).toBe(100);
    });

    test('should handle invalid pagination gracefully', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query.mockResolvedValue({
        rows: []
      });

      const response = await request(app)
        .get('/api/tickets?page=invalid&limit=invalid')
        .expect(200);

      // Should fall back to defaults
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.offset).toBe(0);
    });

    test('should order by updated_at DESC', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query.mockResolvedValue({
        rows: []
      });

      await request(app)
        .get('/api/tickets')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY t.updated_at DESC, t.id DESC')
      );
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/tickets')
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
        .get('/api/tickets')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Search Performance', () => {
    test('should handle large result sets efficiently', async () => {
      const { pool } = require('../src/config/db.js');
      
      // Mock large result set
      pool.query.mockResolvedValue({
        rows: Array(1000).fill({ id: 1, name: 'Ticket' })
      });

      const agent = request.agent(app);
      agent.jar = {
        cookies: {
          'isi.sid': 'mock-session-id'
        }
      };

      const startTime = Date.now();
      const response = await agent.get('/api/tickets?limit=1000');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should use appropriate indexes for search', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query.mockResolvedValue({ rows: [] });

      const agent = request.agent(app);
      agent.jar = {
        cookies: {
          'isi.sid': 'mock-session-id'
        }
      };

      await agent.get('/api/tickets?q=searchTerm&status=OPEN');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.name ILIKE')
      );
      
      // Should benefit from search indexes
      expect(pool.query.mock.calls[0][0]).toMatch(/ORDER BY t\.updated_at DESC/);
    });
  });
});