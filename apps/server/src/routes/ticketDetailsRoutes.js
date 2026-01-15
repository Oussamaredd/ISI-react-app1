// apps/server/src/routes/ticketDetailsRoutes.js
import express from 'express';
import {
  getTicketDetails,
  addComment,
  updateComment,
  deleteCommentController,
  getComments
} from '../controllers/ticketDetailsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/tickets/:id/details - Get ticket details with comments and activity
router.get('/:id/details', requireAuth, getTicketDetails);

// POST /api/tickets/:id/comments - Add comment to ticket
router.post('/:id/comments', requireAuth, addComment);

// GET /api/tickets/:id/comments - Get comments for ticket (pagination)
router.get('/:id/comments', requireAuth, getComments);

// PUT /api/tickets/:id/comments/:commentId - Update comment
router.put('/:id/comments/:commentId', requireAuth, updateComment);

// DELETE /api/tickets/:id/comments/:commentId - Delete comment
router.delete('/:id/comments/:commentId', requireAuth, deleteCommentController);

export default router;