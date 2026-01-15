import { pool } from '../config/db.js';

/**
 * Get comments for a ticket with pagination
 */
export async function getCommentsByTicketId(ticketId, options = {}) {
  const { limit = 20, offset = 0 } = options;
  
  const result = await pool.query(
    `SELECT tc.*, u.name as user_name, u.email as user_email
     FROM ticket_comments tc
     JOIN users u ON tc.user_id = u.id
     WHERE tc.ticket_id = $1
     ORDER BY tc.created_at ASC
     LIMIT $2 OFFSET $3`,
    [ticketId, limit, offset]
  );
  
  return result.rows;
}

/**
 * Create a new comment
 */
export async function createComment(ticketId, userId, body) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      `INSERT INTO ticket_comments (ticket_id, user_id, body, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [ticketId, userId, body]
    );
    
    // Create activity entry for comment
    await client.query(
      `INSERT INTO ticket_activity (ticket_id, actor_user_id, type, metadata, created_at)
       VALUES ($1, $2, 'comment_added', $3, NOW())`,
      [ticketId, userId, JSON.stringify({
        comment_id: result.rows[0].id,
        body_preview: body.substring(0, 100) + (body.length > 100 ? '...' : '')
      })]
    );
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update a comment
 */
export async function updateComment(commentId, userId, body) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if user owns the comment
    const commentCheck = await client.query(
      'SELECT ticket_id FROM ticket_comments WHERE id = $1',
      [commentId]
    );
    
    const comment = commentCheck.rows[0];
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    const result = await client.query(
      `UPDATE ticket_comments 
       SET body = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [body, commentId]
    );
    
    // Create activity entry for comment update
    await client.query(
      `INSERT INTO ticket_activity (ticket_id, actor_user_id, type, metadata, created_at)
       VALUES ($1, $2, 'comment_updated', $3, NOW())`,
      [comment.ticket_id, userId, JSON.stringify({
        comment_id: commentId,
        body_preview: body.substring(0, 100) + (body.length > 100 ? '...' : '')
      })]
    );
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if user owns the comment
    const commentCheck = await client.query(
      'SELECT user_id, ticket_id FROM ticket_comments WHERE id = $1',
      [commentId]
    );
    
    const comment = commentCheck.rows[0];
    if (!comment || comment.user_id !== userId) {
      throw new Error('Unauthorized to delete this comment');
    }
    
    await client.query('DELETE FROM ticket_comments WHERE id = $1', [commentId]);
    
    // Create activity entry for comment deletion
    await client.query(
      `INSERT INTO ticket_activity (ticket_id, actor_user_id, type, metadata, created_at)
       VALUES ($1, $2, 'comment_deleted', $3, NOW())`,
      [comment.ticket_id, userId, JSON.stringify({
        comment_id: commentId,
        deleted_by: userId
      })]
    );
    
    await client.query('COMMIT');
    return { deletedId: commentId, message: 'Comment deleted successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get comment count for pagination
 */
export async function getCommentsCount(ticketId) {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM ticket_comments WHERE ticket_id = $1',
    [ticketId]
  );
  return parseInt(result.rows[0].count);
}