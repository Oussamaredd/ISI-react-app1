import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service.js';
import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { ToursController } from '../tours/tours.controller.js';
import { ToursService } from '../tours/tours.service.js';
import { UsersService } from '../users/users.service.js';

describe('Tours agent operations', () => {
  const tourId = '8a6309b8-638f-4951-8b06-2943503c6db4';
  const stopId = 'eb816662-fd58-4249-9233-e3f0c0d627e9';
  const anomalyTypeId = 'f6c26a84-b0e8-4a27-b2cc-1c2af04f4cc5';
  const authUserId = '2f8644d4-cf1d-4fd0-a89f-a4dcfce8b8f2';

  const mockToursService = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getAgentTour: vi.fn(),
    startTour: vi.fn(),
    validateStop: vi.fn(),
    listAnomalyTypes: vi.fn(),
    reportAnomaly: vi.fn(),
    getTourActivity: vi.fn(),
  };

  const authServiceMock = {
    getAuthUserFromRequest: vi.fn(),
  };

  const usersServiceMock = {
    ensureUserForAuth: vi.fn(),
    getRolesForUser: vi.fn(),
  };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ToursController],
      providers: [
        { provide: ToursService, useValue: mockToursService },
        { provide: AuthService, useValue: authServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as { authUser?: { id: string } }).authUser = { id: authUserId };
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(AuthenticatedUserGuard.prototype, 'canActivate').mockResolvedValue(true as any);
    vi.spyOn(PermissionsGuard.prototype, 'canActivate').mockReturnValue(true as any);
    mockToursService.getAgentTour.mockResolvedValue({ id: tourId, stops: [] });
    mockToursService.startTour.mockResolvedValue({ id: tourId, status: 'in_progress' });
    mockToursService.validateStop.mockResolvedValue({ validatedStopId: stopId, nextStopId: null });
    mockToursService.listAnomalyTypes.mockResolvedValue([{ id: anomalyTypeId, label: 'Blocked access' }]);
    mockToursService.reportAnomaly.mockResolvedValue({ id: 'report-1', managerAlertTriggered: true });
    mockToursService.getTourActivity.mockResolvedValue([]);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app?.close();
  });

  it('GET /api/tours/agent/me resolves assigned tour for auth user', async () => {
    const response = await request(app.getHttpServer()).get('/api/tours/agent/me').expect(200);

    expect(mockToursService.getAgentTour).toHaveBeenCalledWith(authUserId);
    expect(response.body).toEqual({ id: tourId, stops: [] });
  });

  it('POST /api/tours/:id/start starts the tour', async () => {
    await request(app.getHttpServer()).post(`/api/tours/${tourId}/start`).expect(201);

    expect(mockToursService.startTour).toHaveBeenCalledWith(tourId, authUserId);
  });

  it('POST /api/tours/:tourId/stops/:stopId/validate validates stop and auto-advance payload', async () => {
    await request(app.getHttpServer())
      .post(`/api/tours/${tourId}/stops/${stopId}/validate`)
      .send({
        volumeLiters: 80,
        qrCode: 'CTR-1002',
      })
      .expect(201);

    expect(mockToursService.validateStop).toHaveBeenCalledWith(
      tourId,
      stopId,
      authUserId,
      expect.objectContaining({ volumeLiters: 80, qrCode: 'CTR-1002' }),
    );
  });

  it('POST /api/tours/:tourId/anomalies reports anomaly and triggers alert', async () => {
    await request(app.getHttpServer())
      .post(`/api/tours/${tourId}/anomalies`)
      .send({
        anomalyTypeId,
        comments: 'Blocked by parked vehicle',
      })
      .expect(201);

    expect(mockToursService.reportAnomaly).toHaveBeenCalledWith(
      tourId,
      authUserId,
      expect.objectContaining({ anomalyTypeId }),
    );
  });
});
