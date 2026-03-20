import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEFAULT_IOT_CONFIG, type IotIngestionConfig } from '../../../config/iot-ingestion.js';

import {
  VALIDATED_EVENT_CONSUMER_RECOVERY_INTERVAL_MS,
  VALIDATED_EVENT_CONSUMER_STALE_LEASE_WINDOW_MS,
  VALIDATED_EVENT_TIMESERIES_CONSUMER,
  type ValidatedEventConsumerHealthStats,
} from './validated-consumer.contracts.js';
import { ValidatedConsumerProcessorService } from './validated-consumer.processor.js';
import { InMemoryValidatedDeliveryQueue, type ValidatedDeliveryJob } from './validated-consumer.queue.js';
import { ValidatedConsumerRepository } from './validated-consumer.repository.js';

@Injectable()
export class ValidatedConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ValidatedConsumerService.name);
  private readonly config: IotIngestionConfig;
  private readonly enqueuedDeliveryIds = new Set<string>();
  private recoveryTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    private readonly repository: ValidatedConsumerRepository,
    private readonly queue: InMemoryValidatedDeliveryQueue,
    private readonly processor: ValidatedConsumerProcessorService,
  ) {
    this.config = this.configService.get<IotIngestionConfig>('iotIngestion') ?? DEFAULT_IOT_CONFIG;
  }

  onModuleInit() {
    if (!this.config.IOT_INGESTION_ENABLED) {
      return;
    }

    this.queue.startProcessor(this.processJobs.bind(this), {
      concurrency: this.config.IOT_VALIDATED_CONSUMER_CONCURRENCY,
      maxBatchDeliveries: this.config.IOT_VALIDATED_CONSUMER_BATCH_SIZE,
    });

    this.recoveryTimer = setInterval(() => {
      void this.schedulePendingRecovery();
    }, VALIDATED_EVENT_CONSUMER_RECOVERY_INTERVAL_MS);

    this.initialized = true;
    void this.schedulePendingRecovery();
  }

  onModuleDestroy() {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    this.queue.stopProcessor();
    this.enqueuedDeliveryIds.clear();
    this.initialized = false;
  }

  async enqueueValidatedDeliveryIds(deliveryIds: string[]) {
    if (!this.initialized || deliveryIds.length === 0) {
      return;
    }

    const newDeliveryIds = deliveryIds.filter((deliveryId) => !this.enqueuedDeliveryIds.has(deliveryId));
    if (newDeliveryIds.length === 0) {
      return;
    }

    newDeliveryIds.forEach((deliveryId) => {
      this.enqueuedDeliveryIds.add(deliveryId);
    });

    try {
      await this.queue.enqueue(newDeliveryIds);
    } catch (error) {
      newDeliveryIds.forEach((deliveryId) => {
        this.enqueuedDeliveryIds.delete(deliveryId);
      });
      throw error;
    }
  }

  async getHealthSnapshot(): Promise<ValidatedEventConsumerHealthStats> {
    return this.repository.getHealthStats(VALIDATED_EVENT_TIMESERIES_CONSUMER);
  }

  private async schedulePendingRecovery() {
    if (!this.initialized) {
      return;
    }

    try {
      await this.repository.recoverStuckProcessing(
        VALIDATED_EVENT_TIMESERIES_CONSUMER,
        new Date(Date.now() - VALIDATED_EVENT_CONSUMER_STALE_LEASE_WINDOW_MS),
      );

      const runnableDeliveryIds = await this.repository.listRunnableDeliveryIds(
        VALIDATED_EVENT_TIMESERIES_CONSUMER,
        this.config.IOT_VALIDATED_CONSUMER_CONCURRENCY * this.config.IOT_VALIDATED_CONSUMER_BATCH_SIZE,
      );

      const deliveryIdsToQueue = runnableDeliveryIds.filter(
        (deliveryId) => !this.enqueuedDeliveryIds.has(deliveryId),
      );
      if (deliveryIdsToQueue.length === 0) {
        return;
      }

      deliveryIdsToQueue.forEach((deliveryId) => {
        this.enqueuedDeliveryIds.add(deliveryId);
      });

      try {
        await this.queue.enqueue(deliveryIdsToQueue);
      } catch (error) {
        deliveryIdsToQueue.forEach((deliveryId) => {
          this.enqueuedDeliveryIds.delete(deliveryId);
        });
        this.logger.error(
          `Failed to enqueue validated-event deliveries: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to recover validated-event deliveries: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private async processJobs(jobs: ValidatedDeliveryJob[]) {
    const deliveryIds = jobs.flatMap((job) => job.deliveryIds);

    for (const deliveryId of deliveryIds) {
      try {
        await this.processor.processDelivery(deliveryId, VALIDATED_EVENT_TIMESERIES_CONSUMER);
      } finally {
        this.enqueuedDeliveryIds.delete(deliveryId);
      }
    }
  }
}
