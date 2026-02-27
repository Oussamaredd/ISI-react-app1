import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminAuditController } from '../admin/admin.audit.controller.js';
import { AdminAuditService } from '../admin/admin.audit.service.js';
import { AdminGuard } from '../admin/admin.guard.js';
import { AdminUsersController } from '../admin/admin.users.controller.js';
import { AuthService } from '../auth/auth.service.js';
import { UsersService } from '../users/users.service.js';

describe('Admin query validation', () => {
  const usersServiceMock = {
    listUsers: vi.fn(),
  };

  const auditServiceMock = {
    listLogs: vi.fn(),
    getStats: vi.fn(),
  };

  const authServiceMock = {
    getAuthUserFromRequest: vi.fn(),
  };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminUsersController, AdminAuditController],
      providers: [
        { provide: UsersService, useValue: usersServiceMock },
        { provide: AdminAuditService, useValue: auditServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
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
    await app.init();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(AdminGuard.prototype, 'canActivate').mockResolvedValue(true as any);

    usersServiceMock.listUsers.mockResolvedValue({ users: [], total: 0, page: 1, pageSize: 20 });
    auditServiceMock.listLogs.mockResolvedValue({ logs: [], total: 0, totalPages: 1, page: 1, pageSize: 50 });
    auditServiceMock.getStats.mockResolvedValue([]);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app?.close();
  });

  it('returns 400 when admin users query has invalid created_from', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/users')
      .query({ created_from: 'not-a-date' })
      .expect(400);

    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it('returns 400 when admin users query has invalid is_active', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/users')
      .query({ is_active: 'yes' })
      .expect(400);

    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it('returns 400 when admin audit logs query has invalid date_from', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/audit-logs')
      .query({ date_from: 'bad-date' })
      .expect(400);

    expect(auditServiceMock.listLogs).not.toHaveBeenCalled();
  });
});
