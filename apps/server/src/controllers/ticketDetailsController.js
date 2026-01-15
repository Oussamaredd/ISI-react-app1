// apps/server/src/controllers/ticketDetailsController.js
import { pool } from '../config/db.js';
import { 
  getTicketById, 
  updateTicket as updateTicketModel 
} from '../models/ticketModel.js';
import { 
  getCommentsByTicketId,
  createComment as createCommentModel,
  updateComment as updateCommentModel,
  deleteComment as deleteCommentModel,
  getCommentsCount
} from '../models/commentModel.js';
import {
  getTicketActivity,
  createActivity,
  createStatusChangeActivity,
  createHotelAssignmentActivity
} from '../models/activityModel.js';

/**
 * Get comprehensive ticket details with comments and activity
 */
export async function getTicketDetails(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    
    // Get ticket details
    const ticketResult = await pool.query(
      `SELECT t.*, h.name as hotel_name 
       FROM tickets t 
       LEFT JOIN hotels h ON t.hotel_id = h.id 
       WHERE t.id = $1`,
      [id]
    );
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Ticket not found',
        code: 'TICKET_NOT_FOUND'
      });
    }
    
    const ticket = ticketResult.rows[0];
    
    // Get comments with pagination
    const commentOffset = (page - 1) * pageSize;
    const [comments, totalComments] = await Promise.all([
      getCommentsByTicketId(id, { limit: pageSize, offset: commentOffset }),
      getCommentsCount(id)
    ]);
    
    // Get activity
    const activity = await getTicketActivity(id);
    
    res.json({
      ticket: {
        id: ticket.id,
        name: ticket.name,
        price: parseFloat(ticket.price),
        status: ticket.status,
        hotel_id: ticket.hotel_id,
        hotel_name: ticket.hotel_name,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      },
      comments: comments.map(comment => ({
        id: comment.id,
        body: comment.body,
        user_id: comment.user_id,
        user_name: comment.user_name,
        user_email: comment.user_email,
        user_role: comment.user_role,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
      })),
      commentsPagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: totalComments,
        totalPages: Math.ceil(totalComments / pageSize),
        hasNext: page * pageSize < totalComments,
        hasPrev: page > 1,
      },
      activity: activity.map(item => ({
        id: item.id,
        type: item.type,
        actor_name: item.actor_name,
        actor_email: item.actor_email,
        actor_role: item.actor_role,
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
        created_at: item.created_at,
      })),
    });
  } catch (error) {
    console.error('Get ticket details error:', error);
    res.status(500).json({
      error: 'Failed to fetch ticket details',
      details: error.message
    });
  }
}

/**
 * Add comment to ticket
 */
export async function addComment(req, res) {
  try {
    const { id } = req.params;
    const { body } = req.body;
    const user = req.currentUser;
    
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!body || body.trim().length === 0) {
      return res.status(400).json({
        error: 'Comment body is required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    if (body.length > 2000) {
      return res.status(400).json({
        error: 'Comment body cannot exceed 2000 characters',
        code: 'VALIDATION_ERROR'
      });
    }
    
    const comment = await createCommentModel(id, user.id, body.trim());
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment: {
        id: comment.id,
        body: comment.body,
        user_id: comment.user_id,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
      }
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      error: 'Failed to add comment',
      details: error.message
    });
  }
}

/**
 * Update comment
 */
export async function updateComment(req, res) {
  try {
    const { id, commentId } = req.params;
    const { body } = req.body;
    const user = req.currentUser;
    
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!body || body.trim().length === 0) {
      return res.status(400).json({
        error: 'Comment body is required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    if (body.length > 2000) {
      return res.status(400).json({
        error: 'Comment body cannot exceed 2000 characters',
        code: 'VALIDATION_ERROR'
      });
    }
    
    const comment = await updateCommentModel(commentId, user.id, body.trim());
    
    res.json({
      message: 'Comment updated successfully',
      comment: {
        id: comment.id,
        body: comment.body,
        user_id: comment.user_id,
        updated_at: comment.updated_at,
      }
    });
  } catch (error) {
    if (error.message === 'Unauthorized to update this comment') {
      return res.status(403).json({
        error: 'You can only update your own comments',
        code: 'PERMISSION_DENIED'
      });
    }
    
    console.error('Update comment error:', error);
    res.status(500).json({
      error: 'Failed to update comment',
      details: error.message
    });
  }
}

/**
 * Delete comment
 */
export async function deleteCommentController(req, res) {
  try {
    const { id, commentId } = req.params;
    const user = req.currentUser;
    
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const result = await deleteCommentModel(commentId, user.id);
    
    res.json(result);
  } catch (error) {
    if (error.message === 'Unauthorized to delete this comment') {
      return res.status(403).json({
        error: 'You can only delete your own comments',
        code: 'PERMISSION_DENIED'
      });
    }
    
    console.error('Delete comment error:', error);
    res.status(500).json({
      error: 'infrastructure/not-found',
      details: error.message
    });
  }
}

/**
 * Get more comments (pagination)
 */
export async function getComments(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    
    const commentOffset = (page - 1) * pageSize;
    const [comments, totalComments] = await Promise.all([
      getCommentsByTicketId(id, { limit: pageSize, offset: commentOffset }),
      getCommentsCount(id)
    ]);
    
    res.json({
      comments: comments.map(comment => ({
        id: comment.id,
        body: comment.body,
        user_id: comment.user_id,
        user_name: comment.user_name,
        user_email: comment.user_email,
        user_role: comment.user_role,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
      })),
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: totalComments,
        totalPages: Math.ceil(totalComments / pageSize),
        hasNext: page * pageSize < totalComments,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      error: 'Failed to fetch comments',
      details: error.message
    });
  }
}