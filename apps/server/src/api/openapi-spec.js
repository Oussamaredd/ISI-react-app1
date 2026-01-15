/**
 * OpenAPI 3.0 Specification for Ticket Management System
 * Comprehensive API documentation with business rules
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Ticket Management System API',
    description: 'A comprehensive ticket management system with hotel booking capabilities and business rule enforcement',
    version: '1.0.0',
    contact: {
      name: 'API Support',
      email: 'support@ticketsystem.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.ticketsystem.com',
      description: 'Production server'
    }
  ],
  paths: {
    '/api/tickets': {
      get: {
        tags: ['Tickets'],
        summary: 'Get all tickets',
        description: 'Retrieve a list of tickets with optional filtering. Results are filtered based on user permissions.',
        operationId: 'getTickets',
        parameters: [
          {
            name: 'status',
            in: 'query',
            description: 'Filter by ticket status',
            schema: {
              type: 'string',
              enum: ['OPEN', 'COMPLETED']
            }
          },
          {
            name: 'hotel_id',
            in: 'query',
            description: 'Filter by assigned hotel',
            schema: {
              type: 'string'
            }
          },
          {
            name: 'assignee_id',
            in: 'query',
            description: 'Filter by assignee',
            schema: {
              type: 'string'
            }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of results',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20
            }
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Number of results to skip',
            schema: {
              type: 'integer',
              minimum: 0,
              default: 0
            }
          }
        ],
        responses: {
          '200': {
            description: 'List of tickets',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tickets: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Ticket'
                      }
                    },
                    total: {
                      type: 'integer',
                      description: 'Total number of tickets matching criteria'
                    },
                    pagination: {
                      $ref: '#/components/schemas/Pagination'
                    }
                  }
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/BadRequest'
          },
          '401': {
            $ref: '#/components/responses/Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/Forbidden'
          },
          '500': {
            $ref: '#/components/responses/InternalServerError'
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ]
      },
      post: {
        tags: ['Tickets'],
        summary: 'Create a new ticket',
        description: 'Create a new ticket with automatic business rule validation. High-priority tickets are auto-assigned.',
        operationId: 'createTicket',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateTicketRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Ticket created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Ticket'
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/BadRequest'
          },
          '401': {
            $ref: '#/components/responses/Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/Forbidden'
          },
          '500': {
            $ref: '#/components/responses/InternalServerError'
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ]
      }
    },
    '/api/tickets/{id}': {
      get: {
        tags: ['Tickets'],
        summary: 'Get a specific ticket',
        description: 'Retrieve a single ticket by ID. Access is controlled by user permissions.',
        operationId: 'getTicket',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Ticket ID',
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Ticket details',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Ticket'
                }
              }
            }
          },
          '404': {
            $ref: '#/components/responses/NotFound'
          },
          '401': {
            $ref: '#/components/responses/Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/Forbidden'
          },
          '500': {
            $ref: '#/components/responses/InternalServerError'
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ]
      },
      put: {
        tags: ['Tickets'],
        summary: 'Update a ticket',
        description: 'Update ticket details with state machine validation and business rule enforcement.',
        operationId: 'updateTicket',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Ticket ID',
            schema: {
              type: 'string'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateTicketRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Ticket updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Ticket'
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/BadRequest'
          },
          '404': {
            $ref: '#/components/responses/NotFound'
          },
          '401': {
            $ref: '#/components/responses/Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/Forbidden'
          },
          '500': {
            $ref: '#/components/responses/InternalServerError'
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ]
      },
      delete: {
        tags: ['Tickets'],
        summary: 'Delete a ticket',
        description: 'Delete a ticket. Only OPEN tickets can be deleted by ticket owners, or any ticket by admins.',
        operationId: 'deleteTicket',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Ticket ID',
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Ticket deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    deletedId: {
                      type: 'string'
                    },
                    message: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          },
          '404': {
            $ref: '#/components/responses/NotFound'
          },
          '401': {
            $ref: '#/components/responses/Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/Forbidden'
          },
          '500': {
            $ref: '#/components/responses/InternalServerError'
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ]
      }
    },
    '/api/tickets/{id}/assign-hotel': {
      post: {
        tags: ['Tickets'],
        summary: 'Assign a hotel to a ticket',
        description: 'Assign a hotel to a ticket. Only OPEN tickets can have hotels assigned.',
        operationId: 'assignHotel',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Ticket ID',
            schema: {
              type: 'string'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['hotelId'],
                properties: {
                  hotelId: {
                    type: 'string',
                    description: 'Hotel ID to assign'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Hotel assigned successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Ticket'
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/BadRequest'
          },
          '404': {
            $ref: '#/components/responses/NotFound'
          },
          '401': {
            $ref: '#/components/responses/Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/Forbidden'
          },
          '500': {
            $ref: '#/components/responses/InternalServerError'
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ]
      }
    },
    '/api/tickets/{id}/actions': {
      get: {
        tags: ['Tickets'],
        summary: 'Get available actions for a ticket',
        description: 'Get list of actions that can be performed on a ticket based on its state and user permissions.',
        operationId: 'getTicketActions',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Ticket ID',
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Available actions',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/TicketActions'
                }
              }
            }
          },
          '404': {
            $ref: '#/components/responses/NotFound'
          },
          '401': {
            $ref: '#/components/responses/Unauthorized'
          },
          '403': {
            $ref: '#/components/responses/Forbidden'
          },
          '500': {
            $ref: '#/components/responses/InternalServerError'
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ]
      }
    }
  },
  components: {
    schemas: {
      Ticket: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique ticket identifier',
            example: 'ticket-123'
          },
          name: {
            type: 'string',
            description: 'Ticket name or title',
            example: 'Weekend Getaway Package'
          },
          price: {
            type: 'number',
            format: 'decimal',
            description: 'Ticket price',
            example: 299.99,
            minimum: 0
          },
          status: {
            type: 'string',
            enum: ['OPEN', 'COMPLETED'],
            description: 'Current ticket status',
            example: 'OPEN'
          },
          hotel_id: {
            type: 'string',
            description: 'Assigned hotel ID',
            example: 'hotel-456',
            nullable: true
          },
          assigneeId: {
            type: 'string',
            description: 'User ID of ticket assignee',
            example: 'user-789',
            nullable: true
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Ticket priority level',
            example: 'medium'
          },
          category: {
            type: 'string',
            description: 'Ticket category',
            example: 'travel'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Ticket creation timestamp'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          },
          actions: {
            $ref: '#/components/schemas/TicketActions'
          }
        },
        required: ['id', 'name', 'price', 'status', 'created_at', 'updated_at']
      },
      CreateTicketRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Ticket name or title',
            example: 'Weekend Getaway Package',
            minLength: 1,
            maxLength: 200
          },
          price: {
            type: 'number',
            format: 'decimal',
            description: 'Ticket price',
            example: 299.99,
            minimum: 0
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Ticket priority level',
            example: 'medium'
          },
          category: {
            type: 'string',
            description: 'Ticket category',
            example: 'travel'
          },
          assigneeId: {
            type: 'string',
            description: 'User ID to assign ticket to',
            example: 'user-789',
            nullable: true
          }
        },
        required: ['name', 'price']
      },
      UpdateTicketRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Updated ticket name',
            example: 'Updated Weekend Package',
            minLength: 1,
            maxLength: 200
          },
          price: {
            type: 'number',
            format: 'decimal',
            description: 'Updated ticket price',
            example: 399.99,
            minimum: 0
          },
          status: {
            type: 'string',
            enum: ['OPEN', 'COMPLETED'],
            description: 'Updated ticket status (subject to state machine validation)',
            example: 'COMPLETED'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Updated priority level',
            example: 'high'
          },
          category: {
            type: 'string',
            description: 'Updated category',
            example: 'luxury'
          }
        }
      },
      TicketActions: {
        type: 'object',
        properties: {
          canAssignHotel: {
            type: 'boolean',
            description: 'Whether a hotel can be assigned to this ticket'
          },
          canReopen: {
            type: 'boolean',
            description: 'Whether this ticket can be reopened'
          },
          canDelete: {
            type: 'boolean',
            description: 'Whether this ticket can be deleted'
          },
          canUpdate: {
            type: 'boolean',
            description: 'Whether this ticket can be updated'
          },
          availableStatusTransitions: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'List of valid status transitions'
          }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            description: 'Number of items per page'
          },
          offset: {
            type: 'integer',
            description: 'Number of items skipped'
          },
          hasMore: {
            type: 'boolean',
            description: 'Whether there are more items'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Error code for programmatic handling',
            example: 'VALIDATION_ERROR'
          },
          message: {
            type: 'string',
            description: 'Human-readable error message',
            example: 'Invalid request parameters'
          },
          details: {
            type: 'object',
            description: 'Additional error details',
            nullable: true
          }
        },
        required: ['code', 'message']
      }
    },
    responses: {
      BadRequest: {
        description: 'Bad request - invalid parameters',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT authentication token'
      }
    }
  },
  tags: [
    {
      name: 'Tickets',
      description: 'Ticket management operations'
    }
  ]
};