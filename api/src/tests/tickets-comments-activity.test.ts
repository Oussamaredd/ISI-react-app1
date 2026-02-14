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

describe('Tickets comments and activity endpoints', () => {
  const ticketId = 'b3b6c9be-4b1d-4b11-8f65-9d9b6c3c7a3e';
  const commentId = '2d5f8ed1-5b58-4e67-9b0b-3b28c5f07c15';
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

  const mockAuthUser = {
    id: '6f6f5f4e-57f8-4ac4-88ff-2ec83c44ee1d',
    email: 'agent@example.com',
    displayName: 'Agent User',
    role: 'agent',
    roles: [],
    permissions: ['tickets.read', 'tickets.write'],
    isActive: true,
    hotelId: '9d8f3f51-cf0f-46b4-a418-4d13e4df95ce',
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
    vi.spyOn(AuthenticatedUserGuard.prototype, 'canActivate').mockImplementation(async (context) => {
      const request = context.switchToHttp().getRequest();
      request.authUser = mockAuthUser;
      return true;
    });
    vi.spyOn(PermissionsGuard.prototype, 'canActivate').mockReturnValue(true as any);
    authServiceMock.getAuthUserFromRequest.mockReturnValue(null);
    usersServiceMock.ensureUserForAuth.mockResolvedValue(null);
    usersServiceMock.getRolesForUser.mockResolvedValue([]);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app?.close();
  });

  it('POST /api/tickets/:id/comments accepts body', async () => {
    const payload = { id: commentId, body: 'Hello world' };
    mockService.addComment.mockResolvedValueOnce(payload);

    const response = await request(app.getHttpServer())
      .post(`/api/tickets/${ticketId}/comments`)
      .send({ body: 'Hello world' })
      .expect(201);

    expect(mockService.addComment).toHaveBeenCalledWith(ticketId, 'Hello world', {
      id: mockAuthUser.id,
      role: mockAuthUser.role,
      roles: mockAuthUser.roles,
    });
    expect(response.body).toEqual(payload);
  });

  it('POST /api/tickets/:id/comments accepts content', async () => {
    const payload = { id: commentId, body: 'From content' };
    mockService.addComment.mockResolvedValueOnce(payload);

    const response = await request(app.getHttpServer())
      .post(`/api/tickets/${ticketId}/comments`)
      .send({ content: 'From content' })
      .expect(201);

    expect(mockService.addComment).toHaveBeenCalledWith(ticketId, 'From content', {
      id: mockAuthUser.id,
      role: mockAuthUser.role,
      roles: mockAuthUser.roles,
    });
    expect(response.body).toEqual(payload);
  });

  it('POST /api/tickets/:id/comments rejects empty body', async () => {
    await request(app.getHttpServer())
      .post(`/api/tickets/${ticketId}/comments`)
      .send({ body: '   ' })
      .expect(400);

    expect(mockService.addComment).not.toHaveBeenCalled();
  });

  it('PUT /api/tickets/:id/comments/:commentId accepts content', async () => {
    const payload = { id: commentId, body: 'Updated comment' };
    mockService.updateComment.mockResolvedValueOnce(payload);

    const response = await request(app.getHttpServer())
      .put(`/api/tickets/${ticketId}/comments/${commentId}`)
      .send({ content: 'Updated comment' })
      .expect(200);

    expect(mockService.updateComment).toHaveBeenCalledWith(ticketId, commentId, 'Updated comment', {
      id: mockAuthUser.id,
      role: mockAuthUser.role,
      roles: mockAuthUser.roles,
    });
    expect(response.body).toEqual(payload);
  });

  it('DELETE /api/tickets/:id/comments/:commentId returns deleted payload', async () => {
    const payload = { id: commentId, deleted: true };
    mockService.deleteComment.mockResolvedValueOnce(payload);

    const response = await request(app.getHttpServer())
      .delete(`/api/tickets/${ticketId}/comments/${commentId}`)
      .expect(200);

    expect(mockService.deleteComment).toHaveBeenCalledWith(ticketId, commentId, {
      id: mockAuthUser.id,
      role: mockAuthUser.role,
      roles: mockAuthUser.roles,
    });
    expect(response.body).toEqual(payload);
  });

  it('GET /api/tickets/:id/activity returns activity list', async () => {
    const payload = [{ id: 'activity-1', type: 'creation' }];
    mockService.listActivity.mockResolvedValueOnce(payload);

    const response = await request(app.getHttpServer())
      .get(`/api/tickets/${ticketId}/activity`)
      .expect(200);

    expect(mockService.listActivity).toHaveBeenCalledWith(ticketId);
    expect(response.body).toEqual({ activity: payload });
  });
});
