// apps/server/tests/testTicketDetailsApi.js
import request from 'supertest';
import { app } from '../src/index.js';

// Mock database queries
jest.mock('../src/config/db.js', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// Mock models
jest.mock('../src/models/commentModel.js', () => ({
  getCommentsByTicketId: jest.fn(),
  createComment: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  getCommentsCount: jest.fn(),
}));

describe('Ticket Details API - Basic Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log('Starting API integration tests...');
  });

  describe('Basic ticket details retrieval', () => {
    test('should return ticket details', async () => {
      // Mock successful response
      const { pool } = require('../src/config/db.js');
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          name: 'Test Ticket',
          price: '150.00',
          status: 'OPEN',
          hotel_id: 1,
          hotel_name: 'Grand Hotel',
          created_at: '2026-01-15T10:00:00Z',
          updated_at: '2026-01-15T10:30:00Z',
        }]
      });

      const response = await request(app)
        .get('/api/tickets/1/details')
        .expect(200);

      expect(response.body).toHaveProperty('ticket');
      expect(response.body.ticket.id).toBe(1);
      expect(response.body.ticket.name).toBe('Test Ticket');
      expect(response.body.ticket.price).toBe(150.00);
    });

    test('should return 404 for non-existent ticket', async () => {
      const { pool } = require('../src/config/db.js');
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/tickets/999/details')
        .expect(404);

      expect(response.body).toHaveProperty('error'));
      expect(response.body.error).toContain('Ticket not found');
    });
  });

  describe('Comment creation', () => {
    test('should create comment successfully', async () => {
      const { createComment } = require('../src/models/commentModel');
      
      createComment.mockResolvedValue({
        id: 1,
        body: 'Test comment',
        user_id: 123,
        user_name: 'Test User',
        user_email: 'test@example.com',
        created_at: '2026-01-15T11:00:00Z',
        updated_at: '2026-01-15T10:00Z',
      });

      const response = await request(app)
        .post('/api/tickets/1/comments')
        .send({ body: 'Test comment' })
        .expect(201);

      expect(response.body.message).toBe('Comment added successfully');
      expect(response.body.comment.id).toBe(1);
      expect(response.body.comment.body).toBe('Test comment');
    });
  });

  test('should validate comment body', async () => {
      const { createComment } = require('../src/models/commentModel');
      
      // Test empty body
      createComment.mockRejectedValue(new Error('Comment body is required'));

      const response = await request(app)
        .post('/api/tickets/1/comments')
        .send({ body: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error'));
      expect(response.body.error).toContain('Comment body is required');
    });

    test('should limit comment length', async () => {
      const { createComment } = require('../src/models/commentModel');
      
      // Test very long comment
      const longComment = 'A'.repeat(2500);
      createComment.mockRejectedValue(new Error('Comment body cannot exceed 2000 characters'));

      const response = await request(app)
        .post('/api/tickets/1/comments')
        .send({ body: longComment })
        .expect(400);

      expect(response.body.error).toContain('Comment body cannot exceed 2000 characters');
    });

    test('should delete own comment successfully', async () => {
      const { deleteComment } = require('../src/models/commentModel');
      deleteComment.mockResolvedValue({
        deletedId: 1,
        message: 'Comment deleted successfully'
      });

      const response = await request(app)
        .delete('/api/tickets/1/comments/1')
        .expect(200);

      expect(response.body.deletedId).toBe(1);
      expect(response.body.message).toBe('Comment deleted successfully');
    });

    test('should prevent other users from deleting comments', async () => {
      const { deleteComment } = require('../src/models/commentModel');
      
      deleteComment.mockRejectedValue(new Error('Unauthorized to delete this comment'));

      const response = await request(app)
        .delete('/api/tickets/1/comments/999')
        .expect(403);

      expect(response.body).toHaveProperty('error'));
      expect(response.body.error).toContain('You can only delete your own comments');
    });
  });
});