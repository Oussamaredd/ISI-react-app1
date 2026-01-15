/**
 * OpenAPI Service Layer Tests
 * Tests for TicketService business logic and error handling
 */

import { ticketService, ServiceError } from '../../src/services/TicketService.js';
import { TICKET_STATUSES } from '../../src/domain/ticketStateMachine.js';

const testResults = [];

function test(name, fn) {
  try {
    fn();
    testResults.push({ name, status: 'PASS', message: '' });
  } catch (error) {
    testResults.push({ name, status: 'FAIL', message: error.message });
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${actual} to contain ${expected}`);
      }
    },
    toBeTrue() {
      if (actual !== true) {
        throw new Error(`Expected true, got ${actual}`);
      }
    },
    toBeFalse() {
      if (actual !== false) {
        throw new Error(`Expected false, got ${actual}`);
      }
    },
    toThrow(expectedMessage) {
      try {
        actual();
        throw new Error('Expected function to throw');
      } catch (error) {
        if (expectedMessage && !error.message.includes(expectedMessage)) {
          throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
        }
      }
    },
    not: {
      toThrow(expectedMessage) {
        try {
          actual();
          // If we get here, function didn't throw, which is what we want
        } catch (error) {
          if (expectedMessage && !error.message.includes(expectedMessage)) {
            throw new Error(`Expected function not to throw, but it threw: ${error.message}`);
          } else {
            throw new Error(`Expected function not to throw, but it threw: ${error.message}`);
          }
        }
      }
    },
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected defined, got ${actual}`);
      }
    },
    toBeArray() {
      if (!Array.isArray(actual)) {
        throw new Error(`Expected array, got ${typeof actual}`);
      }
    },
    toHaveProperty(prop) {
      if (!(prop in actual)) {
        throw new Error(`Expected object to have property ${prop}`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, got ${actual}`);
      }
    }
  };
}

// Mock user contexts for testing
const adminUser = { userId: 'admin-123', role: 'admin' };
const managerUser = { userId: 'manager-123', role: 'manager' };
const regularUser = { userId: 'user-123', role: 'user' };

// === SERVICE CREATION AND INITIALIZATION ===
test('Service class should be instantiated correctly', () => {
  expect(ticketService).toBeDefined();
  expect(typeof ticketService.getTickets).toBe('function');
  expect(typeof ticketService.createTicket).toBe('function');
  expect(typeof ticketService.updateTicket).toBe('function');
  expect(typeof ticketService.deleteTicket).toBe('function');
});

// === TICKET CREATION TESTS ===
test('Should validate required fields for ticket creation', () => {
  const invalidTicket = { name: 'Test' }; // missing price
  
  expect(() => {
    ticketService._validateCreateTicketData(invalidTicket);
  }).toThrow('Missing required fields: price');
});

test('Should reject negative prices', () => {
  const invalidTicket = { name: 'Test', price: -50 };
  
  expect(() => {
    ticketService._validateCreateTicketData(invalidTicket);
  }).toThrow('Price cannot be negative');
});

test('Should reject empty names', () => {
  const invalidTicket = { name: '', price: 100 };
  
  expect(() => {
    ticketService._validateCreateTicketData(invalidTicket);
  }).toThrow('Missing required fields: name');
});

test('Should accept valid ticket data', () => {
  const validTicket = { name: 'Valid Ticket', price: 100 };
  
  expect(() => {
    ticketService._validateCreateTicketData(validTicket);
  }).not.toThrow();
});

test('Should apply business rules for ticket creation', () => {
  const ticketData = { name: 'Test Ticket', price: 100, priority: 'high' };
  const enhanced = ticketService._applyCreateBusinessRules(ticketData, regularUser);
  
  expect(enhanced.status).toBe(TICKET_STATUSES.OPEN);
  expect(enhanced.assigneeId).toBe('auto-assigned');
});

test('Should not auto-assign non-high priority tickets', () => {
  const ticketData = { name: 'Test Ticket', price: 100, priority: 'low' };
  const enhanced = ticketService._applyCreateBusinessRules(ticketData, regularUser);
  
  expect(enhanced.status).toBe(TICKET_STATUSES.OPEN);
  expect(enhanced.assigneeId).toBeUndefined();
});

// === TICKET UPDATE TESTS ===
test('Should validate status transitions', () => {
  const currentTicket = { id: '123', status: TICKET_STATUSES.OPEN };
  const validUpdate = { status: TICKET_STATUSES.COMPLETED };
  
  expect(() => {
    ticketService._validateStatusTransition(currentTicket, validUpdate);
  }).not.toThrow();
});

test('Should reject invalid status transitions', () => {
  // Test with invalid status to ensure validation works
  const currentTicket = { id: '123', status: 'INVALID_STATUS' };
  const invalidUpdate = { status: 'INVALID_TARGET' };
  
  // This should throw because the status transition is invalid
  expect(() => {
    ticketService._validateStatusTransition(currentTicket, invalidUpdate);
  }).toThrow('Invalid status transition');
});

// === PERMISSION TESTS ===
test('Should check admin permissions correctly', () => {
  expect(ticketService._hasPermission(adminUser, 'view_all_tickets')).toBeTrue();
  expect(ticketService._hasPermission(adminUser, 'delete_all_tickets')).toBeTrue();
  expect(ticketService._hasPermission(adminUser, 'assign_hotel')).toBeTrue();
});

test('Should check manager permissions correctly', () => {
  expect(ticketService._hasPermission(managerUser, 'view_all_tickets')).toBeTrue();
  expect(ticketService._hasPermission(managerUser, 'delete_all_tickets')).toBeFalse();
  expect(ticketService._hasPermission(managerUser, 'assign_hotel')).toBeTrue();
});

test('Should check user permissions correctly', () => {
  expect(ticketService._hasPermission(regularUser, 'view_all_tickets')).toBeFalse();
  expect(ticketService._hasPermission(regularUser, 'update_own_tickets')).toBeTrue();
  expect(ticketService._hasPermission(regularUser, 'nonexistent_permission')).toBeFalse();
});

// === BUSINESS RULE TESTS ===
test('Should prevent price changes after hotel assignment', () => {
  const currentTicket = { hotel_id: 'hotel-123' };
  const updates = { price: 200 };
  
  expect(() => {
    ticketService._applyUpdateBusinessRules(updates, currentTicket, regularUser);
  }).toThrow('Cannot change price after hotel assignment');
});

test('Should allow price changes for admins', () => {
  const currentTicket = { hotel_id: 'hotel-123' };
  const updates = { price: 200 };
  
  expect(() => {
    const result = ticketService._applyUpdateBusinessRules(updates, currentTicket, adminUser);
    expect(result).toBeDefined();
  }).not.toThrow();
});

test('Should allow price changes when no hotel assigned', () => {
  const currentTicket = { hotel_id: null };
  const updates = { price: 200 };
  
  expect(() => {
    const result = ticketService._applyUpdateBusinessRules(updates, currentTicket, regularUser);
    expect(result).toBeDefined();
  }).not.toThrow();
});

// === TICKET ACCESS TESTS ===
test('Should allow admins to access any ticket', () => {
  const ticket = { assigneeId: 'different-user' };
  
  expect(() => {
    ticketService._validateTicketAccess(ticket, adminUser);
  }).not.toThrow();
});

test('Should allow users to access their own tickets', () => {
  const ticket = { assigneeId: 'user-123' };
  
  expect(() => {
    ticketService._validateTicketAccess(ticket, regularUser);
  }).not.toThrow();
});

test('Should prevent users from accessing others tickets', () => {
  const ticket = { assigneeId: 'different-user' };
  
  expect(() => {
    ticketService._validateTicketAccess(ticket, regularUser);
  }).toThrow('Access denied to ticket');
});

// === DELETE PERMISSION TESTS ===
test('Should allow deleting own OPEN tickets', () => {
  const ticket = { status: TICKET_STATUSES.OPEN, assigneeId: 'user-123' };
  
  expect(ticketService._canDeleteTicket(ticket, regularUser)).toBeTrue();
});

test('Should prevent deleting others tickets', () => {
  const ticket = { status: TICKET_STATUSES.OPEN, assigneeId: 'different-user' };
  
  expect(ticketService._canDeleteTicket(ticket, regularUser)).toBeFalse();
});

test('Should allow admins to delete any ticket', () => {
  const ticket = { status: TICKET_STATUSES.COMPLETED, assigneeId: 'different-user' };
  
  expect(ticketService._canDeleteTicket(ticket, adminUser)).toBeTrue();
});

test('Should prevent deleting COMPLETED tickets by regular users', () => {
  const ticket = { status: TICKET_STATUSES.COMPLETED, assigneeId: 'user-123' };
  
  expect(ticketService._canDeleteTicket(ticket, regularUser)).toBeFalse();
});

// === HOTEL ASSIGNMENT TESTS ===
test('Should allow hotel assignment to OPEN tickets', () => {
  const ticket = { status: TICKET_STATUSES.OPEN };
  
  expect(() => {
    ticketService._validateHotelAssignmentPermissions(ticket, adminUser);
  }).not.toThrow();
});

test('Should prevent hotel assignment to COMPLETED tickets', () => {
  const ticket = { status: TICKET_STATUSES.COMPLETED };
  
  expect(() => {
    ticketService._validateHotelAssignmentPermissions(ticket, adminUser);
  }).toThrow('Cannot assign hotel to ticket with status');
});

test('Should prevent hotel assignment without permissions', () => {
  const ticket = { status: TICKET_STATUSES.OPEN };
  
  expect(() => {
    ticketService._validateHotelAssignmentPermissions(ticket, regularUser);
  }).toThrow('Insufficient permissions to assign hotel');
});

// === DATA TRANSFORMATION TESTS ===
test('Should transform ticket data with actions', () => {
  const tickets = [
    { id: '1', status: TICKET_STATUSES.OPEN },
    { id: '2', status: TICKET_STATUSES.COMPLETED }
  ];
  
  const transformed = ticketService._transformTicketData(tickets, adminUser);
  
  expect(transformed).toBeArray();
  expect(transformed[0]).toHaveProperty('actions');
  expect(transformed[1]).toHaveProperty('actions');
  expect(transformed[0].actions.canAssignHotel).toBeTrue();
  expect(transformed[1].actions.canAssignHotel).toBeFalse();
});

// === AVAILABLE ACTIONS TESTS ===
test('Should provide available status transitions', () => {
  const transitions = ticketService._getAvailableStatusTransitions(TICKET_STATUSES.OPEN);
  
  expect(transitions).toBeArray();
  expect(transitions).toContain(TICKET_STATUSES.OPEN);
  expect(transitions).toContain(TICKET_STATUSES.COMPLETED);
});

// === SERVICE ERROR TESTS ===
test('ServiceError should create proper error object', () => {
  const error = new ServiceError('Test error', 'TEST_ERROR', 400);
  
  expect(error.message).toBe('Test error');
  expect(error.code).toBe('TEST_ERROR');
  expect(error.statusCode).toBe(400);
  expect(error.name).toBe('ServiceError');
});

test('ServiceError should default to 500 status code', () => {
  const error = new ServiceError('Test error', 'TEST_ERROR');
  
  expect(error.statusCode).toBe(500);
});

// Run all tests
function runTests() {
  console.log('🧪 Running OpenAPI Service Layer Tests...\n');
  
  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const totalTests = testResults.length;
  
  testResults.forEach(result => {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.status === 'FAIL') {
      console.log(`   Error: ${result.message}`);
    }
  });
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All service layer tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the service layer implementation.');
    process.exit(1);
  }
}

// Run tests automatically
runTests();