import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, lte, or, sql } from 'drizzle-orm';
import {
  containers,
  measurements,
  type DatabaseClient,
  validatedEventDeliveries,
  validatedMeasurementEvents,
} from 'ecotrack-database';

import { DRIZZLE } from '../../../database/database.constants.js';

import {
  VALIDATED_EVENT_CONSUMER_MAX_RETRIES,
  type ClaimedValidatedEventDelivery,
  type ValidatedEventConsumerHealthStats,
} from './validated-consumer.contracts.js';

@Injectable()
export class ValidatedConsumerRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async listRunnableDeliveryIds(consumerName: string, limit: number) {
    const rows = await this.db
      .select({ id: validatedEventDeliveries.id })
      .from(validatedEventDeliveries)
      .where(
        and(
          eq(validatedEventDeliveries.consumerName, consumerName),
          or(
            eq(validatedEventDeliveries.processingStatus, 'pending'),
            eq(validatedEventDeliveries.processingStatus, 'retry'),
          ),
          lte(validatedEventDeliveries.nextAttemptAt, new Date()),
        ),
      )
      .orderBy(asc(validatedEventDeliveries.createdAt))
      .limit(limit);

    return rows.map((row) => row.id);
  }

  async recoverStuckProcessing(consumerName: string, staleThreshold: Date) {
    await this.db
      .update(validatedEventDeliveries)
      .set({
        processingStatus: 'retry',
        nextAttemptAt: new Date(),
        lastError: 'Recovered stale validated-event delivery lease.',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(validatedEventDeliveries.consumerName, consumerName),
          eq(validatedEventDeliveries.processingStatus, 'processing'),
          lte(validatedEventDeliveries.processingStartedAt, staleThreshold),
        ),
      );
  }

  async claimDeliveryForProcessing(
    deliveryId: string,
    consumerName: string,
  ): Promise<ClaimedValidatedEventDelivery | null> {
    const [claimed] = await this.db
      .update(validatedEventDeliveries)
      .set({
        processingStatus: 'processing',
        attemptCount: sql`${validatedEventDeliveries.attemptCount} + 1`,
        processingStartedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(validatedEventDeliveries.id, deliveryId),
          eq(validatedEventDeliveries.consumerName, consumerName),
          or(
            eq(validatedEventDeliveries.processingStatus, 'pending'),
            eq(validatedEventDeliveries.processingStatus, 'retry'),
          ),
        ),
      )
      .returning({
        id: validatedEventDeliveries.id,
        consumerName: validatedEventDeliveries.consumerName,
        validatedEventId: validatedEventDeliveries.validatedEventId,
        attemptCount: validatedEventDeliveries.attemptCount,
        traceparent: validatedEventDeliveries.traceparent,
        tracestate: validatedEventDeliveries.tracestate,
      });

    if (!claimed) {
      return null;
    }

    const [event] = await this.db
      .select({
        measuredAt: validatedMeasurementEvents.measuredAt,
        sensorDeviceId: validatedMeasurementEvents.sensorDeviceId,
        containerId: validatedMeasurementEvents.containerId,
        fillLevelPercent: validatedMeasurementEvents.fillLevelPercent,
        temperatureC: validatedMeasurementEvents.temperatureC,
        batteryPercent: validatedMeasurementEvents.batteryPercent,
        signalStrength: validatedMeasurementEvents.signalStrength,
        measurementQuality: validatedMeasurementEvents.measurementQuality,
        warningThreshold: validatedMeasurementEvents.warningThreshold,
        criticalThreshold: validatedMeasurementEvents.criticalThreshold,
        normalizedPayload: validatedMeasurementEvents.normalizedPayload,
        emittedAt: validatedMeasurementEvents.emittedAt,
      })
      .from(validatedMeasurementEvents)
      .where(eq(validatedMeasurementEvents.id, claimed.validatedEventId))
      .limit(1);

    if (!event) {
      return null;
    }

    return {
      id: claimed.id,
      consumerName: claimed.consumerName,
      validatedEventId: claimed.validatedEventId,
      attemptCount: claimed.attemptCount,
      traceparent: claimed.traceparent,
      tracestate: claimed.tracestate,
      measuredAt: event.measuredAt,
      sensorDeviceId: event.sensorDeviceId,
      containerId: event.containerId,
      fillLevelPercent: event.fillLevelPercent,
      temperatureC: event.temperatureC,
      batteryPercent: event.batteryPercent,
      signalStrength: event.signalStrength,
      measurementQuality: event.measurementQuality,
      warningThreshold: event.warningThreshold,
      criticalThreshold: event.criticalThreshold,
      normalizedPayload: (event.normalizedPayload as Record<string, unknown> | null) ?? {},
      emittedAt: event.emittedAt,
    };
  }

  async projectValidatedEvent(delivery: ClaimedValidatedEventDelivery) {
    return this.db.transaction(async (tx) => {
      const [measurementRecord] = await tx
        .insert(measurements)
        .values({
          validatedEventId: delivery.validatedEventId,
          sensorDeviceId: delivery.sensorDeviceId,
          containerId: delivery.containerId,
          measuredAt: delivery.measuredAt,
          fillLevelPercent: delivery.fillLevelPercent,
          temperatureC: delivery.temperatureC,
          batteryPercent: delivery.batteryPercent,
          signalStrength: delivery.signalStrength,
          measurementQuality: delivery.measurementQuality,
          sourcePayload: delivery.normalizedPayload,
          receivedAt: delivery.emittedAt,
        })
        .onConflictDoNothing({
          target: [measurements.validatedEventId, measurements.measuredAt],
        })
        .returning({
          id: measurements.id,
        });

      if (
        delivery.containerId &&
        delivery.warningThreshold !== null &&
        delivery.criticalThreshold !== null
      ) {
        await tx
          .update(containers)
          .set({
            fillLevelPercent: delivery.fillLevelPercent,
            status: this.resolveOperationalStatus(
              delivery.fillLevelPercent,
              delivery.warningThreshold,
              delivery.criticalThreshold,
            ),
            updatedAt: new Date(),
          })
          .where(eq(containers.id, delivery.containerId));
      }

      return {
        measurementId: measurementRecord?.id ?? null,
      };
    });
  }

  async markCompleted(deliveryId: string) {
    await this.db
      .update(validatedEventDeliveries)
      .set({
        processingStatus: 'completed',
        processedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(validatedEventDeliveries.id, deliveryId));
  }

  async markRetryOrFailed(deliveryId: string, attemptCount: number, errorMessage: string, nextAttemptAt: Date) {
    const now = new Date();
    const failed = attemptCount >= VALIDATED_EVENT_CONSUMER_MAX_RETRIES;

    await this.db
      .update(validatedEventDeliveries)
      .set({
        processingStatus: failed ? 'failed' : 'retry',
        nextAttemptAt,
        lastError: errorMessage,
        failedAt: failed ? now : null,
        updatedAt: now,
      })
      .where(eq(validatedEventDeliveries.id, deliveryId));
  }

  async getHealthStats(consumerName: string): Promise<ValidatedEventConsumerHealthStats> {
    const [pendingCount, retryCount, processingCount, failedCount, completedLastHour, oldestPending] =
      await Promise.all([
        this.countByStatus(consumerName, 'pending'),
        this.countByStatus(consumerName, 'retry'),
        this.countByStatus(consumerName, 'processing'),
        this.countByStatus(consumerName, 'failed'),
        this.countCompletedLastHour(consumerName),
        this.getOldestPendingCreatedAt(consumerName),
      ]);

    return {
      pendingCount,
      retryCount,
      processingCount,
      failedCount,
      completedLastHour,
      oldestPendingAgeMs: oldestPending ? Math.max(0, Date.now() - oldestPending.getTime()) : null,
    };
  }

  private async countByStatus(consumerName: string, status: string) {
    const [result] = await this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(validatedEventDeliveries)
      .where(
        and(
          eq(validatedEventDeliveries.consumerName, consumerName),
          eq(validatedEventDeliveries.processingStatus, status),
        ),
      );

    return result?.value ?? 0;
  }

  private async countCompletedLastHour(consumerName: string) {
    const [result] = await this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(validatedEventDeliveries)
      .where(
        and(
          eq(validatedEventDeliveries.consumerName, consumerName),
          eq(validatedEventDeliveries.processingStatus, 'completed'),
          sql`${validatedEventDeliveries.processedAt} > NOW() - INTERVAL '1 hour'`,
        ),
      );

    return result?.value ?? 0;
  }

  private async getOldestPendingCreatedAt(consumerName: string) {
    const [result] = await this.db
      .select({ value: sql<Date | null>`min(${validatedEventDeliveries.createdAt})` })
      .from(validatedEventDeliveries)
      .where(
        and(
          eq(validatedEventDeliveries.consumerName, consumerName),
          or(
            eq(validatedEventDeliveries.processingStatus, 'pending'),
            eq(validatedEventDeliveries.processingStatus, 'retry'),
            eq(validatedEventDeliveries.processingStatus, 'processing'),
          ),
        ),
      );

    return result?.value ?? null;
  }

  private resolveOperationalStatus(
    fillLevelPercent: number,
    warningThreshold: number,
    criticalThreshold: number,
  ) {
    if (fillLevelPercent >= criticalThreshold) {
      return 'critical';
    }

    if (fillLevelPercent >= warningThreshold) {
      return 'attention_required';
    }

    return 'available';
  }
}
