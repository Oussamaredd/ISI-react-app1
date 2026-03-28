import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../modules/auth/auth.service.js';
import { AuthenticatedUserGuard } from '../modules/auth/authenticated-user.guard.js';
import { PermissionsGuard } from '../modules/auth/permissions.guard.js';
import { ToursController } from '../modules/collections/tours.controller.js';
import { ToursService } from '../modules/collections/tours.service.js';
import { GamificationController } from '../modules/gamification/gamification.controller.js';
import { GamificationService } from '../modules/gamification/gamification.service.js';
import { ContainersController } from '../modules/iot/containers.controller.js';
import { ContainersService } from '../modules/iot/containers.service.js';
import { CitizenReportsController } from '../modules/reports/citizen-reports.controller.js';
import { CitizenReportsService } from '../modules/reports/citizen-reports.service.js';
import { UsersService } from '../modules/users/users.service.js';
import { ZonesController } from '../modules/zones/zones.controller.js';
import { ZonesService } from '../modules/zones/zones.service.js';

describe('Domain write endpoint smoke', () => {
  const zoneId = '5b4ac9a8-2eb4-42eb-aa0e-b4afcf689d6f';
  const containerId = 'f7a67f92-f8f7-4104-97b3-9136310cb2dd';
  const tourId = '8a6309b8-638f-4951-8b06-2943503c6db4';
  const authUserId = '2f8644d4-cf1d-4fd0-a89f-a4dcfce8b8f2';

  const containersServiceMock = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const zonesServiceMock = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const reportsServiceMock = {
    list: vi.fn(),
    create: vi.fn(),
  };

  const gamificationServiceMock = {
    getLeaderboard: vi.fn(),
    upsertProfile: vi.fn(),
  };

  const toursServiceMock = {
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
      controllers: [
        ContainersController,
        ZonesController,
        CitizenReportsController,
        GamificationController,
        ToursController,
      ],
      providers: [
        { provide: ContainersService, useValue: containersServiceMock },
        { provide: ZonesService, useValue: zonesServiceMock },
        { provide: CitizenReportsService, useValue: reportsServiceMock },
        { provide: GamificationService, useValue: gamificationServiceMock },
        { provide: ToursService, useValue: toursServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { authUser?: { id: string } }).authUser = { id: authUserId };
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

    containersServiceMock.list.mockResolvedValue({ items: [], total: 0 });
    containersServiceMock.create.mockResolvedValue({ id: containerId });
    containersServiceMock.update.mockResolvedValue({ id: containerId });

    zonesServiceMock.list.mockResolvedValue({ items: [], total: 0 });
    zonesServiceMock.create.mockResolvedValue({ id: zoneId });
    zonesServiceMock.update.mockResolvedValue({ id: zoneId });

    reportsServiceMock.list.mockResolvedValue({ items: [], total: 0 });
    reportsServiceMock.create.mockResolvedValue({ id: 'a3d83491-b363-40fc-bf50-cbead213f5da' });

    gamificationServiceMock.getLeaderboard.mockResolvedValue([]);
    gamificationServiceMock.upsertProfile.mockResolvedValue({
      userId: authUserId,
      points: 10,
      level: 1,
      badges: [],
    });

    toursServiceMock.list.mockResolvedValue({ items: [], total: 0 });
    toursServiceMock.create.mockResolvedValue({ id: tourId });
    toursServiceMock.update.mockResolvedValue({ id: tourId });
    toursServiceMock.listAnomalyTypes.mockResolvedValue([]);
    toursServiceMock.getTourActivity.mockResolvedValue([]);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app?.close();
  });

  it('handles container and zone create/update routes', async () => {
    await request(app.getHttpServer())
      .post('/api/containers')
      .send({
        code: 'CTR-101',
        label: 'Downtown Bin',
        status: 'available',
        fillLevelPercent: 45,
        zoneId,
      })
      .expect(201);
    expect(containersServiceMock.create).toHaveBeenCalledTimes(1);

    await request(app.getHttpServer())
      .put(`/api/containers/${containerId}`)
      .send({ status: 'attention_required', fillLevelPercent: 90 })
      .expect(200);
    expect(containersServiceMock.update).toHaveBeenCalledWith(
      containerId,
      expect.objectContaining({ status: 'attention_required', fillLevelPercent: 90 }),
    );

    await request(app.getHttpServer())
      .post('/api/zones')
      .send({
        name: 'Zone A',
        code: 'ZA',
        description: 'Core district',
      })
      .expect(201);
    expect(zonesServiceMock.create).toHaveBeenCalledTimes(1);

    await request(app.getHttpServer())
      .put(`/api/zones/${zoneId}`)
      .send({ isActive: false })
      .expect(200);
    expect(zonesServiceMock.update).toHaveBeenCalledWith(
      zoneId,
      expect.objectContaining({ isActive: false }),
    );
  });

  it('handles citizen report listing and gamification profile upsert routes', async () => {
    await request(app.getHttpServer())
      .get('/api/citizen-reports')
      .query({ q: ' overflow ', status: ' submitted ', page: '1', pageSize: '20' })
      .expect(200);
    expect(reportsServiceMock.list).toHaveBeenCalledWith({
      search: 'overflow',
      status: 'submitted',
      limit: 20,
      offset: 0,
    });

    await request(app.getHttpServer())
      .post('/api/gamification/profiles')
      .send({
        userId: authUserId,
        points: 10,
        level: 1,
        badges: [],
      })
      .expect(201);
    expect(gamificationServiceMock.upsertProfile).toHaveBeenCalledWith(
      expect.objectContaining({ userId: authUserId, points: 10 }),
    );
  });

  it('handles tours list/read/write routes', async () => {
    await request(app.getHttpServer())
      .get('/api/tours')
      .query({ q: ' morning ', page: '1', pageSize: '20' })
      .expect(200);
    expect(toursServiceMock.list).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'morning', limit: 20, offset: 0 }),
    );

    await request(app.getHttpServer()).get('/api/tours/anomaly-types').expect(200);
    expect(toursServiceMock.listAnomalyTypes).toHaveBeenCalledTimes(1);

    await request(app.getHttpServer()).get(`/api/tours/${tourId}/activity`).expect(200);
    expect(toursServiceMock.getTourActivity).toHaveBeenCalledWith(tourId);

    await request(app.getHttpServer())
      .post('/api/tours')
      .send({
        name: 'Morning Tour',
        scheduledFor: new Date().toISOString(),
        zoneId,
        stopContainerIds: [containerId],
      })
      .expect(201);
    expect(toursServiceMock.create).toHaveBeenCalledTimes(1);

    await request(app.getHttpServer())
      .put(`/api/tours/${tourId}`)
      .send({ status: 'in_progress' })
      .expect(200);
    expect(toursServiceMock.update).toHaveBeenCalledWith(
      tourId,
      expect.objectContaining({ status: 'in_progress' }),
    );
  });

  it('shows degraded agent activity reads and cleanly recovers after the dependency comes back', async () => {
    toursServiceMock.getTourActivity
      .mockRejectedValueOnce(new Error('tour activity feed offline'))
      .mockResolvedValueOnce([]);

    await request(app.getHttpServer()).get(`/api/tours/${tourId}/activity`).expect(500);
    await request(app.getHttpServer()).get(`/api/tours/${tourId}/activity`).expect(200);

    expect(toursServiceMock.getTourActivity).toHaveBeenCalledTimes(2);
  });
});

