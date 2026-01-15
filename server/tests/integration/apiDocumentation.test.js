/**
 * API Documentation Test
 * Tests for OpenAPI documentation endpoints
 */

import request from 'supertest';
import { app } from '../../src/index.js';

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
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected defined, got ${actual}`);
      }
    },
    toHaveProperty(prop) {
      if (!(prop in actual)) {
        throw new Error(`Expected object to have property ${prop}`);
      }
    },
    toBeArray() {
      if (!Array.isArray(actual)) {
        throw new Error(`Expected array, got ${typeof actual}`);
      }
    }
  };
}

// OpenAPI specification tests
test('OpenAPI spec should be available at /api-docs/openapi.json', async () => {
  const response = await request(app)
    .get('/api-docs/openapi.json')
    .expect(200);
  
  expect(response.body).toHaveProperty('openapi');
  expect(response.body).toHaveProperty('info');
  expect(response.body).toHaveProperty('paths');
  expect(response.body).toHaveProperty('components');
  
  expect(response.body.info.title).toContain('Ticket Management System');
  expect(response.body.openapi).toBe('3.0.3');
});

test('OpenAPI spec should include ticket endpoints', async () => {
  const response = await request(app)
    .get('/api-docs/openapi.json')
    .expect(200);
  
  expect(response.body.paths).toHaveProperty('/api/tickets');
  expect(response.body.paths).toHaveProperty('/api/tickets/{id}');
  expect(response.body.paths).toHaveProperty('/api/tickets/{id}/assign-hotel');
  expect(response.body.paths).toHaveProperty('/api/tickets/{id}/actions');
});

test('OpenAPI spec should include proper schemas', async () => {
  const response = await request(app)
    .get('/api-docs/openapi.json')
    .expect(200);
  
  expect(response.body.components.schemas).toHaveProperty('Ticket');
  expect(response.body.components.schemas).toHaveProperty('CreateTicketRequest');
  expect(response.body.components.schemas).toHaveProperty('UpdateTicketRequest');
  expect(response.body.components.schemas).toHaveProperty('TicketActions');
});

test('Ticket schema should have required fields', async () => {
  const response = await request(app)
    .get('/api-docs/openapi.json')
    .expect(200);
  
  const ticketSchema = response.body.components.schemas.Ticket;
  expect(ticketSchema).toHaveProperty('required');
  expect(ticketSchema.required).toContain('id');
  expect(ticketSchema.required).toContain('name');
  expect(ticketSchema.required).toContain('price');
  expect(ticketSchema.required).toContain('status');
});

test('API documentation should be accessible via Swagger UI', async () => {
  const response = await request(app)
    .get('/api-docs/')
    .expect(200);
  
  expect(response.text).toContain('swagger');
  expect(response.text).toContain('Ticket Management API Documentation');
});

test('OpenAPI spec should include security definitions', async () => {
  const response = await request(app)
    .get('/api-docs/openapi.json')
    .expect(200);
  
  expect(response.body.components).toHaveProperty('securitySchemes');
  expect(response.body.components.securitySchemes).toHaveProperty('bearerAuth');
  expect(response.body.components.securitySchemes.bearerAuth.type).toBe('http');
});

test('API endpoints should require authentication', async () => {
  const response = await request(app)
    .get('/api/tickets')
    .expect(401);
  
  // Should return unauthorized when no auth provided
});

// Run all tests
function runTests() {
  console.log('🧪 Running API Documentation Tests...\n');
  
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
    console.log('🎉 All API documentation tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the API documentation implementation.');
    process.exit(1);
  }
}

export { test, expect, runTests };