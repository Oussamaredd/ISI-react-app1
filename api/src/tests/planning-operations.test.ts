import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service.js';
import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { PlanningController } from '../planning/planning.controller.js';
import { PlanningService } from '../planning/planning.service.js';
import { UsersService } from '../users/users.service.js';

describe('Planning operations', () => {
  const userId = 'ce320a88-fec0-4b2a-914a-242f8844f74f';

  const planningServiceMock = {
    listZones: vi.fn(),
    listAgents: vi.fn(),
    optimizeTour: vi.fn(),
    createPlannedTour: vi.fn(),
    getManagerDashboard: vi.fn(),
    triggerEmergencyCollection: vi.fn(),
    generateReport: vi.fn(),
    listReportHistory: vi.fn(),
    getReportById: vi.fn(),
    regenerateReport: vi.fn(),
    getRealtimeDashboardSnapshotEvent: vi.fn(),
    getReplayEventsAfter: vi.fn(),
    subscribeRealtimeEvents: vi.fn(),
    createKeepaliveEvent: vi.fn(),
    getRealtimeDiagnostics: vi.fn(),
    registerSseConnection: vi.fn(),
    unregisterSseConnection: vi.fn(),
    recordEmittedEvent: vi.fn(),
    issueStreamSession: vi.fn(),
    issueWebSocketSession: vi.fn(),
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
      controllers: [PlanningController],
      providers: [
        { provide: PlanningService, useValue: planningServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { authUser?: { id: string } }).authUser = { id: userId };
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

    planningServiceMock.listZones.mockResolvedValue([]);
    planningServiceMock.listAgents.mockResolvedValue([]);
    planningServiceMock.optimizeTour.mockResolvedValue({ route: [], metrics: { totalDistanceKm: 0 } });
    planningServiceMock.createPlannedTour.mockResolvedValue({ id: 'tour-1' });
    planningServiceMock.getManagerDashboard.mockResolvedValue({ ecoKpis: { containers: 0, zones: 0, tours: 0 } });
    planningServiceMock.triggerEmergencyCollection.mockResolvedValue({ alertTriggered: true });
    planningServiceMock.generateReport.mockResolvedValue({ id: 'report-1' });
    planningServiceMock.listReportHistory.mockResolvedValue([]);
    planningServiceMock.getReportById.mockResolvedValue({ id: 'report-1', fileContent: 'mock pdf' });
    planningServiceMock.regenerateReport.mockResolvedValue({ id: 'report-2' });
    planningServiceMock.getRealtimeDashboardSnapshotEvent.mockResolvedValue({
      id: 'evt-1',
      event: 'planning.dashboard.snapshot',
      data: { timestamp: '2026-02-23T00:00:00.000Z' },
    });
    planningServiceMock.subscribeRealtimeEvents.mockReturnValue(() => undefined);
    planningServiceMock.getReplayEventsAfter.mockReturnValue([]);
    planningServiceMock.createKeepaliveEvent.mockReturnValue({
      id: 'evt-keepalive',
      event: 'system.keepalive',
      data: { timestamp: '2026-02-23T00:00:00.000Z' },
    });
    planningServiceMock.getRealtimeDiagnostics.mockReturnValue({
      activeSseConnections: 0,
      activeWebSocketConnections: 0,
      counters: {
        sseConnected: 1,
        sseDisconnected: 1,
        wsConnected: 1,
        wsDisconnected: 1,
        wsAuthFailures: 0,
        emittedEvents: 10,
      },
      lastEventTimestamp: '2026-02-23T00:00:00.000Z',
      lastEventName: 'planning.dashboard.snapshot',
    });
    planningServiceMock.issueStreamSession.mockResolvedValue({
      token: 'stream-token',
      expiresAt: '2026-02-23T00:02:00.000Z',
      expiresInSeconds: 120,
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app?.close();
  });

  it('optimizes tour candidates from zone/threshold payload', async () => {
    const zoneId = '5b4ac9a8-2eb4-42eb-aa0e-b4afcf689d6f';

    await request(app.getHttpServer())
      .post('/api/planning/optimize-tour')
      .send({
        zoneId,
        scheduledFor: new Date().toISOString(),
        fillThresholdPercent: 75,
      })
      .expect(201);

    expect(planningServiceMock.optimizeTour).toHaveBeenCalledWith(
      expect.objectContaining({ zoneId, fillThresholdPercent: 75 }),
    );
  });

  it('creates a planned tour and assignment workflow', async () => {
    const zoneId = '5b4ac9a8-2eb4-42eb-aa0e-b4afcf689d6f';
    const containerId = 'f7a67f92-f8f7-4104-97b3-9136310cb2dd';

    await request(app.getHttpServer())
      .post('/api/planning/create-tour')
      .send({
        name: 'Morning Route',
        zoneId,
        scheduledFor: new Date().toISOString(),
        orderedContainerIds: [containerId],
      })
      .expect(201);

    expect(planningServiceMock.createPlannedTour).toHaveBeenCalledWith(
      expect.objectContaining({ zoneId, orderedContainerIds: [containerId] }),
      userId,
    );
  });

  it('serves manager dashboard and triggers emergency collection', async () => {
    await request(app.getHttpServer()).get('/api/planning/dashboard').expect(200);
    expect(planningServiceMock.getManagerDashboard).toHaveBeenCalledTimes(1);

    const containerId = 'f7a67f92-f8f7-4104-97b3-9136310cb2dd';
    await request(app.getHttpServer())
      .post('/api/planning/emergency-collection')
      .send({
        containerId,
        reason: 'Critical threshold reached',
      })
      .expect(201);

    expect(planningServiceMock.triggerEmergencyCollection).toHaveBeenCalledWith(
      expect.objectContaining({ containerId, reason: 'Critical threshold reached' }),
      userId,
    );
  });

  it('returns realtime diagnostics for planning observability', async () => {
    const response = await request(app.getHttpServer()).get('/api/planning/realtime/health').expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        activeSseConnections: 0,
        activeWebSocketConnections: 0,
        lastEventName: 'planning.dashboard.snapshot',
      }),
    );
    expect(planningServiceMock.getRealtimeDiagnostics).toHaveBeenCalledTimes(1);
  });

  it('generates, lists, downloads, and regenerates reports', async () => {
    const reportId = '3b8c572a-1ff1-4d1b-90ce-f5d05ea0ef7f';

    await request(app.getHttpServer())
      .post('/api/planning/reports/generate')
      .send({
        periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString(),
        selectedKpis: ['tours', 'collections'],
        sendEmail: true,
        emailTo: 'ops@example.com',
      })
      .expect(201);

    expect(planningServiceMock.generateReport).toHaveBeenCalledTimes(1);

    await request(app.getHttpServer()).get('/api/planning/reports/history').expect(200);
    expect(planningServiceMock.listReportHistory).toHaveBeenCalledTimes(1);

    planningServiceMock.getReportById.mockResolvedValueOnce({ id: reportId, fileContent: 'mock pdf content' });
    const downloadResponse = await request(app.getHttpServer())
      .get(`/api/planning/reports/${reportId}/download`)
      .expect(200);

    expect(Buffer.from(downloadResponse.body).toString('utf-8')).toBe('mock pdf content');

    await request(app.getHttpServer()).post(`/api/planning/reports/${reportId}/regenerate`).expect(201);
    expect(planningServiceMock.regenerateReport).toHaveBeenCalledWith(reportId, userId);
  });

  it('issues a planning stream session token', async () => {
    await request(app.getHttpServer()).post('/api/planning/stream/session').expect(201);

    expect(planningServiceMock.issueStreamSession).toHaveBeenCalledWith(
      expect.objectContaining({
        id: userId,
      }),
    );
  });

  it('issues a planning websocket session token', async () => {
    await request(app.getHttpServer()).post('/api/planning/ws/session').expect(201);

    expect(planningServiceMock.issueWebSocketSession).toHaveBeenCalledWith(
      expect.objectContaining({
        id: userId,
      }),
    );
  });
});
