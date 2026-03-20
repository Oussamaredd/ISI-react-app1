import { randomUUID } from 'node:crypto';

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export interface ValidatedDeliveryJob {
  id: string;
  deliveryIds: string[];
  createdAt: Date;
}

@Injectable()
export class InMemoryValidatedDeliveryQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InMemoryValidatedDeliveryQueue.name);
  private readonly queue: ValidatedDeliveryJob[] = [];

  private pendingDeliveries = 0;
  private activeWorkers = 0;
  private stopped = true;
  private drainScheduled = false;
  private concurrency = 1;
  private maxBatchDeliveries = 100;
  private processorHandler: ((jobs: ValidatedDeliveryJob[]) => Promise<void>) | null = null;

  onModuleInit() {
    this.logger.log('Validated-delivery queue initialized');
  }

  onModuleDestroy() {
    this.stopProcessor();
    this.logger.log('Validated-delivery queue stopped');
  }

  async enqueue(deliveryIds: string[]) {
    const job: ValidatedDeliveryJob = {
      id: randomUUID(),
      deliveryIds,
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.pendingDeliveries += deliveryIds.length;
    this.scheduleDrain();

    return job.id;
  }

  startProcessor(
    handler: (jobs: ValidatedDeliveryJob[]) => Promise<void>,
    options?: { concurrency?: number; maxBatchDeliveries?: number },
  ) {
    this.processorHandler = handler;
    this.stopped = false;
    this.concurrency = Math.max(1, Math.trunc(options?.concurrency ?? 1));
    this.maxBatchDeliveries = Math.max(1, Math.trunc(options?.maxBatchDeliveries ?? 100));
    this.logger.log('Validated-delivery queue processor started');
    this.scheduleDrain();
  }

  stopProcessor() {
    this.stopped = true;
    this.activeWorkers = 0;
    this.drainScheduled = false;
    this.processorHandler = null;
    this.logger.log('Validated-delivery queue processor stopped');
  }

  private scheduleDrain() {
    if (this.drainScheduled || this.stopped) {
      return;
    }

    this.drainScheduled = true;
    setImmediate(() => {
      this.drainScheduled = false;
      void this.drainQueue();
    });
  }

  private async drainQueue() {
    while (
      !this.stopped &&
      this.processorHandler &&
      this.activeWorkers < this.concurrency &&
      this.queue.length > 0
    ) {
      const batch = this.dequeueBatch();
      this.activeWorkers += 1;
      void this.processBatch(batch.jobs, batch.deliveryCount);
    }
  }

  private dequeueBatch(): { jobs: ValidatedDeliveryJob[]; deliveryCount: number } {
    const jobs: ValidatedDeliveryJob[] = [];
    let deliveryCount = 0;

    while (this.queue.length > 0) {
      const nextJob = this.queue[0];
      const nextDeliveryCount = nextJob.deliveryIds.length;

      if (jobs.length > 0 && deliveryCount + nextDeliveryCount > this.maxBatchDeliveries) {
        break;
      }

      jobs.push(this.queue.shift()!);
      deliveryCount += nextDeliveryCount;
    }

    this.pendingDeliveries = Math.max(0, this.pendingDeliveries - deliveryCount);

    return {
      jobs,
      deliveryCount,
    };
  }

  private async processBatch(jobs: ValidatedDeliveryJob[], deliveryCount: number) {
    try {
      await this.processorHandler?.(jobs);
    } catch (error) {
      this.pendingDeliveries += deliveryCount;
      this.queue.unshift(...jobs);
      this.logger.error(
        `Failed to process validated-delivery batch: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
      this.scheduleDrain();
    }
  }
}
