/**
 * OpenAPI Service Layer
 * Business logic layer between routes and models
 * Enforces business rules and provides service-level operations
 */

import { getTickets, deleteTicket, assignHotelToTicket } from '../models/ticketModel.js';
import { isValidTransition, canAssignHotel, canReopen, TICKET_STATUSES } from '../domain/ticketStateMachine.js';

/**
 * Service class for ticket operations with business rule enforcement
 */
export class TicketService {
  /**
   * Get all tickets with filtering and business rule validation
   */
  async getTickets(filters = {}, userContext = {}) {
    try {
      // Apply user-based filtering based on role
      const enhancedFilters = this._applyUserPermissions(filters, userContext);
      
      // Get tickets from data layer
      const tickets = await getTickets(enhancedFilters);
      
      // Apply business rule transformations
      return this._transformTicketData(tickets, userContext);
    } catch (error) {
      throw new ServiceError(`Failed to retrieve tickets: ${error.message}`, 'GET_TICKETS_ERROR');
    }
  }

  /**
   * Get a single ticket by ID with business rule validation
   */
  async getTicketById(id, userContext = {}) {
    try {
      const tickets = await getTickets({ id });
      const ticket = tickets[0];
      
      if (!ticket) {
        throw new ServiceError('Ticket not found', 'TICKET_NOT_FOUND', 404);
      }
      
      // Check user permissions
      this._validateTicketAccess(ticket, userContext);
      
      return this._transformTicketData([ticket], userContext)[0];
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(`Failed to retrieve ticket: ${error.message}`, 'GET_TICKET_ERROR');
    }
  }

