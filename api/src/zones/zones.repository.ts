import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, ilike } from 'drizzle-orm';
import { type DatabaseClient, zones } from 'ecotrack-database';

import { DRIZZLE } from '../database/database.constants.js';

import type { CreateZoneDto } from './dto/create-zone.dto.js';
import type { UpdateZoneDto } from './dto/update-zone.dto.js';

type ZoneFilters = {
  search?: string;
  isActive?: boolean;
  limit: number;
  offset: number;
};

@Injectable()
export class ZonesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async list(filters: ZoneFilters) {
    const where = this.buildWhere(filters);

    const listQuery = this.db
      .select()
      .from(zones)
      .orderBy(asc(zones.name))
      .limit(filters.limit)
      .offset(filters.offset);

    const totalQuery = this.db.select({ value: count() }).from(zones);

    const [items, totalRows] = await Promise.all([
      where ? listQuery.where(where) : listQuery,
      where ? totalQuery.where(where) : totalQuery,
    ]);

    return {
      items,
      total: totalRows[0]?.value ?? items.length,
    };
  }

  async create(dto: CreateZoneDto) {
    const [created] = await this.db
      .insert(zones)
      .values({
        name: dto.name.trim(),
        code: dto.code.trim(),
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
      })
      .returning();

    return created;
  }

  async update(id: string, dto: UpdateZoneDto) {
    const [updated] = await this.db
      .update(zones)
      .set({
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(zones.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Zone ${id} not found`);
    }

    return updated;
  }

  private buildWhere(filters: ZoneFilters) {
    const conditions = [];

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(ilike(zones.name, pattern));
    }

    if (typeof filters.isActive === 'boolean') {
      conditions.push(eq(zones.isActive, filters.isActive));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
