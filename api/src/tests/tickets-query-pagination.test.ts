import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service.js';
import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { TicketsController } from '../tickets/tickets.controller.js';
import { TicketsService } from '../tickets/tickets.service.js';
import { UsersService } from '../users/users.service.js';

describe('Tickets query parsing and pagination', () => {
  const ticketId = 'b3b6c9be-4b1d-4b11-8f65-9d9b6c3c7a3e';
  const validHotelId = 'f38bb586-23fe-4ce0-a4d5-a272788f65ff';
  const validAssigneeId = '2d5f8ed1-5b58-4e67-9b0b-3b28c5f07c15';

  const mockService = {
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
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: mockService },
        { provide: AuthService, useValue: authServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
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
    vi.spyOn(AuthenticatedUserGuard.prototype, 'canActivate').mockResolvedValue(true as any);
    vi.spyOn(PermissionsGuard.prototype, 'canActivate').mockReturnValue(true as any);
    authServiceMock.getAuthUserFromRequest.mockReturnValue(null);
    usersServiceMock.ensureUserForAuth.mockResolvedValue(null);
    usersServiceMock.getRolesForUser.mockResolvedValue([]);
    mockService.findAll.mockResolvedValue({ tickets: [], total: 0 });
    mockService.listComments.mockResolvedValue({ comments: [], total: 0 });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app?.close();
  });

  it('GET /api/tickets normalizes query params and applies defaults', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/tickets')
      .query({
        limit: '-10',
        offset: '-5',
        status: 'OPEN',
        priority: 'HIGH',
        hotel_id: 'not-a-uuid',
        assignee_id: 'bad-uuid',
        q: '   ',
      })
      .expect(200);

    expect(mockService.findAll).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      status: 'OPEN',
      priority: 'HIGH',
      hotelId: undefined,
      assigneeId: undefined,
      search: undefined,
    });
    expect(response.body).toEqual({
      tickets: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
  });

  it('GET /api/tickets accepts camelCase ids and caps limit to 100', async () => {
    await request(app.getHttpServer())
      .get('/api/tickets')
      .query({
        limit: '500',
        offset: '12',
        hotelId: validHotelId,
        assigneeId: validAssigneeId,
        search: '  lobby  ',
      })
      .expect(200);

    expect(mockService.findAll).toHaveBeenCalledWith({
      limit: 100,
      offset: 12,
      status: undefined,
      priority: undefined,
      hotelId: validHotelId,
      assigneeId: validAssigneeId,
      search: 'lobby',
    });
  });

  it('GET /api/tickets/:id/comments returns pagination metadata', async () => {
    mockService.listComments.mockResolvedValueOnce({
      comments: [{ id: 'comment-1' }],
      total: 45,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/tickets/${ticketId}/comments`)
      .query({ page: '2', pageSize: '20' })
      .expect(200);

    expect(mockService.listComments).toHaveBeenCalledWith(ticketId, { page: 2, pageSize: 20 });
    expect(response.body).toEqual({
      comments: [{ id: 'comment-1' }],
      total: 45,
      page: 2,
      pageSize: 20,
      pagination: {
        total: 45,
        page: 2,
        pageSize: 20,
        hasNext: true,
      },
    });
  });

  it('GET /api/tickets/:id/comments sanitizes invalid pagination params', async () => {
    await request(app.getHttpServer())
      .get(`/api/tickets/${ticketId}/comments`)
      .query({ page: '0', pageSize: '500' })
      .expect(200);

    expect(mockService.listComments).toHaveBeenCalledWith(ticketId, { page: 1, pageSize: 100 });
  });

  it('GET /api/tickets returns 500 when service throws', async () => {
    mockService.findAll.mockRejectedValueOnce(new Error('database down'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(app.getHttpServer()).get('/api/tickets').expect(500);

    expect(response.body.message).toBe('Unable to fetch tickets');
    errorSpy.mockRestore();
  });
});
