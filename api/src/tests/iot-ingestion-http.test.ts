import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IngestionController } from '../modules/iot/ingestion/ingestion.controller.js';
import { IngestionProcessorService } from '../modules/iot/ingestion/ingestion.processor.js';
import { InMemoryIngestionQueue } from '../modules/iot/ingestion/ingestion.queue.js';
import { IngestionRepository } from '../modules/iot/ingestion/ingestion.repository.js';
import { IngestionService } from '../modules/iot/ingestion/ingestion.service.js';

vi.mock('../config/iot-ingestion.js', () => ({
  DEFAULT_IOT_CONFIG: {
    IOT_INGESTION_ENABLED: true,
    IOT_MQTT_ENABLED: false,
    IOT_MQTT_TOPIC: 'ecotrack/measurements',
    IOT_QUEUE_CONCURRENCY: 4,
    IOT_QUEUE_BATCH_SIZE: 25,
    IOT_BACKPRESSURE_THRESHOLD: 100000,
    IOT_MAX_BATCH_SIZE: 1000,
    IOT_VALIDATED_CONSUMER_CONCURRENCY: 2,
    IOT_VALIDATED_CONSUMER_BATCH_SIZE: 10,
  },
}));

describe('IngestionController (HTTP)', () => {
  let app: INestApplication;
  let service: IngestionService;

  const iotConfig = {
    IOT_INGESTION_ENABLED: true,
    IOT_MQTT_ENABLED: false,
    IOT_MQTT_TOPIC: 'ecotrack/measurements',
    IOT_QUEUE_CONCURRENCY: 4,
    IOT_QUEUE_BATCH_SIZE: 25,
    IOT_BACKPRESSURE_THRESHOLD: 100000,
    IOT_MAX_BATCH_SIZE: 1000,
    IOT_VALIDATED_CONSUMER_CONCURRENCY: 2,
    IOT_VALIDATED_CONSUMER_BATCH_SIZE: 10,
  };

  beforeEach(async () => {
    const repository = {
      stageMeasurements: vi.fn().mockResolvedValue([
        {
          id: 'event-1',
          deviceUid: 'sensor-001',
          idempotencyKey: null,
          newlyStaged: true,
        },
      ]),
      getHealthStats: vi.fn().mockResolvedValue({
        pendingCount: 0,
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        rejectedCount: 0,
        validatedLastHour: 1,
        oldestPendingAgeMs: null,
      }),
      recoverStuckProcessing: vi.fn().mockResolvedValue(undefined),
      listRunnableEventIds: vi.fn().mockResolvedValue([]),
    } as unknown as IngestionRepository;

    const queue = new InMemoryIngestionQueue();
    const processorService = {
      processStagedEvent: vi.fn().mockResolvedValue({ status: 'validated' }),
    } as unknown as IngestionProcessorService;
    const validatedConsumerService = {
      getHealthSnapshot: vi.fn().mockResolvedValue({
        pendingCount: 0,
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        completedLastHour: 0,
        oldestPendingAgeMs: null,
      }),
    };

    service = new IngestionService(
      {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'iotIngestion') {
            return iotConfig;
          }

          return undefined;
        }),
      } as any,
      repository,
      queue,
      processorService,
      validatedConsumerService as any,
    );

    service.onModuleInit();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [{ provide: IngestionService, useValue: service }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    service.onModuleDestroy();
    await app.close();
  });

  it('POST /iot/v1/measurements returns 202 with a staged event id', async () => {
    const response = await request(app.getHttpServer())
      .post('/iot/v1/measurements')
      .send({
        deviceUid: 'sensor-001',
        measuredAt: new Date().toISOString(),
        fillLevelPercent: 50,
      })
      .expect(202);

    expect(response.body).toEqual({
      accepted: 1,
      processing: true,
      messageId: 'event-1',
    });
  });

  it('POST /iot/v1/measurements/batch keeps 202 semantics for batched ingestion', async () => {
    const response = await request(app.getHttpServer())
      .post('/iot/v1/measurements/batch')
      .send({
        measurements: [
          { deviceUid: 'sensor-001', measuredAt: new Date().toISOString(), fillLevelPercent: 50 },
          { deviceUid: 'sensor-002', measuredAt: new Date().toISOString(), fillLevelPercent: 60 },
        ],
      })
      .expect(202);

    expect(response.body.accepted).toBe(2);
    expect(response.body.processing).toBe(true);
    expect(response.body.batchId).toBeTruthy();
  });

  it('GET /iot/v1/health exposes processing counters', async () => {
    const response = await request(app.getHttpServer()).get('/iot/v1/health').expect(200);

    expect(response.body).toEqual({
      status: 'healthy',
      queueEnabled: true,
      backpressureActive: false,
      pendingCount: 0,
      processedLastHour: 1,
      processing: {
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        rejectedCount: 0,
        oldestPendingAgeMs: null,
      },
      consumer: {
        retryCount: 0,
        processingCount: 0,
        failedCount: 0,
        pendingCount: 0,
        processedLastHour: 0,
        oldestPendingAgeMs: null,
      },
    });
  });
});
