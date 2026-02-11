import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service.js';
import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { DashboardController } from '../dashboard/dashboard.controller.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import { HotelsController } from '../hotels/hotels.controller.js';
import { HotelsService } from '../hotels/hotels.service.js';
import { TicketsController } from '../tickets/tickets.controller.js';
import { TicketsService } from '../tickets/tickets.service.js';
import { UsersService } from '../users/users.service.js';

describe('Protected API route authorization', () => {
  const authCookie = 'auth_token=valid';
  const authUser = {
    provider: 'google' as const,
    id: 'google-user-1',
    email: 'agent@example.com',
    name: 'Agent User',
    avatarUrl: null,
  };

  const baseDbUser = {
    id: 'e03d7d10-509f-45bc-b22d-98cb8b016f03',
    email: 'agent@example.com',
    displayName: 'Agent User',
    role: 'agent',
    isActive: true,
    hotelId: '707fbe13-a229-4342-9722-b0eb7ea083ef',
  };

  const authServiceMock = {
    getAuthUserFromCookie: vi.fn(),
  };

  const usersServiceMock = {
    ensureUserForAuth: vi.fn(),
    getRolesForUser: vi.fn(),
  };

  const ticketsServiceMock = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    listComments: vi.fn(),
    addComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    listActivity: vi.fn(),
    create: vi.fn(),
    assignHotel: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const hotelsServiceMock = {
    findAll: vi.fn(),
  };

  const dashboardServiceMock = {
    getDashboard: vi.fn(),
  };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TicketsController, HotelsController, DashboardController],
      providers: [
        { provide: TicketsService, useValue: ticketsServiceMock },
        { provide: HotelsService, useValue: hotelsServiceMock },
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        AuthenticatedUserGuard,
        PermissionsGuard,
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
    vi.clearAllMocks();

    authServiceMock.getAuthUserFromCookie.mockImplementation((cookie?: string) =>
      cookie ? authUser : null,
    );
    usersServiceMock.ensureUserForAuth.mockResolvedValue(baseDbUser);
    usersServiceMock.getRolesForUser.mockResolvedValue([]);

    ticketsServiceMock.findAll.mockResolvedValue({ tickets: [], total: 0 });
    ticketsServiceMock.create.mockResolvedValue({ id: 'ticket-1', title: 'New ticket' });
    hotelsServiceMock.findAll.mockResolvedValue([
      { id: 'd2784892-f00f-4227-bba9-9bc7ad2b0a50', name: 'Main Hotel' },
    ]);
    dashboardServiceMock.getDashboard.mockResolvedValue({
      summary: { total: 0, open: 0, completed: 0, assigned: 0 },
      statusBreakdown: {},
      hotels: [],
      recentActivity: [],
      recentTickets: [],
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 401 on protected route when auth cookie is missing', async () => {
    await request(app.getHttpServer()).get('/api/tickets').expect(401);
    expect(ticketsServiceMock.findAll).not.toHaveBeenCalled();
  });

  it('returns 403 when authenticated user lacks required read permission', async () => {
    usersServiceMock.ensureUserForAuth.mockResolvedValue({ ...baseDbUser, role: 'auditor' });
    usersServiceMock.getRolesForUser.mockResolvedValue([
      { id: 'role-auditor', name: 'auditor', permissions: [] },
    ]);

    await request(app.getHttpServer()).get('/api/hotels').set('Cookie', authCookie).expect(403);
    expect(hotelsServiceMock.findAll).not.toHaveBeenCalled();
  });

  it('returns 403 when authenticated user lacks required write permission', async () => {
    usersServiceMock.ensureUserForAuth.mockResolvedValue({ ...baseDbUser, role: 'manager' });
    usersServiceMock.getRolesForUser.mockResolvedValue([
      { id: 'role-manager', name: 'manager', permissions: ['tickets.read'] },
    ]);

    await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Cookie', authCookie)
      .send({ title: 'Blocked write' })
      .expect(403);

    expect(ticketsServiceMock.create).not.toHaveBeenCalled();
  });

  it('allows authenticated user with read permission to access protected read endpoints', async () => {
    await request(app.getHttpServer()).get('/api/tickets').set('Cookie', authCookie).expect(200);
    await request(app.getHttpServer()).get('/api/hotels').set('Cookie', authCookie).expect(200);
    await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Cookie', authCookie)
      .expect(200);
  });

  it('allows authenticated user with write permission to access protected write endpoints', async () => {
    await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Cookie', authCookie)
      .send({ title: 'New ticket' })
      .expect(201);

    expect(ticketsServiceMock.create).toHaveBeenCalledWith({ title: 'New ticket' });
  });
});
