import { Injectable } from '@nestjs/common';

import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { TicketsRepository } from './tickets.repository.js';

type TicketFilters = {
  status?: string;
  priority?: string;
  hotelId?: string;
  assigneeId?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

type CommentActor = {
  id: string;
  role?: string;
  roles?: Array<{ name: string }>;
};

@Injectable()
export class TicketsService {
  constructor(private readonly ticketsRepository: TicketsRepository) {}

  async findAll(filters: TicketFilters = {}) {
    return this.ticketsRepository.findAll(filters);
  }

  async findOne(id: string) {
    return this.ticketsRepository.findOne(id);
  }

  async create(dto: CreateTicketDto) {
    return this.ticketsRepository.create(dto);
  }

  async listComments(ticketId: string, pagination: { page: number; pageSize: number }) {
    return this.ticketsRepository.listComments(ticketId, pagination);
  }

  async addComment(ticketId: string, body: string, actor: CommentActor) {
    return this.ticketsRepository.addComment(ticketId, body, actor);
  }

  async updateComment(ticketId: string, commentId: string, body: string, actor: CommentActor) {
    return this.ticketsRepository.updateComment(ticketId, commentId, body, actor);
  }

  async deleteComment(ticketId: string, commentId: string, actor: CommentActor) {
    return this.ticketsRepository.deleteComment(ticketId, commentId, actor);
  }

  async listActivity(ticketId: string) {
    return this.ticketsRepository.listActivity(ticketId);
  }

  async assignHotel(ticketId: string, hotelId: string) {
    return this.ticketsRepository.assignHotel(ticketId, hotelId);
  }

  async update(id: string, dto: UpdateTicketDto) {
    return this.ticketsRepository.update(id, dto);
  }

  async remove(id: string) {
    return this.ticketsRepository.remove(id);
  }
}
