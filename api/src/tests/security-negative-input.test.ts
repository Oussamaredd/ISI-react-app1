import 'reflect-metadata';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DRIZZLE } from '../database/database.constants.js';
import { AdminAuditController } from '../modules/admin/admin.audit.controller.js';
import { AdminAuditService } from '../modules/admin/admin.audit.service.js';
import { AdminGuard } from '../modules/admin/admin.guard.js';
import { AdminSettingsController } from '../modules/admin/admin.settings.controller.js';
import { AdminSettingsRepository } from '../modules/admin/admin.settings.repository.js';
import { AdminSettingsService } from '../modules/admin/admin.settings.service.js';
import { AdminUsersController } from '../modules/admin/admin.users.controller.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { USERS_ADMIN_PORT } from '../modules/users/users.contract.js';
import { UsersService } from '../modules/users/users.service.js';

describe('Negative security input handling', () => {
  const usersServiceMock = {
    listUsers: vi.fn(),
  };

  const auditServiceMock = {
    listLogs: vi.fn(),
    getStats: vi.fn(),
    log: vi.fn(),
  };

  const authServiceMock = {
    getAuthUserFromRequest: vi.fn(),
  };

  const dbMock = {
    transaction: vi.fn(),
  };

  const adminSettingsRepository = new AdminSettingsRepository(dbMock as any);
  const adminSettingsService = new AdminSettingsService(adminSettingsRepository);

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminUsersController, AdminAuditController, AdminSettingsController],
      providers: [
        { provide: USERS_ADMIN_PORT, useValue: usersServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: AdminAuditService, useValue: auditServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: DRIZZLE, useValue: dbMock },
        { provide: AdminSettingsRepository, useValue: adminSettingsRepository },
        { provide: AdminSettingsService, useValue: adminSettingsService },
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
    auditServiceMock.listLogs.mockResolvedValue({
      logs: [],
      total: 0,
      totalPages: 1,
      page: 1,
      pageSize: 50,
    });
    auditServiceMock.getStats.mockResolvedValue([]);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app?.close();
  });

  it('treats SQL-style admin user search payloads as inert input and does not widen results', async () => {
    const payload = "' OR 1=1 --";

    const response = await request(app.getHttpServer())
      .get('/api/admin/users')
      .query({ search: payload })
      .expect(200);

    expect(usersServiceMock.listUsers).toHaveBeenCalledWith({
      search: payload,
      role: undefined,
      isActive: undefined,
      authProvider: undefined,
      createdFrom: undefined,
      createdTo: undefined,
      page: undefined,
      limit: undefined,
    });
    expect(response.body.data.users).toEqual([]);
    expect(response.body.data.total).toBe(0);
    expect(JSON.stringify(response.body)).not.toMatch(/stack|select|syntax error/i);
  });

  it('treats SQL-style audit-log search payloads as inert input and keeps result sets bounded', async () => {
    const payload = "' UNION SELECT * FROM audit.audit_logs --";

    const response = await request(app.getHttpServer())
      .get('/api/admin/audit-logs')
      .query({ search: payload })
      .expect(200);

    expect(auditServiceMock.listLogs).toHaveBeenCalledWith({
      search: payload,
      action: undefined,
      resourceType: undefined,
      userId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      page: undefined,
      limit: undefined,
    });
    expect(response.body.data.logs).toEqual([]);
    expect(response.body.data.total).toBe(0);
    expect(JSON.stringify(response.body)).not.toMatch(/stack|select|syntax error/i);
  });

  it('rejects prototype-pollution payloads on admin settings without side effects or stack traces', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/admin/settings')
      .set('Content-Type', 'application/json')
      .send('{"__proto__":{"polluted":"yes"}}')
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      message: 'No valid settings provided',
      error: 'Bad Request',
    });
    expect(auditServiceMock.log).not.toHaveBeenCalled();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toMatch(/stack|select|syntax error/i);
  });
});
