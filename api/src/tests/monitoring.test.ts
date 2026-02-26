import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MonitoringModule } from '../monitoring/monitoring.module.js';
import { MonitoringService } from '../monitoring/monitoring.service.js';

describe('Monitoring endpoints', () => {
  let app: INestApplication;
  let monitoringService: MonitoringService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MonitoringModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    monitoringService = app.get(MonitoringService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/errors accepts frontend errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/errors')
      .send({
        type: 'NETWORK',
        message: 'Failed to fetch',
        context: 'ticket-list',
        severity: 'high',
        status: 503,
        timestamp: '2026-02-01T10:00:00.000Z',
      })
      .expect(202);

    expect(response.body).toEqual({
      accepted: true,
      total: 1,
    });
  });

  it('POST /api/metrics/frontend accepts frontend metrics', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/metrics/frontend')
      .send({
        type: 'navigation',
        name: 'ttfb',
        value: 123.45,
        rating: 'good',
        timestamp: '2026-02-01T10:00:01.000Z',
      })
      .expect(202);

    expect(response.body).toEqual({
      accepted: true,
      total: 1,
    });
  });

  it('GET /api/metrics returns Prometheus metrics', async () => {
    monitoringService.setRealtimeDiagnostics({
      activeSseConnections: 2,
      activeWebSocketConnections: 1,
      counters: {
        sseConnected: 5,
        sseDisconnected: 3,
        wsConnected: 4,
        wsDisconnected: 2,
        wsAuthFailures: 1,
        emittedEvents: 42,
      },
      lastEventTimestamp: '2026-02-01T10:00:02.000Z',
      lastEventName: 'planning.dashboard.snapshot',
    });

    const response = await request(app.getHttpServer()).get('/api/metrics').expect(200);

    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('frontend_errors_total');
    expect(response.text).toContain('frontend_metrics_total');
    expect(response.text).toMatch(/frontend_errors_by_type_total\{type="NETWORK"\}\s+1/);
    expect(response.text).toMatch(/frontend_metrics_by_type_total\{type="navigation"\}\s+1/);
    expect(response.text).toContain('ecotrack_realtime_active_connections{transport="sse"} 2');
    expect(response.text).toContain('ecotrack_realtime_active_connections{transport="ws"} 1');
    expect(response.text).toContain('ecotrack_realtime_emitted_events_total 42');
    expect(response.text).toContain(
      'ecotrack_realtime_last_event_name_info{event="planning.dashboard.snapshot"} 1',
    );
  });
});
