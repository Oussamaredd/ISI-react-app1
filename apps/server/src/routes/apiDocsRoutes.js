/**
 * OpenAPI Documentation Routes
 * Provides API specification and documentation endpoints
 */

import express from 'express';
import { openApiSpec } from '../api/openapi-spec.js';
import swaggerUi from 'swagger-ui-express';

const router = express.Router();

// Serve OpenAPI specification
router.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(openApiSpec);
});

// Serve Swagger UI documentation
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openApiSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Ticket Management API Documentation'
}));

export default router;