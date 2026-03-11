import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TicketsController } from '../modules/tickets/tickets.controller.js';

describe('TicketsController', () => {
  const ticketId = 'b3b6c9be-4b1d-4b11-8f65-9d9b6c3c7a3e';
  const commentId = '2d5f8ed1-5b58-4e67-9b0b-3b28c5f07c15';
  const request = {
    authUser: {
      id: '6f6f5f4e-57f8-4ac4-88ff-2ec83c44ee1d',
      role: 'manager',
      roles: [{ id: 'role-1', name: 'manager' }],
    },
  } as any;

  const ticketsServiceMock = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    listComments: vi.fn(),
    addComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    listActivity: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  let controller: TicketsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new TicketsController(ticketsServiceMock as any);
  });

  it('returns support category metadata for chat integrations', async () => {
    await expect(controller.supportCategories()).resolves.toEqual(
      expect.objectContaining({
        categories: expect.arrayContaining([
          expect.objectContaining({ key: 'general_help' }),
          expect.objectContaining({ key: 'container_overflow' }),
        ]),
        chatbotContract: expect.objectContaining({
          version: '1.0',
        }),
      }),
    );
  });

  it('delegates ticket read and write operations to the service', async () => {
    const ticket = { id: ticketId, title: 'Overflowing container' };
    const updatePayload = { status: 'resolved' };

    ticketsServiceMock.findOne.mockResolvedValue(ticket);
    ticketsServiceMock.create.mockResolvedValue(ticket);
    ticketsServiceMock.update.mockResolvedValue({ ...ticket, ...updatePayload });
    ticketsServiceMock.remove.mockResolvedValue({ deleted: true });

    await expect(controller.findOne(ticketId)).resolves.toEqual(ticket);
    await expect(controller.create({ title: 'Overflowing container' } as any)).resolves.toEqual(ticket);
    await expect(controller.update(ticketId, updatePayload as any)).resolves.toEqual({
      ...ticket,
      ...updatePayload,
    });
    await expect(controller.remove(ticketId)).resolves.toEqual({ deleted: true });

    expect(ticketsServiceMock.findOne).toHaveBeenCalledWith(ticketId);
    expect(ticketsServiceMock.create).toHaveBeenCalledWith({ title: 'Overflowing container' });
    expect(ticketsServiceMock.update).toHaveBeenCalledWith(ticketId, updatePayload);
    expect(ticketsServiceMock.remove).toHaveBeenCalledWith(ticketId);
  });

  it('rethrows comment pagination HttpExceptions and wraps unexpected comment errors', async () => {
    ticketsServiceMock.listComments.mockRejectedValueOnce(
      new NotFoundException('ticket comments missing'),
    );

    await expect(controller.listComments(ticketId, '1', '10')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    ticketsServiceMock.listComments.mockRejectedValueOnce(new Error('database offline'));

    await expect(controller.listComments(ticketId, '1', '10')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('requires an authenticated actor for comments and wraps add-comment failures', async () => {
    await expect(
      controller.addComment(ticketId, { body: 'Hello world' } as any, {} as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    ticketsServiceMock.addComment.mockRejectedValueOnce(new Error('comment store unavailable'));

    await expect(
      controller.addComment(ticketId, { body: 'Hello world' } as any, request),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('validates update-comment payloads and wraps unexpected update failures', async () => {
    await expect(
      controller.updateComment(ticketId, commentId, { body: '   ' } as any, request),
    ).rejects.toBeInstanceOf(BadRequestException);

    ticketsServiceMock.updateComment.mockRejectedValueOnce(new Error('comment edit failed'));

    await expect(
      controller.updateComment(ticketId, commentId, { content: 'Updated body' } as any, request),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('wraps delete-comment failures from the service', async () => {
    ticketsServiceMock.deleteComment.mockRejectedValueOnce(new Error('comment delete failed'));

    await expect(controller.deleteComment(ticketId, commentId, request)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('rethrows activity HttpExceptions and wraps unexpected activity failures', async () => {
    ticketsServiceMock.listActivity.mockRejectedValueOnce(new NotFoundException('activity missing'));

    await expect(controller.listActivity(ticketId)).rejects.toBeInstanceOf(NotFoundException);

    ticketsServiceMock.listActivity.mockRejectedValueOnce(new Error('activity stream offline'));

    await expect(controller.listActivity(ticketId)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
