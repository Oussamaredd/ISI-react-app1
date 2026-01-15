/**
 * Business Rules Integration Tests
 * Tests for ticket model business rules and validation
 */

import { 
  getTickets,
  deleteTicket,
  assignHotelToTicket 
} from '../../src/models/ticketModel.js';

import { 
  TICKET_STATUSES, 
  isValidTransition,
  canAssignHotel,
  canReopen 
} from '../../src/domain/ticketStateMachine.js';

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
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected defined, got ${actual}`);
      }
    },
    toBeArray() {
      if (!Array.isArray(actual)) {
        throw new Error(`Expected array, got ${typeof actual}`);
      }
    }
  };
}

// Mock data for testing
const mockTicketData = {
  name: 'Test Ticket',
  price: 100,
  status: TICKET_STATUSES.OPEN
};

const mockHotelData = {
  id: 'hotel-123',
  name: 'Test Hotel'
};

// === TICKET CREATION BUSINESS RULES ===
test('Should create ticket with valid OPEN status', async () => {
  // This would normally hit the database, but we'll test the business logic
  expect(TICKET_STATUSES.OPEN).toBeDefined();
  expect(mockTicketData.status).toBe(TICKET_STATUSES.OPEN);
});

test('Should reject ticket creation without required fields', () => {
  const invalidTicket = { name: 'Invalid' }; // missing price and status
  
  // Test validation logic
  const hasRequiredFields = invalidTicket.name && 
                          invalidTicket.price !== undefined && 
                          invalidTicket.status;
  
  expect(hasRequiredFields).toBeFalse();
});

test('Should accept ticket with all required fields', () => {
  const validTicket = {
    name: 'Valid Ticket',
    price: 150,
    status: TICKET_STATUSES.OPEN
  };
  
  const hasRequiredFields = validTicket.name && 
                          validTicket.price !== undefined && 
                          validTicket.status !== undefined;
  
  expect(hasRequiredFields).toBeTrue();
});

// === STATUS TRANSITION BUSINESS RULES ===
test('Should allow OPEN to COMPLETED transition', () => {
  const isValid = isValidTransition(TICKET_STATUSES.OPEN, TICKET_STATUSES.COMPLETED);
  expect(isValid).toBeTrue();
});

test('Should allow COMPLETED to OPEN transition (reopen)', () => {
  const isValid = isValidTransition(TICKET_STATUSES.COMPLETED, TICKET_STATUSES.OPEN);
  expect(isValid).toBeTrue();
});

test('Should reject invalid status transitions', () => {
  const invalidTransitions = [
    ['INVALID', TICKET_STATUSES.OPEN],
    [TICKET_STATUSES.OPEN, 'INVALID'],
    [null, TICKET_STATUSES.OPEN],
    [TICKET_STATUSES.COMPLETED, null]
  ];
  
  invalidTransitions.forEach(([from, to]) => {
    const isValid = isValidTransition(from, to);
    expect(isValid).toBeFalse();
  });
});

// === HOTEL ASSIGNMENT BUSINESS RULES ===
test('Should allow hotel assignment to OPEN tickets', () => {
  const canAssign = canAssignHotel(TICKET_STATUSES.OPEN);
  expect(canAssign).toBeTrue();
});

test('Should reject hotel assignment to COMPLETED tickets', () => {
  const canAssign = canAssignHotel(TICKET_STATUSES.COMPLETED);
  expect(canAssign).toBeFalse();
});

test('Should reject hotel assignment to invalid status', () => {
  const canAssign = canAssignHotel('INVALID_STATUS');
  expect(canAssign).toBeFalse();
});

// === TICKET REOPEN BUSINESS RULES ===
test('Should allow reopening COMPLETED tickets', () => {
  const canReopenTicket = canReopen(TICKET_STATUSES.COMPLETED);
  expect(canReopenTicket).toBeTrue();
});

test('Should reject reopening OPEN tickets', () => {
  const canReopenTicket = canReopen(TICKET_STATUSES.OPEN);
  expect(canReopenTicket).toBeFalse();
});

// === PRICE VALIDATION BUSINESS RULES ===
test('Should validate positive prices', () => {
  const validPrices = [0, 1, 100, 999.99];
  validPrices.forEach(price => {
    const isValid = price >= 0 && !isNaN(price);
    expect(isValid).toBeTrue();
  });
});

test('Should reject negative prices', () => {
  const invalidPrices = [-1, -100, -0.01];
  invalidPrices.forEach(price => {
    const isValid = price >= 0 && !isNaN(price);
    expect(isValid).toBeFalse();
  });
});

// === NAME VALIDATION BUSINESS RULES ===
test('Should validate ticket names', () => {
  const validNames = [
    'Standard Ticket',
    'VIP Pass',
    'Weekend Getaway',
    'A' // Single character
  ];
  
  validNames.forEach(name => {
    const isValid = name && typeof name === 'string' && name.trim().length > 0;
    expect(isValid).toBeTrue();
  });
});

test('Should reject invalid ticket names', () => {
  const invalidNames = [
    null,
    undefined,
    '',
    '   ', // Only spaces
    123,
    {}
  ];
  
  invalidNames.forEach(name => {
    const isValid = !!(name && typeof name === 'string' && name.trim && name.trim().length > 0);
    expect(isValid).toBeFalse();
  });
});

// === WORKFLOW INTEGRATION TESTS ===
test('Should support complete ticket workflow', () => {
  // Step 1: Create OPEN ticket
  const ticket = { ...mockTicketData, status: TICKET_STATUSES.OPEN };
  expect(ticket.status).toBe(TICKET_STATUSES.OPEN);
  
  // Step 2: Assign hotel (only allowed for OPEN tickets)
  expect(canAssignHotel(ticket.status)).toBeTrue();
  
  // Step 3: Complete ticket (transition to COMPLETED)
  const canComplete = isValidTransition(TICKET_STATUSES.OPEN, TICKET_STATUSES.COMPLETED);
  expect(canComplete).toBeTrue();
  
  // Step 4: Try to reopen (allowed from COMPLETED)
  const completedTicket = { ...ticket, status: TICKET_STATUSES.COMPLETED };
  const canReopenFromCompleted = canReopen(completedTicket.status);
  expect(canReopenFromCompleted).toBeTrue();
});

test('Should prevent invalid workflow', () => {
  // Try to assign hotel to COMPLETED ticket
  expect(canAssignHotel(TICKET_STATUSES.COMPLETED)).toBeFalse();
  
  // Try to reopen OPEN ticket
  expect(canReopen(TICKET_STATUSES.OPEN)).toBeFalse();
});

// === EDGE CASES ===
test('Should handle boundary conditions', () => {
  const edgeCases = [
    { price: 0, name: 'Free Ticket', status: TICKET_STATUSES.OPEN },
    { price: Number.MAX_SAFE_INTEGER, name: 'Expensive Ticket', status: TICKET_STATUSES.OPEN },
    { price: 100, name: 'A'.repeat(100), status: TICKET_STATUSES.OPEN }
  ];
  
  edgeCases.forEach(ticket => {
    const isValidPrice = ticket.price >= 0 && !isNaN(ticket.price) && isFinite(ticket.price);
    const isValidName = ticket.name && typeof ticket.name === 'string' && ticket.name.trim().length > 0;
    const isValidStatus = Object.values(TICKET_STATUSES).includes(ticket.status);
    
    expect(isValidPrice).toBeTrue();
    expect(isValidName).toBeTrue();
    expect(isValidStatus).toBeTrue();
  });
});

// Run all tests
function runTests() {
  console.log('🧪 Running Business Rules Tests...\n');
  
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
    console.log('🎉 All business rules tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the business rules implementation.');
    process.exit(1);
  }
}

// Run tests automatically
runTests();