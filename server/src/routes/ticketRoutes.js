// server/src/routes/ticketRoutes.js
import express from "express";
import { ticketService, ServiceError } from "../services/TicketService.js";

const router = express.Router();

// Middleware to extract user context from request
function getUserContext(req) {
  return {
    userId: req.user?.id || req.headers['x-user-id'],
    role: req.user?.role || req.headers['x-user-role'] || 'user',
    permissions: req.user?.permissions || []
  };
}

// Error handling middleware
function handleServiceError(error, res) {
  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      details: error.details || null
    });
  }
  
  console.error('Unexpected error:', error);
  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred'
  });
}

// GET /api/tickets - Get all tickets with filtering
router.get("/", async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      hotel_id: req.query.hotel_id,
      assigneeId: req.query.assignee_id,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined
    };
    
    const userContext = getUserContext(req);
    const result = await ticketService.getTickets(filters, userContext);
    
    res.json({
      tickets: result,
      total: result.length,
      pagination: {
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        hasMore: filters.limit ? result.length >= filters.limit : false
      }
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

// GET /api/tickets/:id - Get specific ticket
router.get("/:id", async (req, res) => {
  try {
    const userContext = getUserContext(req);
    const ticket = await ticketService.getTicketById(req.params.id, userContext);
    res.json(ticket);
  } catch (error) {
    handleServiceError(error, res);
  }
});

// POST /api/tickets - Create new ticket
router.post("/", async (req, res) => {
  try {
    const userContext = getUserContext(req);
    const ticket = await ticketService.createTicket(req.body, userContext);
    res.status(201).json(ticket);
  } catch (error) {
    handleServiceError(error, res);
  }
});

// PUT /api/tickets/:id - Update ticket
router.put("/:id", async (req, res) => {
  try {
    const userContext = getUserContext(req);
    const ticket = await ticketService.updateTicket(req.params.id, req.body, userContext);
    res.json(ticket);
  } catch (error) {
    handleServiceError(error, res);
  }
});

// DELETE /api/tickets/:id - Delete ticket
router.delete("/:id", async (req, res) => {
  try {
    const userContext = getUserContext(req);
    const result = await ticketService.deleteTicket(req.params.id, userContext);
    res.json(result);
  } catch (error) {
    handleServiceError(error, res);
  }
});

// POST /api/tickets/:id/assign-hotel - Assign hotel to ticket
router.post("/:id/assign-hotel", async (req, res) => {
  try {
    const { hotelId } = req.body;
    if (!hotelId) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'hotelId is required'
      });
    }
    
    const userContext = getUserContext(req);
    const ticket = await ticketService.assignHotel(req.params.id, hotelId, userContext);
    res.json(ticket);
  } catch (error) {
    handleServiceError(error, res);
  }
});

// GET /api/tickets/:id/actions - Get available actions for ticket
router.get("/:id/actions", async (req, res) => {
  try {
    const userContext = getUserContext(req);
    const actions = await ticketService.getTicketActions(req.params.id, userContext);
    res.json(actions);
  } catch (error) {
    handleServiceError(error, res);
  }
});

export default router;
