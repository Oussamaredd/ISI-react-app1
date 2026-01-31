import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq, gte, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants.js';
import { type DatabaseClient, hotels, tickets } from '#database';

const COMPLETED_STATUSES = ['completed', 'closed', 'COMPLETED', 'CLOSED'];
const DAYS_OF_ACTIVITY = 7;

type DashboardSummary = {
  total: number;
  open: number;
  completed: number;
  assigned: number;
};

type DashboardResponse = {
  summary: DashboardSummary;
  statusBreakdown: Record<string, number>;
  hotels: Array<{ id: string; name: string; ticketCount: number }>;
  recentActivity: Array<{ date: string; created: number; updated: number }>;
  recentTickets: Array<{
    id: string;
    name: string;
    status: string;
    price: number;
    hotelName: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }>;
};

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async getDashboard(): Promise<DashboardResponse> {
    const [totalRow, completedRow, assignedRow, statusRows, hotelRows, recentTicketsRows] =
      await Promise.all([
        this.db
          .select({ total: sql`count(*)`.mapWith(Number) })
          .from(tickets),
        this.db
          .select({ total: sql`count(*)`.mapWith(Number) })
          .from(tickets)
          .where(inArray(tickets.status, COMPLETED_STATUSES)),
        this.db
          .select({ total: sql`count(*)`.mapWith(Number) })
          .from(tickets)
          .where(isNotNull(tickets.assigneeId)),
        this.db
          .select({ status: tickets.status, total: sql`count(*)`.mapWith(Number) })
          .from(tickets)
          .groupBy(tickets.status),
        this.db
          .select({
            id: hotels.id,
            name: hotels.name,
            ticketCount: sql`count(${tickets.id})`.mapWith(Number),
          })
          .from(hotels)
          .leftJoin(tickets, eq(tickets.hotelId, hotels.id))
          .groupBy(hotels.id, hotels.name)
          .orderBy(asc(hotels.name)),
        this.db
          .select({
            id: tickets.id,
            title: tickets.title,
            status: tickets.status,
            createdAt: tickets.createdAt,
            updatedAt: tickets.updatedAt,
            hotelName: hotels.name,
          })
          .from(tickets)
          .leftJoin(hotels, eq(tickets.hotelId, hotels.id))
          .orderBy(desc(tickets.createdAt))
          .limit(10),
      ]);

    const total = totalRow[0]?.total ?? 0;
    const completed = completedRow[0]?.total ?? 0;
    const assigned = assignedRow[0]?.total ?? 0;
    const open = Math.max(total - completed, 0);

    const statusBreakdown = statusRows.reduce<Record<string, number>>((acc, row) => {
      const key = row.status ? row.status.toLowerCase() : 'unknown';
      acc[key] = (acc[key] ?? 0) + (row.total ?? 0);
      return acc;
    }, {});

    const hotelsSummary = hotelRows.map((row) => ({
      id: row.id,
      name: row.name,
      ticketCount: row.ticketCount ?? 0,
    }));

    const recentTickets = recentTicketsRows.map((row) => ({
      id: row.id,
      name: row.title ?? 'Untitled ticket',
      status: row.status ?? 'open',
      price: 0,
      hotelName: row.hotelName ?? null,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    }));

    const recentActivity = await this.buildRecentActivity();

    return {
      summary: {
        total,
        open,
        completed,
        assigned,
      },
      statusBreakdown,
      hotels: hotelsSummary,
      recentActivity,
      recentTickets,
    };
  }

  private async buildRecentActivity() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - (DAYS_OF_ACTIVITY - 1));
    start.setHours(0, 0, 0, 0);

    const rows = await this.db
      .select({
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .where(or(gte(tickets.createdAt, start), gte(tickets.updatedAt, start)));

    const activityMap = new Map<string, { date: string; created: number; updated: number }>();

    for (let i = 0; i < DAYS_OF_ACTIVITY; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      activityMap.set(key, { date: key, created: 0, updated: 0 });
    }

    for (const row of rows) {
      if (row.createdAt) {
        const key = row.createdAt.toISOString().slice(0, 10);
        const activity = activityMap.get(key);
        if (activity) {
          activity.created += 1;
        }
      }

      if (row.updatedAt) {
        const key = row.updatedAt.toISOString().slice(0, 10);
        const activity = activityMap.get(key);
        if (activity) {
          activity.updated += 1;
        }
      }
    }

    return Array.from(activityMap.values());
  }
}
