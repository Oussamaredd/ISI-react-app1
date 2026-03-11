import type { Express, Request, Response } from 'express';

import { buildLivenessPayload, buildReadinessPayload } from './health.payloads.js';
import type { HealthService } from './health.service.js';

const writeReadinessResponse = async (
  response: Response,
  healthService: Pick<HealthService, 'checkDatabase'>,
) => {
  const payload = await buildReadinessPayload(healthService);
  response.status(payload.status === 'ok' ? 200 : 503).json(payload);
};

export const attachRootHealthRoutes = (
  expressApp: Express,
  healthService: Pick<HealthService, 'checkDatabase'>,
) => {
  expressApp.get('/health', (_request: Request, response: Response) => {
    response.status(200).json(buildLivenessPayload());
  });

  expressApp.get('/healthz', (_request: Request, response: Response) => {
    response.status(200).json(buildLivenessPayload());
  });

  expressApp.get('/startupz', (_request: Request, response: Response) => {
    response.status(200).json(buildLivenessPayload());
  });

  expressApp.get('/readyz', async (_request: Request, response: Response) => {
    await writeReadinessResponse(response, healthService);
  });
};
