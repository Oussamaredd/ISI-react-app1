// apps/server/tests/apiSimpleTest.js
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

describe('Ticket Details API - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock authenticated user
    const agent = request.agent(app);
    agent.jar = {
      cookies: {
        'isi.sid': 'mock-session-id'
      }
    };

  describe('GET /api/tickets/:id/details', () => {
    test('should return ticket details for authenticated user', async () => {
      // Mock database responses
      const { pool } = require('../src/config/db.js');
      
      pool.query
        .mockResolvedValueOnce({
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
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              body: 'Test comment',
              user_id: 123,
              user_name: 'Test User',
              user_email: 'test@example.com',
              user_role: 'user',
              created_at: '2026-01-15T11:00:00Z',
              updated_at: '2026-01-15T11:00:00Z',
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: Array(1).fill({
            id: 1,
            type: 'creation',
            actor_user_id: 123,
            metadata: null,
            created_at: '2026-01-15T10:00:00Z',
          })
        });

      const response = await agent
        .get('/api/tickets/1/details')
        .expect(200);

      expect(response.body).toHaveProperty('ticket');
      expect(response.body.ticket).toMatchObject({
        id: 1,
        name: 'Test Ticket',
        price: 150.00,
        status: 'OPEN',
        hotel_name: 'Grand Hotel',
      });
      
      expect(response.body).toHaveProperty('comments');
      expect(response.body.comments).toHaveLength(1);
      expect(response.body).activity).toHaveLength(2);
      
      expect(response.body.ticket).toMatchObject({
        id: 1,
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-15T10:30:00Z',
      });
      
      expect(response.body.comments[0]).toMatchObject({
        id: 1,
        body: 'Test comment',
        user_id: 123,
        user_name: 'Test User',
        created_at: '2026-01-15T11:00:00Z',
        updated_at: '2026-01-15T11:00:00Z',
      });
      
      expect(response.body.activity[0]).toMatchObject({
        id: expect.any(Number),
        type: 'creation',
        actor_user_id: 123,
        created_at: '2026-01-15T10:00:00Z',
      });
      });
      
      expect(response.body.activity[1]).not.toHaveProperty('metadata');
    });

    test('should return 404 for non-existent ticket', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query.mockResolvedValue({ rows: [] });

      const response = await agent
        .get('/api/tickets/999/details')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Ticket not found');
    });
  });

  describe('POST /api/tickets/:id/comments', () => {
    test('should create comment successfully', async () => {
      const { createComment } = require('../src/models/commentModel');
      
      createComment.mockResolvedValue({
        id: 1,
        body: 'Test comment',
        user_id: 123,
        user_name: 'Test User',
        user_email: 'test@example.com',
        created_at: '2026-01-15T11:00:00Z',
        updated_at: '2026-01-15T11:00:00Z',
      });

      const response = await agent
        .post('/api/tickets/1/comments')
        .send({ body: 'New comment' })
        .expect(201);

      expect(response.body.message).toBe('Comment added successfully');
      expect(response.body.comment).toMatchObject({
        id: 1,
        body: 'New comment',
        user_id: 123,
        created_at: '2026-01-15T11:00:00Z',
      }));
    });

    test('should validate comment body', async () => {
      const { createComment } = require('../src/models/commentModel');
      
      createComment.mockResolvedValue(new Error('Body required'));

      const response = await agent
        .post('/api/tickets/1/comments')
        .send({ body: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Comment body is required');
    });

    test('should limit comment body length', async () => {
      const { createComment } = require('../src/models/commentModel');
      
      const longComment = 'This is a very long comment that exceeds 2000 characters but is just under 2010 characters for this test '.repeat('a', 2010);
      
      createComment.mockResolvedValue({
        id: 1,
        body: longComment,
        user_id: 123,
        created_at: '2026-01-15T11:00:00Z',
        updated_at: '2026-01-15T11:00:00Z',
      });

      const response = await agent
        .post('/api/tickets/1/comments')
        .send({ body: longComment })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Comment body cannot exceed 2000 characters');
    });
    });
  });

  describe('PUT /api/tickets/:id/comments/:commentId', () => {
    test('should update own comment successfully', async () => {
      const { updateComment } = require('../src/models/commentModel');
      
      updateComment.mockResolvedValue({
        id: 1,
        body: 'Updated comment',
        user_id: 123,
        user_name: 'Test User',
        user_email: 'test@example.com',
        updated_at: '2026-01-15T11:00:00Z',
      });

      const response = await agent
        .put('/api/tickets/1/comments/1')
        .send({ body: 'Updated comment' })
        .expect(200);

      expect(response.body.message).toBe('Comment updated successfully');
      expect(response.body.comment).toMatchObject({
        id: 1,
        body: 'Updated comment',
        user_id: 123,
        updated_at: '2026-01-15T11:00:00Z',
      }));
    });

    test('should prevent updating other users comments', async () => {
      const { updateComment } = require('../src/models/commentModel');
      
      updateComment.mockRejectedValue(new Error('Unauthorized to update this comment'));

      const response = await agent
        .put('/api/tickets/1/comments/1')
        .send({ body: 'Updated comment' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('You can only update your own comments');
      });
    });
  });

  describe('DELETE /api/tickets/:id/comments/:commentId', () => {
    test('should delete own comment successfully', async () => {
      const { deleteComment } = require('../src/models/commentModel');
      
      deleteComment.mockResolvedValue({
        deletedId: 1,
        message: 'Comment deleted successfully',
      });

      const response = await agent
        .delete('/api/tickets/1/comments/1')
        .expect(200);

      expect(response.body).toMatchObject({
        deletedId: 1,
        message: 'Comment deleted successfully'
      });
    });

    test('should prevent deleting other users comments', async () => {
      const { deleteComment } = require('../src/models/commentModel');
      
      deleteComment.mockRejectedValue(new Error('Unauthorized to delete this comment'));

      const response = await agent
        .delete('/api/tickets/1/comments/1')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('You can only delete your own comments');
    });
  });

  describe('GET /api/tickets/:id/comments (pagination)', () => {
    test('should return paginated comments', async () => {
      const { getCommentsByTicketId, getCommentsCount } = require('../src/models/commentModel');
      
      getCommentsByTicketId.mockResolvedValue([
        { id: 2, body: 'Second comment', user_id: 123, created_at: '2026-01-15T11:00:00Z' },
        { id: 1, body: 'First comment', user_id: 123, created_at: '2026-01-15T11:00:00Z' },
      ]);
      
      getCommentsCount.mockResolvedValue(2);

      const response = await agent
        .get('/api/tickets/1/comments?page=2&pageSize=10')
        .expect(200);

      expect(response.body.comments).toHaveLength(2);
      expect(response.body.commentsPagination.page).toBe(2);
      expect(response.body.commentsPagination.pageSize).toBe(10);
      expect(response.body.commentsPagination.total).toBe(2);
      expect(response.body.commentsPagination.totalPages).toBe(1);
      expect(response.body.commentsPagination.hasNext).toBe(false);
      expect(response.body.commentsPagination.hasPrev).toBe(true);
      
      expect(response.body.comments[0].body).toBe('Second comment');
      expect(response.body.comments[1].body).toBe('First comment');
    });

    test('should handle page out of bounds gracefully', async () => {
      const { getCommentsByTicketId, getCommentsCount } = require('../src/models/commentModel');
      
      getCommentsByTicketId.mockResolvedValue([]);
      getCommentsCount.mockResolvedValue(0);

      const response = await agent
        .get('/api/tickets/1/comments?page=999')
        .expect(200);

      expect(response.body.comments).toHaveLength(0);
      expect(response.body.commentsPagination.page).toBe(1);
      expect(response.body.commentsPagination.totalPages).toBe(0);
      expect(response.body.commentsPagination.hasNext).toBe(false);
      expect(response.body.commentsPagination.hasPrev).toBe(false);
    });
  });
});