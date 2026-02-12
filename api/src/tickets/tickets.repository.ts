import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { type DatabaseClient, comments, hotels, tickets, users } from 'ecotrack-database';

import { DRIZZLE } from '../database/database.constants.js';

import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';

type TicketFilters = {
  status?: string;
  priority?: string;
  hotelId?: string;
  assigneeId?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

type CommentWithAuthor = {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  authorDisplayName: string;
  authorEmail: string;
  authorRole: string;
};

@Injectable()
export class TicketsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async findAll(filters: TicketFilters = {}) {
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;
    const where = this.buildTicketWhere(filters);

    const ticketsQuery = this.db.select().from(tickets);
    const countQuery = this.db.select({ total: sql`count(*)`.mapWith(Number) }).from(tickets);

    const [items, countRows] = await Promise.all([
      (where ? ticketsQuery.where(where) : ticketsQuery)
        .orderBy(desc(tickets.createdAt))
        .limit(limit)
        .offset(offset),
      where ? countQuery.where(where) : countQuery,
    ]);

    const total = countRows[0]?.total ?? items.length;
    return { tickets: items, total };
  }

  async findOne(id: string) {
    const ticket = await this.db.query.tickets.findFirst({
      where: eq(tickets.id, id),
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    return ticket;
  }

  async create(dto: CreateTicketDto) {
    const title = dto.title ?? dto.name ?? 'Untitled ticket';

    const hotelId = dto.hotelId ?? (await this.ensureDefaultHotel());
    const requesterId = dto.requesterId ?? (await this.ensureDefaultUser(hotelId));

    const [ticket] = await this.db
      .insert(tickets)
      .values({
        title,
        description: dto.description,
        priority: dto.priority ?? 'medium',
        status: 'open',
        requesterId,
        hotelId,
        assigneeId: dto.assigneeId ?? null,
      })
      .returning();

    return ticket;
  }

  async listComments(ticketId: string, pagination: { page: number; pageSize: number }) {
    await this.assertTicketExists(ticketId);
    const offset = (pagination.page - 1) * pagination.pageSize;

    const commentsRows = await this.db
      .select({
        id: comments.id,
        ticketId: comments.ticketId,
        authorId: comments.authorId,
        body: comments.body,
        createdAt: comments.createdAt,
        authorDisplayName: users.displayName,
        authorEmail: users.email,
        authorRole: users.role,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.ticketId, ticketId))
      .orderBy(desc(comments.createdAt))
      .limit(pagination.pageSize)
      .offset(offset);

    const [countRow] = await this.db
      .select({ total: sql`count(*)`.mapWith(Number) })
      .from(comments)
      .where(eq(comments.ticketId, ticketId));

    const total = countRow?.total ?? commentsRows.length;
    return { comments: commentsRows.map((row) => this.formatComment(row)), total };
  }

  async addComment(ticketId: string, body: string) {
    const ticket = await this.assertTicketExists(ticketId);
    const authorId = ticket.requesterId;

    const [comment] = await this.db
      .insert(comments)
      .values({
        ticketId,
        authorId,
        body,
      })
      .returning({ id: comments.id });

    if (!comment) {
      throw new Error('Failed to create comment');
    }

    const enriched = await this.getCommentWithAuthor(comment.id, ticketId);
    return enriched ?? comment;
  }

  async updateComment(ticketId: string, commentId: string, body: string) {
    await this.assertTicketExists(ticketId);

    const [comment] = await this.db
      .update(comments)
      .set({ body })
      .where(and(eq(comments.id, commentId), eq(comments.ticketId, ticketId)))
      .returning({ id: comments.id });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    const enriched = await this.getCommentWithAuthor(comment.id, ticketId);
    return enriched ?? comment;
  }

  async deleteComment(ticketId: string, commentId: string) {
    await this.assertTicketExists(ticketId);

    const existing = await this.getCommentWithAuthor(commentId, ticketId);
    if (!existing) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    await this.db
      .delete(comments)
      .where(and(eq(comments.id, commentId), eq(comments.ticketId, ticketId)));

    return { ...existing, deleted: true };
  }

  async listActivity(ticketId: string) {
    const [ticketRow] = await this.db
      .select({
        id: tickets.id,
        title: tickets.title,
        createdAt: tickets.createdAt,
        requesterId: tickets.requesterId,
        requesterName: users.displayName,
        requesterEmail: users.email,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.requesterId, users.id))
      .where(eq(tickets.id, ticketId));

    if (!ticketRow) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const commentRows = await this.db
      .select({
        id: comments.id,
        body: comments.body,
        createdAt: comments.createdAt,
        authorId: comments.authorId,
        authorName: users.displayName,
        authorEmail: users.email,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.ticketId, ticketId));

    const activity = [
      {
        id: `ticket-${ticketRow.id}-created`,
        type: 'creation',
        actor_name: ticketRow.requesterName ?? ticketRow.requesterEmail ?? 'Unknown',
        actor_email: ticketRow.requesterEmail ?? null,
        actor_id: ticketRow.requesterId,
        metadata: { title: ticketRow.title },
        created_at: ticketRow.createdAt,
        actorName: ticketRow.requesterName ?? ticketRow.requesterEmail ?? 'Unknown',
        actorEmail: ticketRow.requesterEmail ?? null,
        createdAt: ticketRow.createdAt,
      },
      ...commentRows.map((row) => ({
        id: `comment-${row.id}`,
        type: 'comment_added',
        actor_name: row.authorName ?? row.authorEmail ?? 'Unknown',
        actor_email: row.authorEmail ?? null,
        actor_id: row.authorId,
        metadata: {
          comment_id: row.id,
          body_preview: row.body?.slice(0, 120) ?? '',
        },
        created_at: row.createdAt,
        actorName: row.authorName ?? row.authorEmail ?? 'Unknown',
        actorEmail: row.authorEmail ?? null,
        createdAt: row.createdAt,
      })),
    ];

    return activity.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  async assignHotel(ticketId: string, hotelId: string) {
    await this.assertTicketExists(ticketId);

    const hotel = await this.db.query.hotels.findFirst({ where: eq(hotels.id, hotelId) });
    if (!hotel) {
      throw new NotFoundException(`Hotel ${hotelId} not found`);
    }

    const [ticket] = await this.db
      .update(tickets)
      .set({ hotelId, updatedAt: new Date() })
      .where(eq(tickets.id, ticketId))
      .returning();

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto) {
    const payload: Record<string, unknown> = {};
    if (dto.title !== undefined) payload.title = dto.title;
    if (dto.description !== undefined) payload.description = dto.description;
    if (dto.priority !== undefined) payload.priority = dto.priority;
    if (dto.status !== undefined) payload.status = dto.status;
    if (dto.assigneeId !== undefined) payload.assigneeId = dto.assigneeId;

    const [ticket] = await this.db
      .update(tickets)
      .set(payload)
      .where(eq(tickets.id, id))
      .returning();

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    return ticket;
  }

  async remove(id: string) {
    const [ticket] = await this.db.delete(tickets).where(eq(tickets.id, id)).returning();
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    return ticket;
  }

  private buildTicketWhere(filters: TicketFilters) {
    const conditions = [];
    const status = this.normalizeStatusFilter(filters.status);
    if (status) {
      const statusValues =
        status === 'completed' || status === 'closed'
          ? ['completed', 'closed']
          : [status];
      if (statusValues.length > 1) {
        conditions.push(inArray(tickets.status, statusValues));
      } else {
        conditions.push(eq(tickets.status, statusValues[0]));
      }
    }

    const priority = this.normalizePriorityFilter(filters.priority);
    if (priority) {
      conditions.push(eq(tickets.priority, priority));
    }

    if (filters.hotelId) {
      conditions.push(eq(tickets.hotelId, filters.hotelId));
    }

    if (filters.assigneeId) {
      conditions.push(eq(tickets.assigneeId, filters.assigneeId));
    }

    const search = filters.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(or(ilike(tickets.title, pattern), ilike(tickets.description, pattern)));
    }

    if (conditions.length === 0) return undefined;
    return and(...conditions);
  }

  private normalizeStatusFilter(status?: string) {
    if (!status) return undefined;
    const normalized = status.trim().toLowerCase();
    return normalized || undefined;
  }

  private normalizePriorityFilter(priority?: string) {
    if (!priority) return undefined;
    const normalized = priority.trim().toLowerCase();
    return normalized || undefined;
  }

  private async ensureDefaultHotel(): Promise<string> {
    const [existing] = await this.db.select().from(hotels).limit(1);
    if (existing?.id) return existing.id;

    const slug = 'default-hotel';
    const [hotel] = await this.db
      .insert(hotels)
      .values({ name: 'Default Hotel', slug })
      .onConflictDoNothing({ target: hotels.slug })
      .returning();

    if (hotel?.id) return hotel.id;

    const [created] = await this.db.select().from(hotels).where(eq(hotels.slug, slug)).limit(1);
    if (!created?.id) {
      throw new Error('Failed to provision default hotel');
    }
    return created.id;
  }

  private async ensureDefaultUser(hotelId: string): Promise<string> {
    const [existing] = await this.db.select().from(users).limit(1);
    if (existing?.id) return existing.id;

    const email = `guest+${Date.now()}@example.com`;
    const [user] = await this.db
      .insert(users)
      .values({
        email,
        displayName: 'Guest User',
        role: 'agent',
        hotelId,
      })
      .returning();

    if (!user?.id) {
      throw new Error('Failed to provision default user');
    }
    return user.id;
  }

  private formatComment(row: CommentWithAuthor) {
    const createdAt = row.createdAt;
    const updatedAt = row.createdAt;

    return {
      id: row.id,
      ticketId: row.ticketId,
      authorId: row.authorId,
      body: row.body,
      createdAt,
      updatedAt,
      ticket_id: row.ticketId,
      user_id: row.authorId,
      user_name: row.authorDisplayName,
      user_email: row.authorEmail,
      user_role: row.authorRole,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  }

  private async getCommentWithAuthor(commentId: string, ticketId?: string) {
    const conditions = [eq(comments.id, commentId)];
    if (ticketId) {
      conditions.push(eq(comments.ticketId, ticketId));
    }

    const [row] = await this.db
      .select({
        id: comments.id,
        ticketId: comments.ticketId,
        authorId: comments.authorId,
        body: comments.body,
        createdAt: comments.createdAt,
        authorDisplayName: users.displayName,
        authorEmail: users.email,
        authorRole: users.role,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(and(...conditions));

    return row ? this.formatComment(row) : null;
  }

  private async assertTicketExists(ticketId: string) {
    const ticket = await this.db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }
    return ticket;
  }
}
