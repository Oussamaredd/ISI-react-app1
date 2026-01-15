import request from 'supertest';
import { app } from '../src/index.js';

describe('API Health Checks', () => {
  test('GET /health returns 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /ready returns 200 with database connected', async () => {
    const response = await request(app)
      .get('/ready')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'ready');
    expect(response.body).toHaveProperty('database', 'connected');
  });

  test('GET /nonexistent returns 404', async () => {
    const response = await request(app)
      .get('/nonexistent')
      .expect(404);
    
    expect(response.body).toHaveProperty('error');
  });
});

describe('API Endpoints - Happy Paths', () => {
  test('GET /api/tickets returns tickets array', async () => {
    const response = await request(app)
      .get('/api/tickets')
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('GET /api/hotels returns hotels array', async () => {
    const response = await request(app)
      .get('/api/hotels')
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});

describe('API Endpoints - Error Cases', () => {
  test('POST /api/tickets without auth returns 401', async () => {
    await request(app)
      .post('/api/tickets')
      .send({ name: 'Test', price: 10 })
      .expect(401);
  });

  test('POST /api/tickets with invalid data returns 400', async () => {
    // This test will need auth middleware mocked or bypassed for testing
    const response = await request(app)
      .post('/api/tickets')
      .send({ name: '', price: -10 }) // Invalid data
      .expect(400);
    
    expect(response.body).toHaveProperty('error');
  });
});

describe('Error Handler Consistency', () => {
  test('All error responses have consistent format', async () => {
    const response = await request(app)
      .get('/api/tickets/99999') // Non-existent ticket
      .expect(404);
    
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('timestamp');
    expect(typeof response.body.timestamp).toBe('string');
  });
});