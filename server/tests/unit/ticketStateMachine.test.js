/**
 * Ticket State Machine Tests
 * Comprehensive tests for ticket business logic and state transitions
 */

import { 
  TICKET_STATUSES, 
  TICKET_TRANSITIONS, 
  isValidTransition, 
  getAllowedTransitions, 
  getNextPossibleStatuses,
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
    }
  };
}

// === CONSTANTS TESTS ===
test('TICKET_STATUSES constants are defined', () => {
  expect(TICKET_STATUSES.OPEN).toBe('OPEN');
  expect(TICKET_STATUSES.COMPLETED).toBe('COMPLETED');
});

test('TICKET_TRANSITIONS are properly defined', () => {
  expect(TICKET_TRANSITIONS[TICKET_STATUSES.OPEN]).toBeDefined();
  expect(TICKET_TRANSITIONS[TICKET_STATUSES.COMPLETED]).toBeDefined();
});

// === VALID TRANSITION TESTS ===
test('Valid transitions from OPEN status', () => {
  expect(isValidTransition(TICKET_STATUSES.OPEN, TICKET_STATUSES.OPEN)).toBeTrue();
  expect(isValidTransition(TICKET_STATUSES.OPEN, TICKET_STATUSES.COMPLETED)).toBeTrue();
});

test('Valid transitions from COMPLETED status', () => {
  expect(isValidTransition(TICKET_STATUSES.COMPLETED, TICKET_STATUSES.COMPLETED)).toBeTrue();
  expect(isValidTransition(TICKET_STATUSES.COMPLETED, TICKET_STATUSES.OPEN)).toBeTrue();
});

test('Invalid transitions are rejected', () => {
  expect(isValidTransition('INVALID_STATUS', TICKET_STATUSES.OPEN)).toBeFalse();
  expect(isValidTransition(TICKET_STATUSES.OPEN, 'INVALID_STATUS')).toBeFalse();
});

// === ALLOWED TRANSITIONS TESTS ===
test('Get allowed transitions for OPEN status', () => {
  const allowed = getAllowedTransitions(TICKET_STATUSES.OPEN);
  expect(allowed).toContain(TICKET_STATUSES.OPEN);
  expect(allowed).toContain(TICKET_STATUSES.COMPLETED);
  expect(allowed.length).toBe(2);
});

test('Get allowed transitions for COMPLETED status', () => {
  const allowed = getAllowedTransitions(TICKET_STATUSES.COMPLETED);
  expect(allowed).toContain(TICKET_STATUSES.COMPLETED);
  expect(allowed).toContain(TICKET_STATUSES.OPEN);
  expect(allowed.length).toBe(2);
});

test('Get allowed transitions for invalid status', () => {
  const allowed = getAllowedTransitions('INVALID_STATUS');
  expect(allowed.length).toBe(0);
});

// === NEXT POSSIBLE STATUSES TESTS ===
test('Get next possible statuses matches allowed transitions', () => {
  const nextOpen = getNextPossibleStatuses(TICKET_STATUSES.OPEN);
  const allowedOpen = getAllowedTransitions(TICKET_STATUSES.OPEN);
  expect(nextOpen).toEqual(allowedOpen);

  const nextCompleted = getNextPossibleStatuses(TICKET_STATUSES.COMPLETED);
  const allowedCompleted = getAllowedTransitions(TICKET_STATUSES.COMPLETED);
  expect(nextCompleted).toEqual(allowedCompleted);
});

// === BUSINESS RULES TESTS ===
test('Hotel assignment business rule', () => {
  expect(canAssignHotel(TICKET_STATUSES.OPEN)).toBeTrue();
  expect(canAssignHotel(TICKET_STATUSES.COMPLETED)).toBeFalse();
  expect(canAssignHotel('INVALID_STATUS')).toBeFalse();
});

test('Reopen business rule', () => {
  expect(canReopen(TICKET_STATUSES.COMPLETED)).toBeTrue();
  expect(canReopen(TICKET_STATUSES.OPEN)).toBeFalse();
  expect(canReopen('INVALID_STATUS')).toBeFalse();
});

// === EDGE CASES TESTS ===
test('Edge case: Same status transitions', () => {
  expect(isValidTransition(TICKET_STATUSES.OPEN, TICKET_STATUSES.OPEN)).toBeTrue();
  expect(isValidTransition(TICKET_STATUSES.COMPLETED, TICKET_STATUSES.COMPLETED)).toBeTrue();
});

test('Edge case: Null/undefined inputs', () => {
  expect(isValidTransition(null, TICKET_STATUSES.OPEN)).toBeFalse();
  expect(isValidTransition(TICKET_STATUSES.OPEN, null)).toBeFalse();
  expect(isValidTransition(undefined, TICKET_STATUSES.OPEN)).toBeFalse();
  expect(isValidTransition(TICKET_STATUSES.OPEN, undefined)).toBeFalse();
});

// === WORKFLOW VALIDATION TESTS ===
test('Complete workflow: OPEN -> COMPLETED -> OPEN', () => {
  // Start with OPEN
  expect(isValidTransition(null, TICKET_STATUSES.OPEN)).toBeFalse();
  
  // OPEN -> COMPLETED (assign hotel)
  expect(isValidTransition(TICKET_STATUSES.OPEN, TICKET_STATUSES.COMPLETED)).toBeTrue();
  
  // COMPLETED -> OPEN (reopen)
  expect(isValidTransition(TICKET_STATUSES.COMPLETED, TICKET_STATUSES.OPEN)).toBeTrue();
  
  // OPEN -> COMPLETED again (re-assign hotel)
  expect(isValidTransition(TICKET_STATUSES.OPEN, TICKET_STATUSES.COMPLETED)).toBeTrue();
});

test('Invalid workflow: Direct assignment without OPEN status', () => {
  // Cannot assign hotel to COMPLETED ticket
  expect(canAssignHotel(TICKET_STATUSES.COMPLETED)).toBeFalse();
});

// === TRANSITION SEMANTICS TESTS ===
test('Transition semantics are correct', () => {
  // OPEN -> OPEN: 'self' (stays open)
  expect(TICKET_TRANSITIONS[TICKET_STATUSES.OPEN][TICKET_STATUSES.OPEN]).toBe('self');
  
  // OPEN -> COMPLETED: 'assignHotel' (requires hotel)
  expect(TICKET_TRANSITIONS[TICKET_STATUSES.OPEN][TICKET_STATUSES.COMPLETED]).toBe('assignHotel');
  
  // COMPLETED -> COMPLETED: 'self' (stays completed)
  expect(TICKET_TRANSITIONS[TICKET_STATUSES.COMPLETED][TICKET_STATUSES.COMPLETED]).toBe('self');
  
  // COMPLETED -> OPEN: 'reopen' (reopen ticket)
  expect(TICKET_TRANSITIONS[TICKET_STATUSES.COMPLETED][TICKET_STATUSES.OPEN]).toBe('reopen');
});

// Run all tests
function runTests() {
  console.log('🧪 Running Ticket State Machine Tests...\n');
  
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
    console.log('🎉 All tests passed! State machine is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
} else {
  // For testing, run automatically
  runTests();
}

export { test, expect, runTests };