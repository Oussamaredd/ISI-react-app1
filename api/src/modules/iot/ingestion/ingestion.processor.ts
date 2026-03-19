import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import {
  type ClaimedIngestionEvent,
  IngestionBusinessRuleError,
  IOT_PROCESSING_FUTURE_TOLERANCE_MS,
  IOT_PROCESSING_MAX_EVENT_AGE_MS,
  IOT_PROCESSING_MAX_RETRIES,
  type NormalizedMeasurementEvent,
} from './ingestion.contracts.js';
import { IngestionRepository } from './ingestion.repository.js';

const claimedEventSchema = z.object({
  sourceEventId: z.string().uuid(),
  batchId: z.string().uuid().nullable(),
  deviceUid: z.string().trim().min(1).max(120),
  sensorDeviceId: z.string().uuid().nullable(),
  containerId: z.string().uuid().nullable(),
  idempotencyKey: z.string().trim().min(1).max(120).nullable(),
  measuredAt: z.coerce.date(),
  fillLevelPercent: z.number().int().min(0).max(100),
  temperatureC: z.number().int().min(-50).max(100).nullable(),
  batteryPercent: z.number().int().min(0).max(100).nullable(),
  signalStrength: z.number().int().min(-120).max(0).nullable(),
  measurementQuality: z.enum(['valid', 'suspect', 'rejected']),
  receivedAt: z.coerce.date(),
  rawPayload: z.record(z.string(), z.unknown()),
});

@Injectable()
export class IngestionProcessorService {
  private readonly logger = new Logger(IngestionProcessorService.name);

  constructor(private readonly repository: IngestionRepository) {}

  async processStagedEvent(eventId: string) {
    const claimedEvent = await this.repository.claimEventForProcessing(eventId);
    if (!claimedEvent) {
      return { status: 'skipped' as const };
    }

    try {
      const normalizedEvent = this.normalizeEvent(claimedEvent);
      await this.repository.persistValidatedEvent(normalizedEvent);
      return { status: 'validated' as const };
    } catch (error) {
      if (error instanceof IngestionBusinessRuleError) {
        await this.repository.markRejected(claimedEvent.id, error.message, {
          sourceEventId: claimedEvent.id,
          rejectionReason: error.message,
        });
        this.logger.warn(`Rejected staged ingestion event ${claimedEvent.id}: ${error.message}`);
        return { status: 'rejected' as const };
      }

      const nextAttemptAt = this.computeNextAttemptAt(claimedEvent.attemptCount);
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';

      await this.repository.markRetryOrFailed(
        claimedEvent.id,
        claimedEvent.attemptCount,
        errorMessage,
        nextAttemptAt,
      );

      this.logger.error(`Failed processing staged ingestion event ${claimedEvent.id}: ${errorMessage}`);
      return {
        status: claimedEvent.attemptCount >= IOT_PROCESSING_MAX_RETRIES ? ('failed' as const) : ('retry' as const),
      };
    }
  }

  private normalizeEvent(event: ClaimedIngestionEvent): NormalizedMeasurementEvent {
    const parsed = claimedEventSchema.safeParse({
      sourceEventId: event.id,
      batchId: event.batchId,
      deviceUid: event.deviceUid,
      sensorDeviceId: event.sensorDeviceId,
      containerId: event.containerId,
      idempotencyKey: event.idempotencyKey,
      measuredAt: event.measuredAt,
      fillLevelPercent: event.fillLevelPercent,
      temperatureC: event.temperatureC,
      batteryPercent: event.batteryPercent,
      signalStrength: event.signalStrength,
      measurementQuality: event.measurementQuality.trim().toLowerCase(),
      receivedAt: event.receivedAt,
      rawPayload: event.rawPayload,
    });

    if (!parsed.success) {
      throw new IngestionBusinessRuleError(parsed.error.issues[0]?.message ?? 'Invalid staged measurement payload.');
    }

    const now = Date.now();
    const measuredAt = parsed.data.measuredAt.getTime();
    if (measuredAt > now + IOT_PROCESSING_FUTURE_TOLERANCE_MS) {
      throw new IngestionBusinessRuleError('Measurement timestamp is too far in the future.');
    }

    if (measuredAt < now - IOT_PROCESSING_MAX_EVENT_AGE_MS) {
      throw new IngestionBusinessRuleError('Measurement timestamp is too old to process.');
    }

    if (parsed.data.measurementQuality === 'rejected') {
      throw new IngestionBusinessRuleError('Rejected measurements are not persisted by the processing worker.');
    }

    return {
      sourceEventId: parsed.data.sourceEventId,
      batchId: parsed.data.batchId,
      deviceUid: parsed.data.deviceUid,
      sensorDeviceId: parsed.data.sensorDeviceId,
      containerId: parsed.data.containerId,
      measuredAt: parsed.data.measuredAt,
      fillLevelPercent: parsed.data.fillLevelPercent,
      temperatureC: parsed.data.temperatureC,
      batteryPercent: parsed.data.batteryPercent,
      signalStrength: parsed.data.signalStrength,
      measurementQuality: parsed.data.measurementQuality,
      idempotencyKey: parsed.data.idempotencyKey,
      receivedAt: parsed.data.receivedAt,
      rawPayload: parsed.data.rawPayload,
      validationSummary: {
        schemaValidation: 'passed',
        businessRules: ['future_tolerance', 'max_event_age', 'quality_gate'],
        normalizedAt: new Date().toISOString(),
      },
    };
  }

  private computeNextAttemptAt(attemptCount: number) {
    const retryIndex = Math.max(0, attemptCount - 1);
    const backoffMs = Math.min(30_000, 1_000 * 2 ** retryIndex);
    return new Date(Date.now() + backoffMs);
  }
}
