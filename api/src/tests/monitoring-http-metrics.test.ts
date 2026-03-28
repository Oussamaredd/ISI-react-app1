import {
  Controller,
  Get,
  InternalServerErrorException,
  type INestApplication,
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { HttpMetricsMiddleware } from '../modules/monitoring/http-metrics.middleware.js';
import { MonitoringController } from '../modules/monitoring/monitoring.controller.js';
import { MonitoringRepository } from '../modules/monitoring/monitoring.repository.js';
import { MonitoringService } from '../modules/monitoring/monitoring.service.js';
import { CacheService } from '../modules/performance/cache.service.js';

@Controller('tickets')
class TicketMetricsTestController {
  @Get(':ticketId')
  getTicket() {
    return { ok: true };
  }
}

@Controller('fail')
class FailingMetricsTestController {
  @Get()
  fail() {
    throw new InternalServerErrorException('boom');
  }
}

@Module({
  controllers: [MonitoringController, TicketMetricsTestController, FailingMetricsTestController],
  providers: [
    MonitoringService,
    HttpMetricsMiddleware,
    {
      provide: ConfigService,
      useValue: {
        get: (key: string) => {
          if (key === 'iotIngestion.IOT_BACKPRESSURE_THRESHOLD') {
            return 100000;
          }

          if (key === 'iotIngestion.IOT_INGESTION_SHARD_COUNT') {
            return 12;
          }

          if (key === 'iotIngestion.IOT_VALIDATED_CONSUMER_SHARD_COUNT') {
            return 12;
          }

          if (key === 'cache.enabled') {
            return true;
          }

          if (key === 'cache.prefix') {
            return 'ecotrack';
          }

          if (key === 'cache.maxMemoryEntries') {
            return 100;
          }

          if (key === 'cache.defaultTtlSeconds') {
            return 60;
          }

          if (key === 'cache.dashboardTtlSeconds') {
            return 30;
          }

          if (key === 'cache.planningTtlSeconds') {
            return 20;
          }

          if (key === 'cache.analyticsTtlSeconds') {
            return 60;
          }

          if (key === 'cache.citizenTtlSeconds') {
            return 30;
          }

          return undefined;
        },
      },
    },
    {
      provide: MonitoringRepository,
      useValue: {
        getOperationalMetricsSnapshot: async () => ({
          ingestionByStatus: {
            pending: 0,
            retry: 0,
            processing: 0,
            failed: 0,
            rejected: 0,
            validated: 1,
          },
          deliveryByStatus: {
            pending: 0,
            retry: 0,
            processing: 0,
            failed: 0,
            completed: 1,
          },
          ingestionOldestPendingAgeMs: null,
          deliveryOldestPendingAgeMs: null,
          validatedLastHour: 1,
          completedLastHour: 1,
          citizenReportsByStatus: [{ status: 'submitted', count: 1 }],
          citizenReportsCreatedLastHour: 1,
          toursByStatus: [{ status: 'planned', count: 1 }],
          toursCompletedLastHour: 0,
          challengesByStatus: [{ status: 'active', count: 1 }],
          challengeParticipationsByStatus: [{ status: 'enrolled', count: 1 }],
          challengeCompletionsLastHour: 0,
          gamificationProfilesTotal: 1,
          gamificationPointsTotal: 50,
          connectorExportsByStatus: {
            pending: 0,
            retry: 0,
            processing: 0,
            failed: 0,
            completed: 1,
          },
          connectorOldestPendingAgeMs: null,
          connectorLagByConnector: [],
          criticalContainers: 0,
          attentionContainers: 0,
          maxContainerFillLevel: 50,
          openAlertsBySeverity: [],
          ingestionBacklogByShard: [],
          deliveryBacklogByShard: [],
          deliveryLagByConsumer: [],
          recentAuditActions: [],
        }),
      },
    },
    {
      provide: CacheService,
      useValue: {
        getMetricsSnapshot: () => ({
          enabled: true,
          invalidationsTotal: 0,
          maxMemoryEntries: 100,
          memoryEntries: 2,
          memoryEvictionsTotal: 0,
          namespaceCount: 1,
          readsByTier: {
            memory: 3,
            redis: 0,
            source: 1,
          },
          redisConnected: false,
          redisErrorsTotal: 0,
          writesByTier: {
            memory: 2,
            redis: 0,
          },
        }),
      },
    },
  ],
})
class TestMonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}

describe('HTTP metrics middleware', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestMonitoringModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('records normalized request counters, errors, and runtime gauges', async () => {
    await request(app.getHttpServer()).get('/api/tickets/123').expect(200);
    await request(app.getHttpServer())
      .get('/api/tickets/550e8400-e29b-41d4-a716-446655440000')
      .expect(200);
    await request(app.getHttpServer()).get('/api/fail').expect(500);

    const response = await request(app.getHttpServer()).get('/api/metrics').expect(200);

    expect(response.text).toContain(
      'ecotrack_http_requests_total{method="GET",path="/api/tickets/:id",status_class="2xx"} 2',
    );
    expect(response.text).toContain(
      'ecotrack_http_request_errors_total{method="GET",path="/api/fail",status_class="5xx"} 1',
    );
    expect(response.text).toContain(
      'ecotrack_http_request_status_total{method="GET",path="/api/fail",status_code="500"} 1',
    );
    expect(response.text).toContain(
      'ecotrack_http_request_duration_ms_bucket{method="GET",path="/api/tickets/:id",le="+Inf"} 2',
    );
    expect(response.text).toContain(
      'ecotrack_http_request_duration_ms_count{method="GET",path="/api/tickets/:id"} 2',
    );
    expect(response.text).toContain(
      'ecotrack_security_signals_total{signal="server_error",severity="critical"} 1',
    );
    expect(response.text).toContain(
      'ecotrack_http_request_duration_ms_sum{method="GET",path="/api/tickets/:id"} ',
    );
    expect(response.text).toContain('ecotrack_process_resident_memory_bytes ');
    expect(response.text).toContain('ecotrack_process_heap_used_bytes ');
    expect(response.text).not.toContain('path="/api/metrics"');
  });
});
