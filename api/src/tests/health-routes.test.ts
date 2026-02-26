import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { HealthController } from '../health/health.controller.js';
import { HealthService } from '../health/health.service.js';

describe('Health route smoke checks', () => {
  let app: INestApplication;

  const healthService = {
    checkDatabase: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.get('/health', (_request: Request, response: Response) => {
      response.status(200).json({
        status: 'ok',
        service: 'EcoTrack API',
        timestamp: new Date().toISOString(),
      });
    });

    await app.init();

    // Ensure readiness handler always uses the mocked dependency in this suite.
    const controller = app.get(HealthController);
    Object.assign(controller as object, { healthService });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    healthService.checkDatabase.mockResolvedValue({ status: 'ok' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes liveness aliases for startup probes', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer()).get('/api/health').expect(200);
    await request(app.getHttpServer()).get('/api/health/live').expect(200);
    expect(healthService.checkDatabase).not.toHaveBeenCalled();
  });

  it('returns 200 on readiness probe when database is available', async () => {
    healthService.checkDatabase.mockResolvedValueOnce({ status: 'ok' });

    const response = await request(app.getHttpServer()).get('/api/health/ready').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.database.status).toBe('ok');
  });

  it('returns 503 on readiness probe when database is unavailable', async () => {
    healthService.checkDatabase.mockResolvedValueOnce({
      status: 'error',
      message: 'database unavailable',
    });

    const response = await request(app.getHttpServer()).get('/api/health/ready').expect(503);

    expect(response.body.status).toBe('degraded');
    expect(response.body.database.status).toBe('error');
  });
});
