import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { containers, type DatabaseClient, zones } from 'ecotrack-database';

import { DRIZZLE } from '../database/database.constants.js';

import type { CreateContainerDto } from './dto/create-container.dto.js';
import type { UpdateContainerDto } from './dto/update-container.dto.js';

type ContainerFilters = {
  search?: string;
  zoneId?: string;
  status?: string;
  limit: number;
  offset: number;
};

@Injectable()
export class ContainersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async list(filters: ContainerFilters) {
    const where = this.buildWhere(filters);

    const listQuery = this.db
      .select({
        id: containers.id,
        code: containers.code,
        label: containers.label,
        status: containers.status,
        fillLevelPercent: containers.fillLevelPercent,
        latitude: containers.latitude,
        longitude: containers.longitude,
        zoneId: containers.zoneId,
        zoneName: zones.name,
        createdAt: containers.createdAt,
        updatedAt: containers.updatedAt,
      })
      .from(containers)
      .leftJoin(zones, eq(containers.zoneId, zones.id))
      .orderBy(asc(containers.code))
      .limit(filters.limit)
      .offset(filters.offset);

    const totalQuery = this.db.select({ value: count() }).from(containers);

    const [items, totalRows] = await Promise.all([
      where ? listQuery.where(where) : listQuery,
      where ? totalQuery.where(where) : totalQuery,
    ]);

    return {
      items,
      total: totalRows[0]?.value ?? items.length,
    };
  }

  async create(dto: CreateContainerDto) {
    const [created] = await this.db
      .insert(containers)
      .values({
        code: dto.code.trim(),
        label: dto.label.trim(),
        status: dto.status?.trim() || 'available',
        fillLevelPercent: dto.fillLevelPercent ?? 0,
        zoneId: dto.zoneId ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
      })
      .returning();

    return created;
  }

  async update(id: string, dto: UpdateContainerDto) {
    const [updated] = await this.db
      .update(containers)
      .set({
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.status !== undefined ? { status: dto.status.trim() } : {}),
        ...(dto.fillLevelPercent !== undefined ? { fillLevelPercent: dto.fillLevelPercent } : {}),
        ...(dto.zoneId !== undefined ? { zoneId: dto.zoneId } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        updatedAt: new Date(),
      })
      .where(eq(containers.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Container ${id} not found`);
    }

    return updated;
  }

  private buildWhere(filters: ContainerFilters) {
    const conditions = [];

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(sql`${containers.code} ilike ${pattern} OR ${containers.label} ilike ${pattern}`);
    }

    if (filters.zoneId) {
      conditions.push(eq(containers.zoneId, filters.zoneId));
    }

    if (filters.status) {
      conditions.push(eq(containers.status, filters.status));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
