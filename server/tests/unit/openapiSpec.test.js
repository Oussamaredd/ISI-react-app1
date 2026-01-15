/**
 * Simple OpenAPI Specification Test
 * Tests the OpenAPI specification structure without running a server
 */

import { openApiSpec } from '../../src/api/openapi-spec.js';

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

// Test OpenAPI specification structure
test('OpenAPI spec should have correct structure', () => {
  expect(openApiSpec.openapi).toBe('3.0.3');
  expect(openApiSpec).toHaveProperty('info');
  expect(openApiSpec).toHaveProperty('paths');
  expect(openApiSpec).toHaveProperty('components');
});

test('OpenAPI info should contain required fields', () => {
  expect(openApiSpec.info.title).toContain('Ticket Management System');
  expect(openApiSpec.info.version).toBe('1.0.0');
  expect(openApiSpec.info).toHaveProperty('description');
});

test('OpenAPI paths should include ticket endpoints', () => {
  expect(openApiSpec.paths).toHaveProperty('/api/tickets');
  expect(openApiSpec.paths).toHaveProperty('/api/tickets/{id}');
  expect(openApiSpec.paths).toHaveProperty('/api/tickets/{id}/assign-hotel');
  expect(openApiSpec.paths).toHaveProperty('/api/tickets/{id}/actions');
});

test('Ticket endpoints should have proper HTTP methods', () => {
  const ticketsPath = openApiSpec.paths['/api/tickets'];
  expect(ticketsPath).toHaveProperty('get');
  expect(ticketsPath).toHaveProperty('post');
  
  const ticketIdPath = openApiSpec.paths['/api/tickets/{id}'];
  expect(ticketIdPath).toHaveProperty('get');
  expect(ticketIdPath).toHaveProperty('put');
  expect(ticketIdPath).toHaveProperty('delete');
});

test('Components should include all required schemas', () => {
  const schemas = openApiSpec.components.schemas;
  expect(schemas).toHaveProperty('Ticket');
  expect(schemas).toHaveProperty('CreateTicketRequest');
  expect(schemas).toHaveProperty('UpdateTicketRequest');
  expect(schemas).toHaveProperty('TicketActions');
  expect(schemas).toHaveProperty('Error');
});

test('Ticket schema should have correct properties', () => {
  const ticketSchema = openApiSpec.components.schemas.Ticket;
  expect(ticketSchema.required).toContain('id');
  expect(ticketSchema.required).toContain('name');
  expect(ticketSchema.required).toContain('price');
  expect(ticketSchema.required).toContain('status');
  
  expect(ticketSchema.properties.status.enum).toEqual(['OPEN', 'COMPLETED']);
  expect(ticketSchema.properties.price.minimum).toBe(0);
});

test('Security schemes should be defined', () => {
  expect(openApiSpec.components).toHaveProperty('securitySchemes');
  expect(openApiSpec.components.securitySchemes).toHaveProperty('bearerAuth');
  expect(openApiSpec.components.securitySchemes.bearerAuth.type).toBe('http');
});

test('Error responses should be defined', () => {
  const responses = openApiSpec.components.responses;
  expect(responses).toHaveProperty('BadRequest');
  expect(responses).toHaveProperty('Unauthorized');
  expect(responses).toHaveProperty('Forbidden');
  expect(responses).toHaveProperty('NotFound');
  expect(responses).toHaveProperty('InternalServerError');
});

test('Endpoints should require authentication', () => {
  const ticketsGet = openApiSpec.paths['/api/tickets'].get;
  expect(ticketsGet.security).toEqual([{ bearerAuth: [] }]);
  
  const ticketsPost = openApiSpec.paths['/api/tickets'].post;
  expect(ticketsPost.security).toEqual([{ bearerAuth: [] }]);
});

test('Request bodies should be properly defined', () => {
  const createTicket = openApiSpec.paths['/api/tickets'].post;
  expect(createTicket.requestBody).toBeDefined();
  expect(createTicket.requestBody.required).toBeTrue();
  expect(createTicket.requestBody.content).toHaveProperty('application/json');
});

test('Response schemas should reference components', () => {
  const ticketsGet = openApiSpec.paths['/api/tickets'].get;
  const successResponse = ticketsGet.responses['200'];
  expect(successResponse.content['application/json'].schema).toHaveProperty('properties');
  expect(successResponse.content['application/json'].schema.properties).toHaveProperty('tickets');
});

test('Parameters should be properly defined', () => {
  const getTicket = openApiSpec.paths['/api/tickets/{id}'].get;
  expect(getTicket.parameters).toBeArray();
  expect(getTicket.parameters[0].name).toBe('id');
  expect(getTicket.parameters[0].in).toBe('path');
  expect(getTicket.parameters[0].required).toBeTrue();
});

test('Tags should be defined for endpoints', () => {
  const ticketsGet = openApiSpec.paths['/api/tickets'].get;
  expect(ticketsGet.tags).toContain('Tickets');
});

// Run all tests
function runTests() {
  console.log('🧪 Running OpenAPI Specification Tests...\n');
  
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
    console.log('🎉 All OpenAPI specification tests passed!');
    console.log('\n📚 API Documentation Summary:');
    console.log('   • Full OpenAPI 3.0 specification created');
    console.log('   • All CRUD operations documented');
    console.log('   • Business rules and security documented');
    console.log('   • Schema validation and examples included');
    console.log('   • Available at: http://localhost:3000/api-docs');
    console.log('   • JSON spec at: http://localhost:3000/api-docs/openapi.json');
  } else {
    console.log('⚠️  Some tests failed. Please review the OpenAPI specification.');
    process.exit(1);
  }
}

// Run tests automatically
runTests();