  /**
   * Create a new ticket with business rule validation
   */
  async createTicket(ticketData, userContext = {}) {
    try {
      // Validate ticket data
      this._validateCreateTicketData(ticketData);
      
      // Apply business rules
      const enhancedTicket = this._applyCreateBusinessRules(ticketData, userContext);
      
      // TODO: Implement actual ticket creation in model layer
      // For now, we'll simulate the creation
      const createdTicket = {
        id: Date.now().toString(), // Simulated ID
        ...enhancedTicket,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return this._transformTicketData([createdTicket], userContext)[0];
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(`Failed to create ticket: ${error.message}`, 'CREATE_TICKET_ERROR');
    }
  }

  /**
   * Update a ticket with state machine validation
   */
  async updateTicket(id, updates, userContext = {}) {
    try {
      // Get current ticket
      const currentTicket = await this.getTicketById(id, userContext);
      
      // Validate update permissions
      this._validateUpdatePermissions(currentTicket, updates, userContext);
      
      // Apply state machine transitions
      const validatedUpdates = this._validateStatusTransition(currentTicket, updates);
      
      // Apply business rules
      const enhancedUpdates = this._applyUpdateBusinessRules(validatedUpdates, currentTicket, userContext);
      
      // TODO: Implement actual update in model layer
      const updatedTicket = {
        ...currentTicket,
        ...enhancedUpdates,
        updated_at: new Date().toISOString()
      };
      
      return this._transformTicketData([updatedTicket], userContext)[0];
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(`Failed to update ticket: ${error.message}`, 'UPDATE_TICKET_ERROR');
    }
  }

  /**
   * Delete a ticket with business rule validation
   */
  async deleteTicket(id, userContext = {}) {
    try {
      // Get current ticket
      const currentTicket = await this.getTicketById(id, userContext);
      
      // Validate delete permissions
      this._validateDeletePermissions(currentTicket, userContext);
      
      // TODO: Implement actual deletion in model layer
      await deleteTicket(id);
      
      return { deletedId: id, message: 'Ticket deleted successfully' };
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(`Failed to delete ticket: ${error.message}`, 'DELETE_TICKET_ERROR');
    }
  }

  /**
   * Assign a hotel to a ticket with business rule validation
   */
  async assignHotel(ticketId, hotelId, userContext = {}) {
    try {
      // Get current ticket
      const currentTicket = await this.getTicketById(ticketId, userContext);
      
      // Validate hotel assignment permissions
      this._validateHotelAssignmentPermissions(currentTicket, userContext);
      
      // Perform assignment
      const updatedTicket = await assignHotelToTicket(ticketId, hotelId);
      
      return this._transformTicketData([updatedTicket], userContext)[0];
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(`Failed to assign hotel: ${error.message}`, 'ASSIGN_HOTEL_ERROR');
    }
  }

  /**
   * Get available actions for a ticket based on current state and user permissions
   */
  async getTicketActions(id, userContext = {}) {
    try {
      const ticket = await this.getTicketById(id, userContext);
      
      const actions = {
        canAssignHotel: canAssignHotel(ticket.status) && this._hasPermission(userContext, 'assign_hotel'),
        canReopen: canReopen(ticket.status) && this._hasPermission(userContext, 'reopen_ticket'),
        canDelete: this._canDeleteTicket(ticket, userContext),
        canUpdate: this._canUpdateTicket(ticket, userContext),
        availableStatusTransitions: this._getAvailableStatusTransitions(ticket.status)
      };
      
      return actions;
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(`Failed to get ticket actions: ${error.message}`, 'GET_ACTIONS_ERROR');
    }
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Apply user permissions to filters
   */
  _applyUserPermissions(filters, userContext) {
    const { role, userId } = userContext;
    const enhancedFilters = { ...filters };
    
    // If not admin, only show tickets relevant to user
    if (role !== 'admin') {
      // TODO: Implement user-specific filtering logic
      // enhancedFilters.assigneeId = userId;
    }
    
    return enhancedFilters;
  }

  /**
   * Transform ticket data based on user context
   */
  _transformTicketData(tickets, userContext) {
    return tickets.map(ticket => {
      const transformed = { ...ticket };
      
      // Add computed fields based on business rules
      transformed.actions = {
        canAssignHotel: canAssignHotel(ticket.status) && this._hasPermission(userContext, 'assign_hotel'),
        canReopen: canReopen(ticket.status) && this._hasPermission(userContext, 'reopen_ticket')
      };
      
      return transformed;
    });
  }

  /**
   * Validate ticket access permissions
   */
  _validateTicketAccess(ticket, userContext) {
    if (!this._hasPermission(userContext, 'view_all_tickets') && 
        ticket.assigneeId !== userContext.userId) {
      throw new ServiceError('Access denied to ticket', 'ACCESS_DENIED', 403);
    }
  }

  /**
   * Validate create ticket data
   */
  _validateCreateTicketData(ticketData) {
    const required = ['name', 'price'];
    const missing = required.filter(field => !ticketData[field]);
    
    if (missing.length > 0) {
      throw new ServiceError(`Missing required fields: ${missing.join(', ')}`, 'VALIDATION_ERROR', 400);
    }
    
    if (ticketData.price < 0) {
      throw new ServiceError('Price cannot be negative', 'VALIDATION_ERROR', 400);
    }
    
    if (!ticketData.name || ticketData.name.trim().length === 0) {
      throw new ServiceError('Name is required', 'VALIDATION_ERROR', 400);
    }
  }

  /**
   * Apply business rules for ticket creation
   */
  _applyCreateBusinessRules(ticketData, userContext) {
    const enhanced = { ...ticketData };
    
    // Default status to OPEN
    enhanced.status = enhanced.status || TICKET_STATUSES.OPEN;
    
    // Auto-assign high priority tickets
    if (enhanced.priority === 'high' && !enhanced.assigneeId) {
      enhanced.assigneeId = 'auto-assigned';
    }
    
    return enhanced;
  }

  /**
   * Validate update permissions
   */
  _validateUpdatePermissions(ticket, updates, userContext) {
    if (!this._hasPermission(userContext, 'update_all_tickets') && 
        ticket.assigneeId !== userContext.userId) {
      throw new ServiceError('Cannot update ticket: insufficient permissions', 'ACCESS_DENIED', 403);
    }
  }

  /**
   * Validate status transitions using state machine
   */
  _validateStatusTransition(currentTicket, updates) {
    if (updates.status && updates.status !== currentTicket.status) {
      const isValid = isValidTransition(currentTicket.status, updates.status);
      if (!isValid) {
        throw new ServiceError(
          `Invalid status transition from ${currentTicket.status} to ${updates.status}`,
          'INVALID_STATUS_TRANSITION',
          400
        );
      }
    }
    
    return updates;
  }

  /**
   * Apply business rules for updates
   */
  _applyUpdateBusinessRules(updates, currentTicket, userContext) {
    const enhanced = { ...updates };
    
    // Business rule: Cannot change price after hotel assignment
    if (updates.price && currentTicket.hotel_id) {
      if (!this._hasPermission(userContext, 'override_price_change')) {
        throw new ServiceError('Cannot change price after hotel assignment', 'BUSINESS_RULE_VIOLATION', 400);
      }
    }
    
    return enhanced;
  }

  /**
   * Validate delete permissions
   */
  _validateDeletePermissions(ticket, userContext) {
    if (!this._canDeleteTicket(ticket, userContext)) {
      throw new ServiceError('Cannot delete ticket: insufficient permissions or invalid state', 'DELETE_DENIED', 403);
    }
  }

  /**
   * Validate hotel assignment permissions
   */
  _validateHotelAssignmentPermissions(ticket, userContext) {
    if (!canAssignHotel(ticket.status)) {
      throw new ServiceError(`Cannot assign hotel to ticket with status: ${ticket.status}`, 'INVALID_STATUS', 400);
    }
    
    if (!this._hasPermission(userContext, 'assign_hotel')) {
      throw new ServiceError('Insufficient permissions to assign hotel', 'ACCESS_DENIED', 403);
    }
  }

  /**
   * Check if user can delete ticket
   */
  _canDeleteTicket(ticket, userContext) {
    // Can only delete OPEN tickets unless admin
    return (ticket.status === TICKET_STATUSES.OPEN && ticket.assigneeId === userContext.userId) ||
           this._hasPermission(userContext, 'delete_all_tickets');
  }

  /**
   * Check if user can update ticket
   */
  _canUpdateTicket(ticket, userContext) {
    return ticket.assigneeId === userContext.userId || 
           this._hasPermission(userContext, 'update_all_tickets');
  }

  /**
   * Get available status transitions
   */
  _getAvailableStatusTransitions(currentStatus) {
    const transitions = [];
    Object.entries(TICKET_STATUSES).forEach(([key, status]) => {
      if (isValidTransition(currentStatus, status)) {
        transitions.push(status);
      }
    });
    return transitions;
  }

  /**
   * Check if user has specific permission
   */
  _hasPermission(userContext, permission) {
    if (!userContext || !userContext.role) return false;
    
    const rolePermissions = {
      admin: ['view_all_tickets', 'update_all_tickets', 'delete_all_tickets', 'assign_hotel', 'reopen_ticket', 'override_price_change'],
      manager: ['view_all_tickets', 'update_all_tickets', 'assign_hotel', 'reopen_ticket'],
      user: ['view_own_tickets', 'update_own_tickets']
    };
    
    return rolePermissions[userContext.role]?.includes(permission) || false;
  }
}

/**
 * Custom service error class
 */
export class ServiceError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Export singleton instance
export const ticketService = new TicketService();