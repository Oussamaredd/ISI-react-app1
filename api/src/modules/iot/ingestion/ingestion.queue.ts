import { randomUUID } from 'node:crypto';

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export interface MeasurementJob {
  id: string;
  eventIds: string[];
  createdAt: Date;
}

export interface IngestionQueue {
  enqueue(eventIds: string[]): Promise<string>;
  getPendingCount(): Promise<number>;
  getProcessedLastHour(): number;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  startProcessor(
    handler: (jobs: MeasurementJob[]) => Promise<void>,
    options?: {
      concurrency?: number;
      maxBatchMeasurements?: number;
    },
  ): void;
  stopProcessor(): void;
}

@Injectable()
export class InMemoryIngestionQueue implements IngestionQueue, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InMemoryIngestionQueue.name);
  private readonly queue: MeasurementJob[] = [];
  private readonly processedEvents: Array<{ processedAt: number; count: number }> = [];

  private pendingEvents = 0;
  private activeWorkers = 0;
  private paused = false;
  private stopped = true;
  private drainScheduled = false;
  private concurrency = 1;
  private maxBatchMeasurements = 500;
  private processorHandler: ((jobs: MeasurementJob[]) => Promise<void>) | null = null;

  onModuleInit() {
    this.logger.log('In-memory ingestion queue initialized');
  }

  onModuleDestroy() {
    this.stopProcessor();
    this.logger.log('In-memory ingestion queue stopped');
  }

  async enqueue(eventIds: string[]): Promise<string> {
    if (this.paused) {
      throw new Error('Queue is paused due to backpressure');
    }

    const job: MeasurementJob = {
      id: randomUUID(),
      eventIds,
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.pendingEvents += eventIds.length;
    this.scheduleDrain();

    return job.id;
  }

  async getPendingCount(): Promise<number> {
    return this.pendingEvents;
  }

  getProcessedLastHour(): number {
    this.pruneProcessedEvents();
    return this.processedEvents.reduce((total, event) => total + event.count, 0);
  }

  pause(): void {
    this.paused = true;
    this.logger.warn('Queue paused due to backpressure');
  }

  resume(): void {
    this.paused = false;
    this.logger.log('Queue resumed');
    this.scheduleDrain();
  }

  isPaused(): boolean {
    return this.paused;
  }

  startProcessor(
    handler: (jobs: MeasurementJob[]) => Promise<void>,
    options?: {
      concurrency?: number;
      maxBatchMeasurements?: number;
    },
  ): void {
    this.processorHandler = handler;
    this.stopped = false;
    this.concurrency = Math.max(1, Math.trunc(options?.concurrency ?? 1));
    this.maxBatchMeasurements = Math.max(1, Math.trunc(options?.maxBatchMeasurements ?? 500));
    this.logger.log('Queue processor started');
    this.scheduleDrain();
  }

  stopProcessor(): void {
    this.stopped = true;
    this.activeWorkers = 0;
    this.drainScheduled = false;
    this.processorHandler = null;
    this.logger.log('Queue processor stopped');
  }

  private scheduleDrain(): void {
    if (this.drainScheduled || this.stopped) {
      return;
    }

    this.drainScheduled = true;
    setImmediate(() => {
      this.drainScheduled = false;
      void this.drainQueue();
    });
  }

  private async drainQueue(): Promise<void> {
    while (
      !this.stopped &&
      !this.paused &&
      this.processorHandler &&
      this.activeWorkers < this.concurrency &&
      this.queue.length > 0
    ) {
      const batch = this.dequeueBatch();
      this.activeWorkers += 1;
      void this.processBatch(batch.jobs, batch.measurementCount);
    }
  }

  private dequeueBatch(): { jobs: MeasurementJob[]; measurementCount: number } {
    const jobs: MeasurementJob[] = [];
    let eventCount = 0;

    while (this.queue.length > 0) {
      const nextJob = this.queue[0];
      const nextEventCount = nextJob.eventIds.length;

      if (jobs.length > 0 && eventCount + nextEventCount > this.maxBatchMeasurements) {
        break;
      }

      jobs.push(this.queue.shift()!);
      eventCount += nextEventCount;
    }

    this.pendingEvents = Math.max(0, this.pendingEvents - eventCount);

    return {
      jobs,
      measurementCount: eventCount,
    };
  }

  private async processBatch(jobs: MeasurementJob[], measurementCount: number): Promise<void> {
    try {
      await this.processorHandler?.(jobs);
      this.recordProcessed(measurementCount);
    } catch (error) {
      this.pendingEvents += measurementCount;
      this.queue.unshift(...jobs);
      this.logger.error(
        `Failed to process batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
      this.scheduleDrain();
    }
  }

  private recordProcessed(count: number): void {
    if (count <= 0) {
      return;
    }

    this.pruneProcessedEvents();
    this.processedEvents.push({
      processedAt: Date.now(),
      count,
    });
  }

  private pruneProcessedEvents(): void {
    const threshold = Date.now() - 60 * 60 * 1000;

    while (this.processedEvents.length > 0 && this.processedEvents[0].processedAt < threshold) {
      this.processedEvents.shift();
    }
  }
}
