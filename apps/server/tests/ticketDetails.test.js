// apps/server/tests/ticketDetails.test.js
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
  createComment: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  getCommentsByTicketId: jest.fn(),
  getCommentsCount: jest.fn(),
}));

jest.mock('../src/models/activityModel.js', () => ({
  createActivity: jest.fn(),
  createStatusChangeActivity: jest.fn(),
  createHotelAssignmentActivity: jest.fn(),
  getTicketActivity: jest.fn(),
  getActivityCount: jest.fn(),
}));

describe('Ticket Details API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated user
    const agent = request.agent(app);
    agent.jar = {
      cookies: {
        'isi.sid': 'mock-session-id'
      }
    };
  });

  describe('GET /api/tickets/:id/details', () => {
    test('should return ticket details with comments and activity', async () => {
      const { pool } = require('../src/config/db.js');
      
      // Mock database responses
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
          rows: [{
            id: 1,
            type: 'creation',
            actor_user_id: 123,
            metadata: null,
            created_at: '2026-01-15T10:00:00Z',
          }]
        });

      const response = await request(app)
        .get('/api/tickets/1/details')
        .expect(200);

      expect(response.body).toHaveProperty('ticket');
      expect(response.body).toHaveProperty('comments');
      expect(response.body).toHaveProperty('activity');
      
      expect(response.body.ticket).toMatchObject({
        id: 1,
        name: 'Test Ticket',
        price: 150.00,
        status: 'OPEN',
        hotel_name: 'Grand Hotel',
      });
      
      expect(response.body.comments).toHaveLength(1);
      expect(response.body.comments[0]).toMatchObject({
        id: 1,
        body: 'Test comment',
        user_name: 'Test User',
      });
      
      expect(response.body.activity).toHaveLength(1);
      expect(response.body.activity[0]).toMatchObject({
        type: 'creation',
        actor_user_id: 123,
        created_at: '2026-01-15T10:00:00Z',
      });
    });

    test('should return 404 for non-existent ticket', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/tickets/999/details')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Ticket not found');
    });

    test('should handle database errors gracefully', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/tickets/1/details')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to fetch ticket details');
    });

    test('should include pagination for comments', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Test Ticket' }]
        })
        .mockResolvedValueOnce({
          rows: Array(25).fill({ id: 1, body: 'Comment' })
        })
        .mockResolvedValueOnce({
          rows: [{ count: '50' }]
        });

      const response = await request(app)
        .get('/api/tickets/1/details')
        .expect(200);

      expect(response.body.commentsPagination).toMatchObject({
        page: 1,
        pageSize: 20,
        total: 50,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    test('should support pagination parameters', async () => {
      const { pool } = require('../src/config/db.js');
      
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Test Ticket' }]
        })
        .mockResolvedValueOnce({
          rows: Array(5).fill({ id: 1, body: 'Comment' })
        })
        .mockResolvedValueOnce({
          rows: [{ count: '10' }]
        });

      const response = await request(app)
        .get('/api/tickets/1/details?page=2&pageSize=5')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([5])
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET'),
        expect.arrayContaining([5])
      );
      
      expect(response.body.commentsPagination.page).toBe(2);
      expect(response.body.commentsPagination.pageSize).toBe(5);
    });
  });

  describe('POST /api/tickets/:id/comments', () => {
    test('should create comment successfully', async () => {
      const { createComment } = require('../src/models/commentModel');
      
      createComment.mockResolvedValue({
        id: 1,
        body: 'New comment',
        user_id: 123,
      });

      const response = await request(app)
        .post('/api/tickets/1/comments')
        .send({ body: 'New comment' })
        .expect(201);

      expect(response.body.message).toBe('Comment added successfully');
      expect(response.body.comment).toMatchObject({
        id: 1,
        body: 'New comment',
        user_id: 123,
      });
    });

    test('should create activity entry for comment', async () => {
      const { createComment } = require('../src/models/commentModel');
      const { createActivity } = require('../src/models/activityModel');

      createComment.mockResolvedValue({
        id: 1,
        body: 'New comment',
        user_id: 123,
      });

      const response = await request(app)
        .post('/api/tickets/1/comments')
        .send({ body: 'New comment' })
        .expect(201);

      expect(createActivity).toHaveBeenCalledWith(
        1,
        123,
        'comment_added',
        expect.objectContaining({
          comment_id: 1,
          body_preview: 'New comment'
        })
      );
    });

    test('should validate comment body', async () => {
      const response = await request(app)
        .post('/api/tickets/1/comments')
        .send({ body: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Comment body is required');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/tickets/1/comments')
        .send({ body: 'Test comment' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('PUT /api/tickets/:id/comments/:commentId', () => {
    test('should update comment successfully', async () => {
      const { updateComment } = require('../src/models/commentModel');
      
      updateComment.mockResolvedValue({
        id: 1,
        body: 'Updated comment',
        user_id: 123,
      });

      const response = await request(app)
        .put('/api/tickets/1/comments/1')
        .send({ body: 'Updated comment' })
        .expect(200);

      expect(response.body.message).toBe('Comment updated successfully');
      expect(response.body.comment.body).toBe('Updated comment');
    });

    test('should create activity entry for comment update', async () => {
      const { updateComment } = require('../src/models/commentModel');
      const { createActivity } = require('../src/models/activityModel');

      updateComment.mockResolvedValue({
        id: 1,
        body: 'Updated comment',
        user_id: 123,
      });

      const response = await request(app)
        .put('/api/tickets/1/comments/1')
        .send({ body: 'Updated comment' })
        .expect(200);

      expect(createActivity).toHaveBeenCalledWith(
        1,
        123,
        'comment_updated',
        expect.objectContaining({
          comment_id: 1
        })
      );
    });

    test('should prevent unauthorized updates', async () => {
      const response = await request(app)
        .put('/api/tickets/1/comments/1')
        .send({ body: 'Updated comment' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('You can only update your own comments');
    });
  });

  describe('DELETE /api/tickets/:id/comments/:commentId', () => {
    test('should delete comment successfully', async () => {
      const { deleteComment } = require('../src/models/commentModel');
      
      deleteComment.mockResolvedValue({
        deletedId: 1,
        message: 'Comment deleted successfully',
      });

      const response = await request(app)
        .delete('/api/tickets/1/comments/1')
        .expect(200);

      expect(response.body).toMatchObject({
        deletedId: 1,
        message: 'Comment deleted successfully'
      });
    });

    test('should create activity entry for comment deletion', async () => {
      const { deleteComment } = require('../src/models/commentModel');
      const { createActivity } = require('../src/models/activityModel');

      deleteComment.mockResolvedValue({
        deletedId: 1,
        message: 'Comment deleted successfully',
      });

      const response = await request(app)
        .delete('/api/tickets/1/comments/1')
        .expect(200);

      expect(createActivity).toHaveBeenCalledWith(
        1,
        123,
        'comment_deleted',
        expect.objectContaining({
          comment_id: 1,
          deleted_by: 123
        })
      );
    });

    test('should prevent unauthorized deletions', async () => {
      const response = await request(app)
        .delete('/api/tickets/1/comments/1')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('You can only delete your own comments');
    });
  });

  describe('GET /api/tickets/:id/comments', () => {
    test('should return paginated comments', async () => {
      const { getCommentsByTicketId } = require('../src/models/commentModel');
      const { getCommentsCount } = require('../src/models/commentModel');
      
      getCommentsByTicketId.mockResolvedValue([
        { id: 1, body: 'Comment 1' },
        { id: 2, body: 'Comment 2' }
      ]);
      getCommentsCount.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/tickets/1/comments')
        .expect(200);

      expect(response.body.comments).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        pageSize: 20,
        total: 5,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    test('should support pagination parameters', async () => {
      const { getCommentsByTicketId } = require('../src/models/commentModel');
      
      getCommentsByTicketId.mockResolvedValue([
        { id: 3, body: 'Comment 3' }
      ]);

      const response = await request(app)
        .get('/api/tickets/1/comments?page=2&pageSize=10')
        .expect(200);

      expect(getCommentsByTicketId).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ limit: 10, offset: 10 })
      );
      
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.pageSize).toBe(10);
    });

    test('should validate ticket ID', async () => {
      const response = await request(app)
        .get('/api/tickets/abc/comments')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Ticket not found');
    });
  });
});