import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike } from 'drizzle-orm';
import { citizenReports, containers, type DatabaseClient, users } from 'ecotrack-database';

import { DRIZZLE } from '../database/database.constants.js';

import type { CreateCitizenReportDto } from './dto/create-citizen-report.dto.js';

type CitizenReportFilters = {
  search?: string;
  status?: string;
  limit: number;
  offset: number;
};

@Injectable()
export class CitizenReportsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async list(filters: CitizenReportFilters) {
    const where = this.buildWhere(filters);

    const listQuery = this.db
      .select({
        id: citizenReports.id,
        status: citizenReports.status,
        description: citizenReports.description,
        photoUrl: citizenReports.photoUrl,
        latitude: citizenReports.latitude,
        longitude: citizenReports.longitude,
        reportedAt: citizenReports.reportedAt,
        containerId: citizenReports.containerId,
        containerCode: containers.code,
        reporterUserId: citizenReports.reporterUserId,
        reporterEmail: users.email,
      })
      .from(citizenReports)
      .leftJoin(containers, eq(citizenReports.containerId, containers.id))
      .leftJoin(users, eq(citizenReports.reporterUserId, users.id))
      .orderBy(desc(citizenReports.reportedAt))
      .limit(filters.limit)
      .offset(filters.offset);

    const totalQuery = this.db.select({ value: count() }).from(citizenReports);

    const [items, totalRows] = await Promise.all([
      where ? listQuery.where(where) : listQuery,
      where ? totalQuery.where(where) : totalQuery,
    ]);

    return {
      items,
      total: totalRows[0]?.value ?? items.length,
    };
  }

  async create(dto: CreateCitizenReportDto) {
    const [created] = await this.db
      .insert(citizenReports)
      .values({
        containerId: dto.containerId ?? null,
        reporterUserId: dto.reporterUserId ?? null,
        status: dto.status?.trim() || 'submitted',
        description: dto.description.trim(),
        photoUrl: dto.photoUrl ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
      })
      .returning();

    return created;
  }

  private buildWhere(filters: CitizenReportFilters) {
    const conditions = [];

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(ilike(citizenReports.description, pattern));
    }

    if (filters.status) {
      conditions.push(eq(citizenReports.status, filters.status));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
