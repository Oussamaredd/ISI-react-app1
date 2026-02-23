import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { TicketsController } from '../tickets/tickets.controller.js';
import { TicketsService } from '../tickets/tickets.service.js';

describe('Extended EcoTrack contract endpoints', () => {
  let app: INestApplication;

  const ticketsService = {
    findAll: vi.fn(),
  };

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: ticketsService },
      ],
    });

    moduleBuilder.overrideGuard(AuthenticatedUserGuard).useValue({ canActivate: () => true });
    moduleBuilder.overrideGuard(PermissionsGuard).useValue({ canActivate: () => true });

    const moduleRef = await moduleBuilder.compile();

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
    ticketsService.findAll.mockResolvedValue({ tickets: [], total: 0 });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('publishes support categories and chatbot contract metadata', async () => {
    const response = await request(app.getHttpServer()).get('/api/tickets/support/categories').expect(200);

    expect(response.body.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'container_overflow', label: 'Container Overflow' }),
      ]),
    );
    expect(response.body.chatbotContract).toEqual(
      expect.objectContaining({
        version: '1.0',
      }),
    );
  });

  it('normalizes legacy support category aliases in ticket queries', async () => {
    await request(app.getHttpServer()).get('/api/tickets').query({ support_category: 'overflow' }).expect(200);

    expect(ticketsService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        supportCategory: 'container_overflow',
      }),
    );
  });

});
