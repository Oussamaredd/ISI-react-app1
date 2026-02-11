import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { hotels, tickets, type DatabaseClient } from 'react-app1-database';

import { DRIZZLE } from '../database/database.constants.js';

const slugify = (value: string) => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'hotel';
};

const toIsoString = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value.trim() || null;
  const parsed = new Date(value as any);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

@Injectable()
export class AdminHotelsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async listHotels(filters: { search?: string; isAvailable?: boolean; page?: number; limit?: number }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    const search = filters.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(or(ilike(hotels.name, pattern), ilike(hotels.slug, pattern)));
    }

    if (typeof filters.isAvailable === 'boolean') {
      conditions.push(eq(hotels.isAvailable, filters.isAvailable));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const countQuery = this.db.select({ total: sql`count(*)`.mapWith(Number) }).from(hotels);
    const listQuery = this.db
      .select({
        id: hotels.id,
        name: hotels.name,
        isAvailable: hotels.isAvailable,
        createdAt: hotels.createdAt,
        updatedAt: hotels.updatedAt,
        ticketCount: sql`count(${tickets.id})`.mapWith(Number),
      })
      .from(hotels)
      .leftJoin(tickets, eq(tickets.hotelId, hotels.id))
      .groupBy(hotels.id, hotels.name, hotels.isAvailable, hotels.createdAt, hotels.updatedAt)
      .orderBy(asc(hotels.name))
      .limit(limit)
      .offset(offset);

    const [rows, countRows] = await Promise.all([
      where ? listQuery.where(where) : listQuery,
      where ? countQuery.where(where) : countQuery,
    ]);

    const total = countRows[0]?.total ?? rows.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const hotelsList = rows.map((row) => ({
      id: row.id,
      name: row.name,
      is_available: row.isAvailable,
      ticket_count: row.ticketCount ?? 0,
      avg_price: 0,
      created_at: toIsoString(row.createdAt),
      updated_at: toIsoString(row.updatedAt),
    }));

    return {
      hotels: hotelsList,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getHotel(id: string) {
    const [row] = await this.db
      .select({
        id: hotels.id,
        name: hotels.name,
        isAvailable: hotels.isAvailable,
        createdAt: hotels.createdAt,
        updatedAt: hotels.updatedAt,
        ticketCount: sql`count(${tickets.id})`.mapWith(Number),
      })
      .from(hotels)
      .leftJoin(tickets, eq(tickets.hotelId, hotels.id))
      .where(eq(hotels.id, id))
      .groupBy(hotels.id, hotels.name, hotels.isAvailable, hotels.createdAt, hotels.updatedAt)
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Hotel ${id} not found`);
    }

    return {
      id: row.id,
      name: row.name,
      is_available: row.isAvailable,
      ticket_count: row.ticketCount ?? 0,
      avg_price: 0,
      created_at: toIsoString(row.createdAt),
      updated_at: toIsoString(row.updatedAt),
    };
  }

  async createHotel(payload: { name: string; is_available?: boolean }) {
    const name = payload.name?.trim();
    if (!name) {
      throw new BadRequestException('Hotel name is required');
    }

    const slug = await this.generateUniqueSlug(name);
    const [created] = await this.db
      .insert(hotels)
      .values({
        name,
        slug,
        isAvailable: payload.is_available !== false,
      })
      .returning();

    if (!created) {
      throw new BadRequestException('Failed to create hotel');
    }

    return created;
  }

  async updateHotel(id: string, payload: { name?: string; is_available?: boolean }) {
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name) {
        throw new BadRequestException('Hotel name cannot be empty');
      }
      updates.name = name;
      updates.slug = await this.generateUniqueSlug(name, id);
    }

    if (payload.is_available !== undefined) {
      updates.isAvailable = payload.is_available;
    }

    const [updated] = await this.db
      .update(hotels)
      .set(updates)
      .where(eq(hotels.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Hotel ${id} not found`);
    }

    return updated;
  }

  async deleteHotel(id: string) {
    const [deleted] = await this.db.delete(hotels).where(eq(hotels.id, id)).returning();
    if (!deleted) {
      throw new NotFoundException(`Hotel ${id} not found`);
    }
    return deleted;
  }

  async toggleAvailability(id: string) {
    const hotel = await this.db.query.hotels.findFirst({ where: eq(hotels.id, id) });
    if (!hotel) {
      throw new NotFoundException(`Hotel ${id} not found`);
    }

    const nextAvailability = !hotel.isAvailable;
    const [updated] = await this.db
      .update(hotels)
      .set({ isAvailable: nextAvailability, updatedAt: new Date() })
      .where(eq(hotels.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Hotel ${id} not found`);
    }

    return {
      updated,
      message: nextAvailability ? 'Hotel has been activated.' : 'Hotel has been deactivated.',
    };
  }

  async getStats() {
    const [totalRow, activeRow, inactiveRow, withTicketsRow] = await Promise.all([
      this.db.select({ total: sql`count(*)`.mapWith(Number) }).from(hotels),
      this.db
        .select({ total: sql`count(*)`.mapWith(Number) })
        .from(hotels)
        .where(eq(hotels.isAvailable, true)),
      this.db
        .select({ total: sql`count(*)`.mapWith(Number) })
        .from(hotels)
        .where(eq(hotels.isAvailable, false)),
      this.db
        .select({ total: sql`count(distinct ${tickets.hotelId})`.mapWith(Number) })
        .from(tickets)
        .where(sql`${tickets.hotelId} is not null`),
    ]);

    return {
      total_hotels: totalRow[0]?.total ?? 0,
      active_hotels: activeRow[0]?.total ?? 0,
      inactive_hotels: inactiveRow[0]?.total ?? 0,
      hotels_with_tickets: withTicketsRow[0]?.total ?? 0,
    };
  }

  async getTopHotels(limit = 10) {
    const rows = await this.db
      .select({
        id: hotels.id,
        name: hotels.name,
        ticketCount: sql`count(${tickets.id})`.mapWith(Number),
      })
      .from(hotels)
      .leftJoin(tickets, eq(tickets.hotelId, hotels.id))
      .groupBy(hotels.id, hotels.name)
      .orderBy(desc(sql`count(${tickets.id})`))
      .limit(Math.min(limit, 50));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      ticket_count: row.ticketCount ?? 0,
      avg_price: 0,
    }));
  }

  private async generateUniqueSlug(name: string, hotelId?: string) {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 1;

    while (await this.slugExists(slug, hotelId)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
      if (suffix > 50) {
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    return slug;
  }

  private async slugExists(slug: string, hotelId?: string) {
    const conditions = [eq(hotels.slug, slug)];
    if (hotelId) {
      conditions.push(sql`${hotels.id} <> ${hotelId}`);
    }

    const [row] = await this.db
      .select({ id: hotels.id })
      .from(hotels)
      .where(and(...conditions))
      .limit(1);

    return Boolean(row?.id);
  }
}
