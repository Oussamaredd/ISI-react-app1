import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { auditLogs, type DatabaseClient, users } from 'ecotrack-database';

import { DRIZZLE } from '../database/database.constants.js';

const toDateOnly = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length >= 10 ? trimmed.slice(0, 10) : null;
  }
  const parsed = new Date(value as any);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const toIsoString = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value.trim() || null;
  const parsed = new Date(value as any);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

type AuditLogInput = {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AuditLogFilters = {
  search?: string;
  action?: string;
  resourceType?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
};

@Injectable()
export class AdminAuditRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async log(entry: AuditLogInput) {
    await this.db.insert(auditLogs).values({
      userId: entry.userId ?? null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      oldValues: entry.oldValues ?? null,
      newValues: entry.newValues ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    });
  }

  async listLogs(filters: AuditLogFilters = {}) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 200) : 50;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }

    if (filters.resourceType) {
      conditions.push(eq(auditLogs.resourceType, filters.resourceType));
    }

    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }

    if (filters.dateFrom) {
      conditions.push(gte(auditLogs.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(auditLogs.createdAt, filters.dateTo));
    }

    const search = filters.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(auditLogs.action, pattern),
          ilike(auditLogs.resourceType, pattern),
          ilike(auditLogs.resourceId, pattern),
          ilike(users.email, pattern),
          ilike(users.displayName, pattern),
        ),
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const baseQuery = this.db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        userName: users.displayName,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const countQuery = this.db
      .select({ total: sql`count(*)`.mapWith(Number) })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id));

    const [rows, countRows] = await Promise.all([
      where ? baseQuery.where(where) : baseQuery,
      where ? countQuery.where(where) : countQuery,
    ]);

    const total = countRows[0]?.total ?? rows.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const logs = rows.map((row) => ({
      id: row.id,
      user_id: row.userId,
      user_name: row.userName ?? row.userEmail ?? null,
      action: row.action,
      resource_type: row.resourceType,
      resource_id: row.resourceId,
      old_values: row.oldValues,
      new_values: row.newValues,
      ip_address: row.ipAddress,
      user_agent: row.userAgent,
      created_at: toIsoString(row.createdAt),
    }));

    return { logs, total, totalPages, page, pageSize: limit };
  }

  async getStats(limit = 50) {
    const rows = await this.db
      .select({
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        date: sql`date(${auditLogs.createdAt})`.as('date'),
        count: sql`count(*)`.mapWith(Number),
      })
      .from(auditLogs)
      .groupBy(auditLogs.action, auditLogs.resourceType, sql`date(${auditLogs.createdAt})`)
      .orderBy(desc(sql`date(${auditLogs.createdAt})`), desc(sql`count(*)`))
      .limit(limit);

    return rows.map((row) => ({
      action: row.action,
      resource_type: row.resourceType,
      count: row.count ?? 0,
      date: toDateOnly(row.date) ?? '',
    }));
  }
}
