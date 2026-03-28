import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, max, or, sql } from 'drizzle-orm';
import {
  alertEvents,
  auditLogs,
  challengeParticipations,
  challenges,
  containers,
  citizenReports,
  eventConnectorExports,
  gamificationProfiles,
  ingestionEvents,
  tours,
  type DatabaseClient,
  validatedEventDeliveries,
} from 'ecotrack-database';

import { DRIZZLE } from '../../database/database.constants.js';

type QueueStatus = 'pending' | 'retry' | 'processing' | 'failed' | 'rejected' | 'validated';
type DeliveryStatus = 'pending' | 'retry' | 'processing' | 'failed' | 'completed';
type EventConnectorStatus = 'pending' | 'retry' | 'processing' | 'failed' | 'completed';
type StatusCountRow = {
  status: string;
  count: number;
};

const coerceTimestamp = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }

  const normalized = value instanceof Date ? value : new Date(value);
  return Number.isNaN(normalized.getTime()) ? null : normalized;
};

@Injectable()
export class MonitoringRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async getOperationalMetricsSnapshot() {
    const [
      ingestionByStatus,
      deliveryByStatus,
      ingestionOldestPending,
      deliveryOldestPending,
      validatedLastHour,
      completedLastHour,
      citizenReportsByStatus,
      citizenReportsCreatedLastHour,
      toursByStatus,
      toursCompletedLastHour,
      challengesByStatus,
      challengeParticipationsByStatus,
      challengeCompletionsLastHour,
      gamificationProfilesTotal,
      gamificationPointsTotal,
      criticalContainers,
      attentionContainers,
      maxContainerFillLevel,
      alertSeverityRows,
      ingestionShardRows,
      deliveryShardRows,
      deliveryLagRows,
      connectorExportsByStatus,
      connectorOldestPending,
      connectorLagRows,
      recentAuditActions,
    ] = await Promise.all([
      this.countIngestionByStatus(),
      this.countDeliveriesByStatus(),
      this.getOldestIngestionPendingAt(),
      this.getOldestDeliveryPendingAt(),
      this.countValidatedLastHour(),
      this.countCompletedDeliveriesLastHour(),
      this.countCitizenReportsByStatus(),
      this.countCitizenReportsCreatedLastHour(),
      this.countToursByStatus(),
      this.countToursCompletedLastHour(),
      this.countChallengesByStatus(),
      this.countChallengeParticipationsByStatus(),
      this.countChallengeCompletionsLastHour(),
      this.countGamificationProfiles(),
      this.sumGamificationPoints(),
      this.countContainersByStatus('critical'),
      this.countContainersByStatus('attention_required'),
      this.getMaxContainerFillLevel(),
      this.countOpenAlertsBySeverity(),
      this.countIngestionBacklogByShard(),
      this.countDeliveryBacklogByShard(),
      this.getDeliveryLagByConsumer(),
      this.countEventConnectorExportsByStatus(),
      this.getOldestEventConnectorPendingAt(),
      this.getEventConnectorLagByConnector(),
      this.countRecentAuditActions(),
    ]);

