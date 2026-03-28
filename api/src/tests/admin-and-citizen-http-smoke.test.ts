import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminAuditController } from '../modules/admin/admin.audit.controller.js';
import { AdminAuditService } from '../modules/admin/admin.audit.service.js';
import { AdminGuard } from '../modules/admin/admin.guard.js';
import { AdminUsersController } from '../modules/admin/admin.users.controller.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { AuthenticatedUserGuard } from '../modules/auth/authenticated-user.guard.js';
import { CitizenController } from '../modules/citizen/citizen.controller.js';
import { CitizenService } from '../modules/citizen/citizen.service.js';
import { USERS_ADMIN_PORT } from '../modules/users/users.contract.js';
import { UsersService } from '../modules/users/users.service.js';

describe('Admin and citizen endpoint smoke', () => {
  const adminUserId = '7888bec2-f4ee-4440-b16f-b35d66607366';
  const authUserId = '390ca84d-6d0f-4b55-a2d6-c38fb9834a57';
  const roleId = 'ccf87260-0e8d-48b3-8526-6f779269d56a';
  const userId = '13ce58f1-89fc-4d17-a58b-2a65f51fbc5e';
  const challengeId = 'ef7502ed-7620-471f-9865-31101595ad0a';
  const containerId = 'f7a67f92-f8f7-4104-97b3-9136310cb2dd';

  const usersServiceMock = {
    listUsers: vi.fn(),
    findByEmail: vi.fn(),
    createLocalUser: vi.fn(),
    getUserWithRoles: vi.fn(),
    updateUserRoles: vi.fn(),
    updateUserStatus: vi.fn(),
  };

  const auditServiceMock = {
    log: vi.fn(),
    listLogs: vi.fn(),
    getStats: vi.fn(),
  };

  const citizenServiceMock = {
    createReport: vi.fn(),
    getProfile: vi.fn(),
    getHistory: vi.fn(),
    listChallenges: vi.fn(),
    enrollInChallenge: vi.fn(),
    updateChallengeProgress: vi.fn(),
  };

  const authServiceMock = {
    getAuthUserFromRequest: vi.fn(),
  };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AdminUsersController,
        AdminAuditController,
        CitizenController,
      ],
      providers: [
        { provide: USERS_ADMIN_PORT, useValue: usersServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: AdminAuditService, useValue: auditServiceMock },
        { provide: CitizenService, useValue: citizenServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const mutableReq = req as Request & {
        authUser?: { id: string };
        adminUser?: { id: string };
      };
      mutableReq.authUser = { id: authUserId };
      mutableReq.adminUser = { id: adminUserId };
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
    vi.spyOn(AdminGuard.prototype, 'canActivate').mockResolvedValue(true as any);
    vi.spyOn(AuthenticatedUserGuard.prototype, 'canActivate').mockResolvedValue(true as any);

    usersServiceMock.listUsers.mockResolvedValue({ users: [], total: 0, page: 1, pageSize: 20 });
    usersServiceMock.findByEmail.mockResolvedValue(null);
    usersServiceMock.createLocalUser.mockResolvedValue({
      id: userId,
      email: 'new.user@example.com',
      displayName: 'New User',
      isActive: true,
      roles: [{ id: roleId, name: 'agent' }],
    });
    usersServiceMock.getUserWithRoles.mockResolvedValue({
      id: userId,
      email: 'new.user@example.com',
      displayName: 'New User',
      isActive: true,
      roles: [{ id: roleId, name: 'agent' }],
    });
    usersServiceMock.updateUserRoles.mockResolvedValue({
      id: userId,
      roles: [{ id: roleId, name: 'agent' }],
    });
    usersServiceMock.updateUserStatus.mockResolvedValue({
      id: userId,
      isActive: false,
      roles: [{ id: roleId, name: 'agent' }],
    });

    auditServiceMock.log.mockResolvedValue(undefined);
    auditServiceMock.listLogs.mockResolvedValue({
      logs: [],
      total: 0,
      totalPages: 1,
      page: 1,
      pageSize: 20,
    });
    auditServiceMock.getStats.mockResolvedValue([]);

    citizenServiceMock.createReport.mockResolvedValue({ id: 'report-1', status: 'submitted' });
    citizenServiceMock.getProfile.mockResolvedValue({ points: 42 });
    citizenServiceMock.getHistory.mockResolvedValue({ items: [], total: 0 });
    citizenServiceMock.listChallenges.mockResolvedValue([{ id: challengeId }]);
    citizenServiceMock.enrollInChallenge.mockResolvedValue({ challengeId, enrollmentStatus: 'enrolled' });
    citizenServiceMock.updateChallengeProgress.mockResolvedValue({
      challengeId,
      progress: 2,
      completionPercent: 20,
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app?.close();
  });

  it('handles admin users and audit endpoints without errors', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/users')
      .send({
        email: 'new.user@example.com',
        displayName: 'New User',
        password: 'strongpass123',
        roleIds: [roleId],
      })
      .expect(201);
    expect(usersServiceMock.createLocalUser).toHaveBeenCalledTimes(1);

    await request(app.getHttpServer()).get(`/api/admin/users/${userId}`).expect(200);
    expect(usersServiceMock.getUserWithRoles).toHaveBeenCalledWith(userId);

    await request(app.getHttpServer())
      .put(`/api/admin/users/${userId}/roles`)
      .send({ roleIds: [roleId] })
      .expect(200);
    expect(usersServiceMock.updateUserRoles).toHaveBeenCalledWith(userId, [roleId]);

    await request(app.getHttpServer())
      .put(`/api/admin/users/${userId}/status`)
      .send({ isActive: false })
      .expect(200);
    expect(usersServiceMock.updateUserStatus).toHaveBeenCalledWith(userId, false);

    await request(app.getHttpServer()).get('/api/admin/audit-logs/stats').expect(200);
    expect(auditServiceMock.getStats).toHaveBeenCalledTimes(1);
  });

  it('handles citizen profile/challenge/report endpoints without errors', async () => {
    await request(app.getHttpServer())
      .post('/api/citizen/reports')
      .send({
        containerId,
        reportType: 'container_full',
        description: 'Overflow near school',
      })
      .expect(201);
    expect(citizenServiceMock.createReport).toHaveBeenCalledWith(
      authUserId,
      expect.objectContaining({
        containerId,
        reportType: 'container_full',
        description: 'Overflow near school',
      }),
    );

    await request(app.getHttpServer()).get('/api/citizen/profile').expect(200);
    expect(citizenServiceMock.getProfile).toHaveBeenCalledWith(authUserId);

    await request(app.getHttpServer())
      .get('/api/citizen/history')
      .query({ page: '1', pageSize: '10' })
      .expect(200);
    expect(citizenServiceMock.getHistory).toHaveBeenCalledWith(authUserId, 10, 0);

    await request(app.getHttpServer()).get('/api/citizen/challenges').expect(200);
    expect(citizenServiceMock.listChallenges).toHaveBeenCalledWith(authUserId);

    await request(app.getHttpServer())
      .post(`/api/citizen/challenges/${challengeId}/enroll`)
      .expect(201);
    expect(citizenServiceMock.enrollInChallenge).toHaveBeenCalledWith(authUserId, challengeId);

    await request(app.getHttpServer())
      .post(`/api/citizen/challenges/${challengeId}/progress`)
      .send({ progressDelta: 2 })
      .expect(201);
    expect(citizenServiceMock.updateChallengeProgress).toHaveBeenCalledWith(
      authUserId,
      challengeId,
      2,
    );
  });

  it('surfaces degraded admin and citizen reads, then recovers on the next request', async () => {
    auditServiceMock.getStats
      .mockRejectedValueOnce(new Error('audit projection offline'))
      .mockResolvedValueOnce([]);
    citizenServiceMock.getProfile
      .mockRejectedValueOnce(new Error('profile snapshot unavailable'))
      .mockResolvedValueOnce({ points: 42 });

    await request(app.getHttpServer()).get('/api/admin/audit-logs/stats').expect(500);
    await request(app.getHttpServer()).get('/api/admin/audit-logs/stats').expect(200);

    await request(app.getHttpServer()).get('/api/citizen/profile').expect(500);
    await request(app.getHttpServer()).get('/api/citizen/profile').expect(200);

    expect(auditServiceMock.getStats).toHaveBeenCalledTimes(2);
    expect(citizenServiceMock.getProfile).toHaveBeenCalledTimes(2);
  });
});

