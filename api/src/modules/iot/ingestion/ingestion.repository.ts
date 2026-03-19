import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, lte, or, sql } from 'drizzle-orm';
import {
  containerTypes,
  containers,
  ingestionEvents,
  measurements,
  sensorDevices,
  type DatabaseClient,
  validatedMeasurementEvents,
} from 'ecotrack-database';

import { DRIZZLE } from '../../../database/database.constants.js';

import {
  type ClaimedIngestionEvent,
  type IngestionHealthStats,
  IngestionBusinessRuleError,
  type NormalizedMeasurementEvent,
  type StagedMeasurementEventRef,
  type StagedMeasurementInput,
} from './ingestion.contracts.js';

type TransactionClient = Parameters<DatabaseClient['transaction']>[0] extends (
  arg: infer T,
) => unknown
  ? T
  : never;

type SensorContext = {
  id: string;
  deviceUid: string;
  containerId: string | null;
};

@Injectable()
export class IngestionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async stageMeasurements(
    measurementsToStage: StagedMeasurementInput[],
  ): Promise<StagedMeasurementEventRef[]> {
    const stagedRefs: StagedMeasurementEventRef[] = [];

    for (const measurement of measurementsToStage) {
      const [created] = await this.db
        .insert(ingestionEvents)
        .values({
          batchId: measurement.batchId,
          deviceUid: measurement.deviceUid,
          sensorDeviceId: measurement.sensorDeviceId,
          containerId: measurement.containerId,
          idempotencyKey: measurement.idempotencyKey,
          measuredAt: measurement.measuredAt,
          fillLevelPercent: measurement.fillLevelPercent,
          temperatureC: measurement.temperatureC,
          batteryPercent: measurement.batteryPercent,
          signalStrength: measurement.signalStrength,
          measurementQuality: measurement.measurementQuality,
          rawPayload: measurement.rawPayload as any,
          receivedAt: measurement.receivedAt,
        })
        .onConflictDoNothing()
        .returning({
          id: ingestionEvents.id,
          deviceUid: ingestionEvents.deviceUid,
          idempotencyKey: ingestionEvents.idempotencyKey,
        });

      if (created) {
        stagedRefs.push({
          ...created,
          newlyStaged: true,
        });
        continue;
      }

      if (measurement.idempotencyKey) {
        const [existing] = await this.db
          .select({
            id: ingestionEvents.id,
            deviceUid: ingestionEvents.deviceUid,
            idempotencyKey: ingestionEvents.idempotencyKey,
          })
          .from(ingestionEvents)
          .where(
            and(
              eq(ingestionEvents.deviceUid, measurement.deviceUid),
              eq(ingestionEvents.idempotencyKey, measurement.idempotencyKey),
            ),
          )
          .limit(1);

        if (existing) {
          stagedRefs.push({
            ...existing,
            newlyStaged: false,
          });
          continue;
        }
      }

      throw new BadRequestException('Unable to stage measurement event.');
    }

    return stagedRefs;
  }

  async listRunnableEventIds(limit: number): Promise<string[]> {
    const rows = await this.db
      .select({ id: ingestionEvents.id })
      .from(ingestionEvents)
      .where(
        and(
          or(
            eq(ingestionEvents.processingStatus, 'pending'),
            eq(ingestionEvents.processingStatus, 'retry'),
          ),
          lte(ingestionEvents.nextAttemptAt, new Date()),
        ),
      )
      .orderBy(asc(ingestionEvents.receivedAt))
      .limit(limit);

    return rows.map((row) => row.id);
  }

  async recoverStuckProcessing(staleThreshold: Date) {
    await this.db
      .update(ingestionEvents)
      .set({
        processingStatus: 'retry',
        nextAttemptAt: new Date(),
        lastError: 'Recovered stale processing lease.',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ingestionEvents.processingStatus, 'processing'),
          lte(ingestionEvents.processingStartedAt, staleThreshold),
        ),
      );
  }

  async claimEventForProcessing(eventId: string): Promise<ClaimedIngestionEvent | null> {
    const [claimed] = await this.db
      .update(ingestionEvents)
      .set({
        processingStatus: 'processing',
        attemptCount: sql`${ingestionEvents.attemptCount} + 1`,
        processingStartedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ingestionEvents.id, eventId),
          or(
            eq(ingestionEvents.processingStatus, 'pending'),
            eq(ingestionEvents.processingStatus, 'retry'),
          ),
        ),
      )
      .returning({
        id: ingestionEvents.id,
        batchId: ingestionEvents.batchId,
        deviceUid: ingestionEvents.deviceUid,
        sensorDeviceId: ingestionEvents.sensorDeviceId,
        containerId: ingestionEvents.containerId,
        idempotencyKey: ingestionEvents.idempotencyKey,
        measuredAt: ingestionEvents.measuredAt,
        fillLevelPercent: ingestionEvents.fillLevelPercent,
        temperatureC: ingestionEvents.temperatureC,
        batteryPercent: ingestionEvents.batteryPercent,
        signalStrength: ingestionEvents.signalStrength,
        measurementQuality: ingestionEvents.measurementQuality,
        processingStatus: ingestionEvents.processingStatus,
        attemptCount: ingestionEvents.attemptCount,
        rawPayload: ingestionEvents.rawPayload,
        receivedAt: ingestionEvents.receivedAt,
      });

    if (!claimed) {
      return null;
    }

    return {
      ...claimed,
      processingStatus: claimed.processingStatus as ClaimedIngestionEvent['processingStatus'],
      rawPayload: claimed.rawPayload as Record<string, unknown>,
    };
  }

  async markRejected(eventId: string, reason: string, normalizedPayload: Record<string, unknown>) {
    const now = new Date();
    await this.db
      .update(ingestionEvents)
      .set({
        processingStatus: 'rejected',
        rejectionReason: reason,
        normalizedPayload,
        processedAt: now,
        failedAt: now,
        processingLatencyMs: sql`extract(epoch from (${now} - ${ingestionEvents.receivedAt})) * 1000`,
        updatedAt: now,
      })
      .where(eq(ingestionEvents.id, eventId));
  }

  async markRetryOrFailed(eventId: string, attemptCount: number, errorMessage: string, nextAttemptAt: Date) {
    const now = new Date();
    const failed = attemptCount >= 3;

    await this.db
      .update(ingestionEvents)
      .set({
        processingStatus: failed ? 'failed' : 'retry',
        nextAttemptAt,
        lastError: errorMessage,
        failedAt: failed ? now : null,
        processingLatencyMs: sql`extract(epoch from (${now} - ${ingestionEvents.receivedAt})) * 1000`,
        updatedAt: now,
      })
      .where(eq(ingestionEvents.id, eventId));
  }

  async persistValidatedEvent(event: NormalizedMeasurementEvent) {
    return this.db.transaction(async (tx) => {
      const resolvedSensor = await this.resolveSensorContext(tx, event);
      const resolvedContainerId = resolvedSensor.containerId ?? event.containerId ?? null;
      const thresholds = resolvedContainerId
        ? await this.loadThresholds(tx, resolvedContainerId)
        : { warningThreshold: null, criticalThreshold: null };

      if (resolvedSensor.id) {
        await tx
          .update(sensorDevices)
          .set({
            containerId: resolvedContainerId,
            batteryPercent: event.batteryPercent,
            lastSeenAt: event.measuredAt,
            updatedAt: new Date(),
          })
          .where(eq(sensorDevices.id, resolvedSensor.id));
      }

      const processedAt = new Date();
      const normalizedPayload = {
        sourceEventId: event.sourceEventId,
        schemaVersion: 'v1',
        deviceUid: event.deviceUid,
        sensorDeviceId: resolvedSensor.id,
        containerId: resolvedContainerId,
        measuredAt: event.measuredAt.toISOString(),
        fillLevelPercent: event.fillLevelPercent,
        temperatureC: event.temperatureC,
        batteryPercent: event.batteryPercent,
        signalStrength: event.signalStrength,
        measurementQuality: event.measurementQuality,
        warningThreshold: thresholds.warningThreshold,
        criticalThreshold: thresholds.criticalThreshold,
        receivedAt: event.receivedAt.toISOString(),
        processedAt: processedAt.toISOString(),
      } as const;

      const [validatedEvent] = await tx
        .insert(validatedMeasurementEvents)
        .values({
          sourceEventId: event.sourceEventId,
          deviceUid: event.deviceUid,
          sensorDeviceId: resolvedSensor.id,
          containerId: resolvedContainerId,
          measuredAt: event.measuredAt,
          fillLevelPercent: event.fillLevelPercent,
          temperatureC: event.temperatureC,
          batteryPercent: event.batteryPercent,
          signalStrength: event.signalStrength,
          measurementQuality: event.measurementQuality,
          warningThreshold: thresholds.warningThreshold,
          criticalThreshold: thresholds.criticalThreshold,
          validationSummary: event.validationSummary,
          normalizedPayload,
        })
        .returning({
          id: validatedMeasurementEvents.id,
        });

      const [measurementRecord] = await tx
        .insert(measurements)
        .values({
          sensorDeviceId: resolvedSensor.id,
          containerId: resolvedContainerId,
          measuredAt: event.measuredAt,
          fillLevelPercent: event.fillLevelPercent,
          temperatureC: event.temperatureC,
          batteryPercent: event.batteryPercent,
          signalStrength: event.signalStrength,
          measurementQuality: event.measurementQuality,
          sourcePayload: {
            source: 'iot-processing-worker',
            sourceEventId: event.sourceEventId,
            validatedEventId: validatedEvent?.id ?? null,
            batchId: event.batchId,
            deviceUid: event.deviceUid,
            idempotencyKey: event.idempotencyKey,
          },
          receivedAt: event.receivedAt,
        })
        .returning({
          id: measurements.id,
        });

      if (
        resolvedContainerId &&
        thresholds.warningThreshold !== null &&
        thresholds.criticalThreshold !== null
      ) {
        await tx
          .update(containers)
          .set({
            fillLevelPercent: event.fillLevelPercent,
            status: this.resolveOperationalStatus(
              event.fillLevelPercent,
              thresholds.warningThreshold,
              thresholds.criticalThreshold,
            ),
            updatedAt: new Date(),
          })
          .where(eq(containers.id, resolvedContainerId));
      }

      await tx
        .update(ingestionEvents)
        .set({
          processingStatus: 'validated',
          sensorDeviceId: resolvedSensor.id,
          containerId: resolvedContainerId,
          normalizedPayload,
          rejectionReason: null,
          lastError: null,
          processedAt,
          processingLatencyMs: sql`extract(epoch from (${processedAt} - ${ingestionEvents.receivedAt})) * 1000`,
          updatedAt: processedAt,
        })
        .where(eq(ingestionEvents.id, event.sourceEventId));

      return {
        measurementId: measurementRecord?.id ?? null,
        validatedEventId: validatedEvent?.id ?? null,
      };
    });
  }

  async getHealthStats(): Promise<IngestionHealthStats> {
    const [
      pendingCount,
      retryCount,
      processingCount,
      failedCount,
      rejectedCount,
      validatedLastHour,
      oldestPending,
    ] = await Promise.all([
      this.countByStatus('pending'),
      this.countByStatus('retry'),
      this.countByStatus('processing'),
      this.countByStatus('failed'),
      this.countByStatus('rejected'),
      this.countValidatedLastHour(),
      this.getOldestPendingReceivedAt(),
    ]);

    return {
      pendingCount,
      retryCount,
      processingCount,
      failedCount,
      rejectedCount,
      validatedLastHour,
      oldestPendingAgeMs: oldestPending ? Math.max(0, Date.now() - oldestPending.getTime()) : null,
    };
  }

  private async countByStatus(status: string): Promise<number> {
    const [result] = await this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(ingestionEvents)
      .where(eq(ingestionEvents.processingStatus, status));

    return result?.value ?? 0;
  }

  private async countValidatedLastHour(): Promise<number> {
    const [result] = await this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(validatedMeasurementEvents)
      .where(sql`${validatedMeasurementEvents.emittedAt} > NOW() - INTERVAL '1 hour'`);

    return result?.value ?? 0;
  }

  private async getOldestPendingReceivedAt(): Promise<Date | null> {
    const [result] = await this.db
      .select({ value: sql<Date | null>`min(${ingestionEvents.receivedAt})` })
      .from(ingestionEvents)
      .where(
        or(
          eq(ingestionEvents.processingStatus, 'pending'),
          eq(ingestionEvents.processingStatus, 'retry'),
          eq(ingestionEvents.processingStatus, 'processing'),
        ),
      );

    return result?.value ?? null;
  }

  private async resolveSensorContext(
    tx: TransactionClient,
    event: NormalizedMeasurementEvent,
  ): Promise<SensorContext> {
    let sensorById: SensorContext | null = null;
    if (event.sensorDeviceId) {
      const [row] = await tx
        .select({
          id: sensorDevices.id,
          deviceUid: sensorDevices.deviceUid,
          containerId: sensorDevices.containerId,
        })
        .from(sensorDevices)
        .where(eq(sensorDevices.id, event.sensorDeviceId))
        .limit(1);

      if (!row) {
        throw new IngestionBusinessRuleError('Unknown sensorDeviceId provided.');
      }

      sensorById = row;
      if (row.deviceUid !== event.deviceUid) {
        throw new IngestionBusinessRuleError('sensorDeviceId does not match deviceUid.');
      }
    }

    let sensorByUid: SensorContext | null = null;
    const [existingByUid] = await tx
      .select({
        id: sensorDevices.id,
        deviceUid: sensorDevices.deviceUid,
        containerId: sensorDevices.containerId,
      })
      .from(sensorDevices)
      .where(eq(sensorDevices.deviceUid, event.deviceUid))
      .limit(1);
    sensorByUid = existingByUid ?? null;

    if (sensorById && sensorByUid && sensorById.id !== sensorByUid.id) {
      throw new IngestionBusinessRuleError('deviceUid resolves to a different sensorDeviceId.');
    }

    const resolvedSensor = sensorById ?? sensorByUid;
    const resolvedContainerId = resolvedSensor?.containerId ?? event.containerId ?? null;

    if (event.containerId && resolvedSensor?.containerId && event.containerId !== resolvedSensor.containerId) {
      throw new IngestionBusinessRuleError('containerId does not match the registered sensor container.');
    }

    if (resolvedSensor) {
      return {
        id: resolvedSensor.id,
        deviceUid: resolvedSensor.deviceUid,
        containerId: resolvedContainerId,
      };
    }

    const [createdSensor] = await tx
      .insert(sensorDevices)
      .values({
        containerId: resolvedContainerId,
        deviceUid: event.deviceUid,
        installStatus: 'active',
        batteryPercent: event.batteryPercent,
        lastSeenAt: event.measuredAt,
        installedAt: event.measuredAt,
      })
      .returning({
        id: sensorDevices.id,
        deviceUid: sensorDevices.deviceUid,
        containerId: sensorDevices.containerId,
      });

    if (!createdSensor) {
      throw new Error('Failed to create sensor device during ingestion processing.');
    }

    return {
      id: createdSensor.id,
      deviceUid: createdSensor.deviceUid,
      containerId: createdSensor.containerId ?? resolvedContainerId,
    };
  }

  private async loadThresholds(
    tx: TransactionClient,
    containerId: string,
  ): Promise<{ warningThreshold: number | null; criticalThreshold: number | null }> {
    const [row] = await tx
      .select({
        warningThreshold: containerTypes.defaultFillAlertPercent,
        criticalThreshold: containerTypes.defaultCriticalAlertPercent,
      })
      .from(containers)
      .leftJoin(containerTypes, eq(containers.containerTypeId, containerTypes.id))
      .where(eq(containers.id, containerId))
      .limit(1);

    return {
      warningThreshold: row?.warningThreshold ?? 80,
      criticalThreshold: row?.criticalThreshold ?? 95,
    };
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
