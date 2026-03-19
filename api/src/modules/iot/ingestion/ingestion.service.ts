import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEFAULT_IOT_CONFIG, type IotIngestionConfig } from '../../../config/iot-ingestion.js';

import type { IngestMeasurementDto } from './dto/ingest-measurement.dto.js';
import type {
  BatchIngestResponseDto,
  IngestResponseDto,
  IngestionHealthDto,
} from './dto/ingestion-response.dto.js';
import {
  IOT_PROCESSING_RECOVERY_INTERVAL_MS,
  IOT_PROCESSING_STALE_LEASE_WINDOW_MS,
  type StagedMeasurementInput,
} from './ingestion.contracts.js';
import { IngestionProcessorService } from './ingestion.processor.js';
import { InMemoryIngestionQueue, type MeasurementJob } from './ingestion.queue.js';
import { IngestionRepository } from './ingestion.repository.js';

@Injectable()
export class IngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionService.name);
  private readonly config: IotIngestionConfig;
  private readonly enqueuedEventIds = new Set<string>();
  private recoveryTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(IngestionRepository) private readonly repository: IngestionRepository,
    @Inject(InMemoryIngestionQueue) private readonly queue: InMemoryIngestionQueue,
    @Inject(IngestionProcessorService)
    private readonly processorService: IngestionProcessorService,
  ) {
    this.config = this.configService.get<IotIngestionConfig>('iotIngestion') ?? DEFAULT_IOT_CONFIG;
  }

  onModuleInit() {
    if (!this.config.IOT_INGESTION_ENABLED) {
      this.logger.warn('IoT ingestion is disabled');
      return;
    }

    this.queue.startProcessor(this.processor.bind(this), {
      concurrency: this.config.IOT_QUEUE_CONCURRENCY,
      maxBatchMeasurements: this.config.IOT_QUEUE_BATCH_SIZE,
    });

    this.recoveryTimer = setInterval(() => {
      void this.schedulePendingEventRecovery();
    }, IOT_PROCESSING_RECOVERY_INTERVAL_MS);

    this.isInitialized = true;
    this.logger.log('IoT ingestion service initialized');
    void this.schedulePendingEventRecovery();
  }

  onModuleDestroy() {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    this.queue.stopProcessor();
    this.enqueuedEventIds.clear();
    this.logger.log('IoT ingestion service stopped');
  }

  async ingestSingle(dto: IngestMeasurementDto): Promise<IngestResponseDto> {
    this.ensureInitialized();
    await this.checkBackpressure();

    const staged = await this.repository.stageMeasurements([this.toStagedMeasurement(dto, null)]);
    await this.enqueueStagedEvents(staged);

    return {
      accepted: 1,
      processing: true,
      messageId: staged[0]?.id ?? randomUUID(),
    };
  }

  async ingestBatch(dtos: IngestMeasurementDto[]): Promise<BatchIngestResponseDto> {
    this.ensureInitialized();

    if (dtos.length === 0) {
      throw new BadRequestException('At least one measurement is required.');
    }

    if (dtos.length > this.config.IOT_MAX_BATCH_SIZE) {
      throw new BadRequestException(
        `Batch size exceeds maximum of ${this.config.IOT_MAX_BATCH_SIZE}.`,
      );
    }

    await this.checkBackpressure();

    const batchId = randomUUID();
    const staged = await this.repository.stageMeasurements(
      dtos.map((dto) => this.toStagedMeasurement(dto, batchId)),
    );

    await this.enqueueStagedEvents(staged);

    return {
      accepted: dtos.length,
      processing: true,
      batchId,
    };
  }

  async getHealth(): Promise<IngestionHealthDto> {
    if (!this.config.IOT_INGESTION_ENABLED) {
      return {
        status: 'unhealthy',
        queueEnabled: false,
        backpressureActive: false,
        pendingCount: 0,
        processedLastHour: 0,
        processing: {
          retryCount: 0,
          processingCount: 0,
          failedCount: 0,
          rejectedCount: 0,
          oldestPendingAgeMs: null,
        },
      };
    }

    const stats = await this.repository.getHealthStats();
    const pendingCount = stats.pendingCount + stats.retryCount + stats.processingCount;
    const backpressureActive = pendingCount >= this.config.IOT_BACKPRESSURE_THRESHOLD;

    if (backpressureActive && !this.queue.isPaused()) {
      this.queue.pause();
    } else if (!backpressureActive && this.queue.isPaused()) {
      this.queue.resume();
    }

    return {
      status:
        backpressureActive || stats.retryCount > 0 || stats.failedCount > 0 ? 'degraded' : 'healthy',
      queueEnabled: true,
      backpressureActive,
      pendingCount,
      processedLastHour: stats.validatedLastHour,
      processing: {
        retryCount: stats.retryCount,
        processingCount: stats.processingCount,
        failedCount: stats.failedCount,
        rejectedCount: stats.rejectedCount,
        oldestPendingAgeMs: stats.oldestPendingAgeMs,
      },
    };
  }

  private ensureInitialized() {
    if (!this.isInitialized) {
      throw new ServiceUnavailableException('IoT ingestion is not available');
    }
  }

  private async checkBackpressure(): Promise<void> {
    const stats = await this.repository.getHealthStats();
    const pendingCount = stats.pendingCount + stats.retryCount + stats.processingCount;

    if (pendingCount >= this.config.IOT_BACKPRESSURE_THRESHOLD) {
      if (!this.queue.isPaused()) {
        this.queue.pause();
      }

      throw new ServiceUnavailableException(
        'Service temporarily unavailable due to high load. Please retry later.',
      );
    }

    if (this.queue.isPaused()) {
      this.queue.resume();
    }
  }

  private async enqueueStagedEvents(stagedEvents: Array<{ id: string; newlyStaged: boolean }>) {
    const newEventIds = stagedEvents
      .filter((event) => event.newlyStaged)
      .map((event) => event.id)
      .filter((eventId) => !this.enqueuedEventIds.has(eventId));

    if (newEventIds.length === 0) {
      return;
    }

    newEventIds.forEach((eventId) => {
      this.enqueuedEventIds.add(eventId);
    });

    try {
      await this.queue.enqueue(newEventIds);
    } catch (error) {
      newEventIds.forEach((eventId) => {
        this.enqueuedEventIds.delete(eventId);
      });
      throw error;
    }
  }

  private async schedulePendingEventRecovery() {
    if (!this.isInitialized || this.queue.isPaused()) {
      return;
    }

    try {
      await this.repository.recoverStuckProcessing(
        new Date(Date.now() - IOT_PROCESSING_STALE_LEASE_WINDOW_MS),
      );

      const runnableEventIds = await this.repository.listRunnableEventIds(
        this.config.IOT_QUEUE_CONCURRENCY * this.config.IOT_QUEUE_BATCH_SIZE,
      );

      const eventIdsToQueue = runnableEventIds.filter((eventId) => !this.enqueuedEventIds.has(eventId));
      if (eventIdsToQueue.length === 0) {
        return;
      }

      eventIdsToQueue.forEach((eventId) => {
        this.enqueuedEventIds.add(eventId);
      });

      try {
        await this.queue.enqueue(eventIdsToQueue);
      } catch (error) {
        eventIdsToQueue.forEach((eventId) => {
          this.enqueuedEventIds.delete(eventId);
        });
        this.logger.error(
          `Failed to enqueue staged ingestion events: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to recover pending ingestion events: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private async processor(jobs: MeasurementJob[]): Promise<void> {
    const eventIds = jobs.flatMap((job) => job.eventIds);

    for (const eventId of eventIds) {
      try {
        await this.processorService.processStagedEvent(eventId);
      } finally {
        this.enqueuedEventIds.delete(eventId);
      }
    }
  }

  private toStagedMeasurement(dto: IngestMeasurementDto, batchId: string | null): StagedMeasurementInput {
    const receivedAt = new Date();
    const normalizedDeviceUid = dto.deviceUid.trim();
    const normalizedMeasurementQuality = dto.measurementQuality?.trim().toLowerCase() ?? 'valid';
    const normalizedIdempotencyKey = dto.idempotencyKey?.trim() || null;

    return {
      batchId,
      sensorDeviceId: dto.sensorDeviceId ?? null,
      containerId: dto.containerId ?? null,
      deviceUid: normalizedDeviceUid,
      measuredAt: new Date(dto.measuredAt),
      fillLevelPercent: dto.fillLevelPercent,
      temperatureC: dto.temperatureC ?? null,
      batteryPercent: dto.batteryPercent ?? null,
      signalStrength: dto.signalStrength ?? null,
      measurementQuality: normalizedMeasurementQuality,
      idempotencyKey: normalizedIdempotencyKey,
      receivedAt,
      rawPayload: {
        source: 'iot-ingestion-api',
        schemaVersion: 'v1',
        batchId,
        measurement: {
          sensorDeviceId: dto.sensorDeviceId ?? null,
          containerId: dto.containerId ?? null,
          deviceUid: normalizedDeviceUid,
          measuredAt: dto.measuredAt,
          fillLevelPercent: dto.fillLevelPercent,
          temperatureC: dto.temperatureC ?? null,
          batteryPercent: dto.batteryPercent ?? null,
          signalStrength: dto.signalStrength ?? null,
          measurementQuality: normalizedMeasurementQuality,
          idempotencyKey: normalizedIdempotencyKey,
        },
      },
    };
  }
}