    return {
      ingestionByStatus,
      deliveryByStatus,
      ingestionOldestPendingAgeMs: (() => {
        const timestamp = coerceTimestamp(ingestionOldestPending);
        return timestamp ? Math.max(0, Date.now() - timestamp.getTime()) : null;
      })(),
      deliveryOldestPendingAgeMs: (() => {
        const timestamp = coerceTimestamp(deliveryOldestPending);
        return timestamp ? Math.max(0, Date.now() - timestamp.getTime()) : null;
      })(),
      validatedLastHour,
      completedLastHour,
      citizenReportsByStatus,
      citizenReportsCreatedLastHour,
      toursByStatus,
      toursCompletedLastHour,
      challengesByStatus,
      challengeParticipationsByStatus,
      challengeCompletionsLastHour,
      gamificationProfilesTotal,
      gamificationPointsTotal,
      connectorExportsByStatus,
      connectorOldestPendingAgeMs: (() => {
        const timestamp = coerceTimestamp(connectorOldestPending);
        return timestamp ? Math.max(0, Date.now() - timestamp.getTime()) : null;
      })(),
      connectorLagByConnector: connectorLagRows,
      criticalContainers,
      attentionContainers,
      maxContainerFillLevel,
      openAlertsBySeverity: alertSeverityRows,
      ingestionBacklogByShard: ingestionShardRows,
      deliveryBacklogByShard: deliveryShardRows,
      deliveryLagByConsumer: deliveryLagRows,
      recentAuditActions,
    };
  }

  private async countIngestionByStatus() {
    const rows = await this.db
      .select({
        status: ingestionEvents.processingStatus,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(ingestionEvents)
      .groupBy(ingestionEvents.processingStatus);

    return this.mapCountRows<QueueStatus>(rows, [
      'pending',
      'retry',
      'processing',
      'failed',
      'rejected',
      'validated',
    ]);
  }

  private async countDeliveriesByStatus() {
    const rows = await this.db
      .select({
        status: validatedEventDeliveries.processingStatus,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(validatedEventDeliveries)
      .groupBy(validatedEventDeliveries.processingStatus);

    return this.mapCountRows<DeliveryStatus>(rows, [
      'pending',
      'retry',
      'processing',
      'failed',
      'completed',
    ]);
  }

  private async getOldestIngestionPendingAt() {
    const [row] = await this.db
      .select({ value: sql<Date | null>`min(${ingestionEvents.receivedAt})` })
      .from(ingestionEvents)
      .where(
        or(
          eq(ingestionEvents.processingStatus, 'pending'),
          eq(ingestionEvents.processingStatus, 'retry'),
          eq(ingestionEvents.processingStatus, 'processing'),
        ),
      );

    return row?.value ?? null;
  }

  private async getOldestDeliveryPendingAt() {
    const [row] = await this.db
      .select({ value: sql<Date | null>`min(${validatedEventDeliveries.createdAt})` })
      .from(validatedEventDeliveries)
      .where(
        or(
          eq(validatedEventDeliveries.processingStatus, 'pending'),
          eq(validatedEventDeliveries.processingStatus, 'retry'),
          eq(validatedEventDeliveries.processingStatus, 'processing'),
        ),
      );

    return row?.value ?? null;
  }

  private async countValidatedLastHour() {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(ingestionEvents)
      .where(
        and(
          eq(ingestionEvents.processingStatus, 'validated'),
          sql`${ingestionEvents.processedAt} > NOW() - INTERVAL '1 hour'`,
        ),
      );

    return row?.value ?? 0;
  }

  private async countCompletedDeliveriesLastHour() {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(validatedEventDeliveries)
      .where(
        and(
          eq(validatedEventDeliveries.processingStatus, 'completed'),
          sql`${validatedEventDeliveries.processedAt} > NOW() - INTERVAL '1 hour'`,
        ),
      );

    return row?.value ?? 0;
  }

  private async countCitizenReportsByStatus(): Promise<StatusCountRow[]> {
    const rows = await this.db
      .select({
        status: citizenReports.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(citizenReports)
      .groupBy(citizenReports.status)
      .orderBy(citizenReports.status);

    return rows.map((row) => ({
      status: row.status,
      count: row.count ?? 0,
    }));
  }

  private async countCitizenReportsCreatedLastHour() {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(citizenReports)
      .where(sql`${citizenReports.reportedAt} > NOW() - INTERVAL '1 hour'`);

    return row?.value ?? 0;
  }

  private async countToursByStatus(): Promise<StatusCountRow[]> {
    const rows = await this.db
      .select({
        status: tours.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(tours)
      .groupBy(tours.status)
      .orderBy(tours.status);

    return rows.map((row) => ({
      status: row.status,
      count: row.count ?? 0,
    }));
  }

  private async countToursCompletedLastHour() {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(tours)
      .where(
        and(
          or(eq(tours.status, 'completed'), eq(tours.status, 'closed')),
          sql`${tours.completedAt} > NOW() - INTERVAL '1 hour'`,
        ),
      );

    return row?.value ?? 0;
  }

  private async countChallengesByStatus(): Promise<StatusCountRow[]> {
    const rows = await this.db
      .select({
        status: challenges.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(challenges)
      .groupBy(challenges.status)
      .orderBy(challenges.status);

    return rows.map((row) => ({
      status: row.status,
      count: row.count ?? 0,
    }));
  }

  private async countChallengeParticipationsByStatus(): Promise<StatusCountRow[]> {
    const rows = await this.db
      .select({
        status: challengeParticipations.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(challengeParticipations)
      .groupBy(challengeParticipations.status)
      .orderBy(challengeParticipations.status);

    return rows.map((row) => ({
      status: row.status,
      count: row.count ?? 0,
    }));
  }

  private async countChallengeCompletionsLastHour() {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(challengeParticipations)
      .where(
        and(
          eq(challengeParticipations.status, 'completed'),
          sql`${challengeParticipations.rewardGrantedAt} > NOW() - INTERVAL '1 hour'`,
        ),
      );

    return row?.value ?? 0;
  }

  private async countGamificationProfiles() {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(gamificationProfiles);

    return row?.value ?? 0;
  }

  private async sumGamificationPoints() {
    const [row] = await this.db
      .select({
        value: sql<number>`coalesce(sum(${gamificationProfiles.points}), 0)`.mapWith(Number),
      })
      .from(gamificationProfiles);

    return row?.value ?? 0;
  }

  private async countContainersByStatus(status: string) {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(containers)
      .where(eq(containers.status, status));

    return row?.value ?? 0;
  }

  private async getMaxContainerFillLevel() {
    const [row] = await this.db
      .select({
        value: max(containers.fillLevelPercent).mapWith(Number),
      })
      .from(containers);

    return row?.value ?? 0;
  }

  private async countOpenAlertsBySeverity() {
    const rows = await this.db
      .select({
        severity: alertEvents.severity,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(alertEvents)
      .where(eq(alertEvents.currentStatus, 'open'))
      .groupBy(alertEvents.severity)
      .orderBy(desc(sql<number>`count(*)`));

    return rows.map((row) => ({
      severity: row.severity,
      count: row.count ?? 0,
    }));
  }

  private async countIngestionBacklogByShard() {
    const rows = await this.db
      .select({
        shardId: ingestionEvents.shardId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(ingestionEvents)
      .where(
        or(
          eq(ingestionEvents.processingStatus, 'pending'),
          eq(ingestionEvents.processingStatus, 'retry'),
          eq(ingestionEvents.processingStatus, 'processing'),
        ),
      )
      .groupBy(ingestionEvents.shardId)
      .orderBy(ingestionEvents.shardId);

    return rows.map((row) => ({
      shardId: row.shardId,
      count: row.count ?? 0,
    }));
  }

  private async countDeliveryBacklogByShard() {
    const rows = await this.db
      .select({
        consumerName: validatedEventDeliveries.consumerName,
        shardId: validatedEventDeliveries.shardId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(validatedEventDeliveries)
      .where(
        or(
          eq(validatedEventDeliveries.processingStatus, 'pending'),
          eq(validatedEventDeliveries.processingStatus, 'retry'),
          eq(validatedEventDeliveries.processingStatus, 'processing'),
        ),
      )
      .groupBy(validatedEventDeliveries.consumerName, validatedEventDeliveries.shardId)
      .orderBy(validatedEventDeliveries.consumerName, validatedEventDeliveries.shardId);

    return rows.map((row) => ({
      consumerName: row.consumerName,
      shardId: row.shardId,
      count: row.count ?? 0,
    }));
  }

  private async getDeliveryLagByConsumer() {
    const [statusRows, oldestRows, completedRows, shardRows] = await Promise.all([
      this.db
        .select({
          consumerName: validatedEventDeliveries.consumerName,
          status: validatedEventDeliveries.processingStatus,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(validatedEventDeliveries)
        .groupBy(
          validatedEventDeliveries.consumerName,
          validatedEventDeliveries.processingStatus,
        ),
      this.db
        .select({
          consumerName: validatedEventDeliveries.consumerName,
          value: sql<Date | null>`min(${validatedEventDeliveries.createdAt})`,
        })
        .from(validatedEventDeliveries)
        .where(
          or(
            eq(validatedEventDeliveries.processingStatus, 'pending'),
            eq(validatedEventDeliveries.processingStatus, 'retry'),
            eq(validatedEventDeliveries.processingStatus, 'processing'),
          ),
        )
        .groupBy(validatedEventDeliveries.consumerName),
      this.db
        .select({
          consumerName: validatedEventDeliveries.consumerName,
          value: sql<number>`count(*)`.mapWith(Number),
        })
        .from(validatedEventDeliveries)
        .where(
          and(
            eq(validatedEventDeliveries.processingStatus, 'completed'),
            sql`${validatedEventDeliveries.processedAt} > NOW() - INTERVAL '1 hour'`,
          ),
        )
        .groupBy(validatedEventDeliveries.consumerName),
      this.db
        .select({
          consumerName: validatedEventDeliveries.consumerName,
          shardId: validatedEventDeliveries.shardId,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(validatedEventDeliveries)
        .where(
          or(
            eq(validatedEventDeliveries.processingStatus, 'pending'),
            eq(validatedEventDeliveries.processingStatus, 'retry'),
            eq(validatedEventDeliveries.processingStatus, 'processing'),
          ),
        )
        .groupBy(validatedEventDeliveries.consumerName, validatedEventDeliveries.shardId),
    ]);

    const lagByConsumer = new Map<
      string,
      {
        backlogTotal: number;
        pendingCount: number;
        retryCount: number;
        processingCount: number;
        failedCount: number;
        oldestPendingAgeMs: number | null;
        completedLastHour: number;
        maxShardBacklog: number;
        minShardBacklog: number | null;
      }
    >();

    for (const row of statusRows) {
      const current = lagByConsumer.get(row.consumerName) ?? {
        backlogTotal: 0,
        pendingCount: 0,
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        oldestPendingAgeMs: null,
        completedLastHour: 0,
        maxShardBacklog: 0,
        minShardBacklog: null,
      };
      const count = row.count ?? 0;

      if (row.status === 'pending') {
        current.pendingCount = count;
        current.backlogTotal += count;
      } else if (row.status === 'retry') {
        current.retryCount = count;
        current.backlogTotal += count;
      } else if (row.status === 'processing') {
        current.processingCount = count;
        current.backlogTotal += count;
      } else if (row.status === 'failed') {
        current.failedCount = count;
      }

      lagByConsumer.set(row.consumerName, current);
    }

    for (const row of oldestRows) {
      const current = lagByConsumer.get(row.consumerName) ?? {
        backlogTotal: 0,
        pendingCount: 0,
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        oldestPendingAgeMs: null,
        completedLastHour: 0,
        maxShardBacklog: 0,
        minShardBacklog: null,
      };
      const timestamp = coerceTimestamp(row.value);
      current.oldestPendingAgeMs = timestamp ? Math.max(0, Date.now() - timestamp.getTime()) : null;
      lagByConsumer.set(row.consumerName, current);
    }

    for (const row of completedRows) {
      const current = lagByConsumer.get(row.consumerName) ?? {
        backlogTotal: 0,
        pendingCount: 0,
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        oldestPendingAgeMs: null,
        completedLastHour: 0,
        maxShardBacklog: 0,
        minShardBacklog: null,
      };
      current.completedLastHour = row.value ?? 0;
      lagByConsumer.set(row.consumerName, current);
    }

    for (const row of shardRows) {
      const current = lagByConsumer.get(row.consumerName) ?? {
        backlogTotal: 0,
        pendingCount: 0,
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        oldestPendingAgeMs: null,
        completedLastHour: 0,
        maxShardBacklog: 0,
        minShardBacklog: null,
      };
      const count = row.count ?? 0;
      current.maxShardBacklog = Math.max(current.maxShardBacklog, count);
      current.minShardBacklog =
        current.minShardBacklog === null ? count : Math.min(current.minShardBacklog, count);
      lagByConsumer.set(row.consumerName, current);
    }

    return [...lagByConsumer.entries()]
      .map(([consumerName, snapshot]) => ({
        consumerName,
        shardSkew:
          snapshot.minShardBacklog === null
            ? 0
            : Math.max(0, snapshot.maxShardBacklog - snapshot.minShardBacklog),
        ...snapshot,
      }))
      .sort((left, right) => left.consumerName.localeCompare(right.consumerName));
  }

  private async countEventConnectorExportsByStatus() {
    const rows = await this.db
      .select({
        status: eventConnectorExports.processingStatus,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(eventConnectorExports)
      .groupBy(eventConnectorExports.processingStatus);

    return this.mapCountRows<EventConnectorStatus>(rows, [
      'pending',
      'retry',
      'processing',
      'failed',
      'completed',
    ]);
  }

  private async getOldestEventConnectorPendingAt() {
    const [row] = await this.db
      .select({ value: sql<Date | null>`min(${eventConnectorExports.createdAt})` })
      .from(eventConnectorExports)
      .where(
        or(
          eq(eventConnectorExports.processingStatus, 'pending'),
          eq(eventConnectorExports.processingStatus, 'retry'),
          eq(eventConnectorExports.processingStatus, 'processing'),
        ),
      );

    return row?.value ?? null;
  }

  private async getEventConnectorLagByConnector() {
    const [statusRows, oldestRows, completedRows] = await Promise.all([
      this.db
        .select({
          connectorName: eventConnectorExports.connectorName,
          status: eventConnectorExports.processingStatus,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(eventConnectorExports)
        .groupBy(eventConnectorExports.connectorName, eventConnectorExports.processingStatus),
      this.db
        .select({
          connectorName: eventConnectorExports.connectorName,
          value: sql<Date | null>`min(${eventConnectorExports.createdAt})`,
        })
        .from(eventConnectorExports)
        .where(
          or(
            eq(eventConnectorExports.processingStatus, 'pending'),
            eq(eventConnectorExports.processingStatus, 'retry'),
            eq(eventConnectorExports.processingStatus, 'processing'),
          ),
        )
        .groupBy(eventConnectorExports.connectorName),
      this.db
        .select({
          connectorName: eventConnectorExports.connectorName,
          value: sql<number>`count(*)`.mapWith(Number),
        })
        .from(eventConnectorExports)
        .where(
          and(
            eq(eventConnectorExports.processingStatus, 'completed'),
            sql`${eventConnectorExports.processedAt} > NOW() - INTERVAL '1 hour'`,
          ),
        )
        .groupBy(eventConnectorExports.connectorName),
    ]);

    const lagByConnector = new Map<
      string,
      {
        backlogTotal: number;
        pendingCount: number;
        retryCount: number;
        processingCount: number;
        failedCount: number;
        oldestPendingAgeMs: number | null;
        completedLastHour: number;
      }
    >();

    for (const row of statusRows) {
      const current = lagByConnector.get(row.connectorName) ?? {
        backlogTotal: 0,
        pendingCount: 0,
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        oldestPendingAgeMs: null,
        completedLastHour: 0,
      };
      const count = row.count ?? 0;

      if (row.status === 'pending') {
        current.pendingCount = count;
        current.backlogTotal += count;
      } else if (row.status === 'retry') {
        current.retryCount = count;
        current.backlogTotal += count;
      } else if (row.status === 'processing') {
        current.processingCount = count;
        current.backlogTotal += count;
      } else if (row.status === 'failed') {
        current.failedCount = count;
      }

      lagByConnector.set(row.connectorName, current);
    }

    for (const row of oldestRows) {
      const current = lagByConnector.get(row.connectorName) ?? {
        backlogTotal: 0,
        pendingCount: 0,
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        oldestPendingAgeMs: null,
        completedLastHour: 0,
      };
      const timestamp = coerceTimestamp(row.value);
      current.oldestPendingAgeMs = timestamp ? Math.max(0, Date.now() - timestamp.getTime()) : null;
      lagByConnector.set(row.connectorName, current);
    }

    for (const row of completedRows) {
      const current = lagByConnector.get(row.connectorName) ?? {
        backlogTotal: 0,
        pendingCount: 0,
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        oldestPendingAgeMs: null,
        completedLastHour: 0,
      };
      current.completedLastHour = row.value ?? 0;
      lagByConnector.set(row.connectorName, current);
    }

    return [...lagByConnector.entries()]
      .map(([connectorName, snapshot]) => ({
        connectorName,
        ...snapshot,
      }))
      .sort((left, right) => left.connectorName.localeCompare(right.connectorName));
  }

  private async countRecentAuditActions() {
    const rows = await this.db
      .select({
        action: auditLogs.action,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(auditLogs)
      .where(sql`${auditLogs.createdAt} > NOW() - INTERVAL '1 hour'`)
      .groupBy(auditLogs.action)
      .orderBy(desc(sql<number>`count(*)`));

    return rows.map((row) => ({
      action: row.action,
      count: row.count ?? 0,
    }));
  }

  private mapCountRows<TStatus extends string>(
    rows: Array<{ status: string; count: number | null }>,
    statuses: TStatus[],
  ) {
    const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<TStatus, number>;

    for (const row of rows) {
      if (statuses.includes(row.status as TStatus)) {
        counts[row.status as TStatus] = row.count ?? 0;
      }
    }

    return counts;
  }
}
