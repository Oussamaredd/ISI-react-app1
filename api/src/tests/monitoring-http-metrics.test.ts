import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MonitoringModule } from '../modules/monitoring/monitoring.module.js';

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

describe('HTTP metrics middleware', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MonitoringModule],
      controllers: [TicketMetricsTestController, FailingMetricsTestController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
      'ecotrack_http_request_duration_ms_bucket{method="GET",path="/api/tickets/:id",le="+Inf"} 2',
    );
    expect(response.text).toContain(
      'ecotrack_http_request_duration_ms_count{method="GET",path="/api/tickets/:id"} 2',
    );
    expect(response.text).toContain(
      'ecotrack_http_request_duration_ms_sum{method="GET",path="/api/tickets/:id"} ',
    );
    expect(response.text).toContain('ecotrack_process_resident_memory_bytes ');
    expect(response.text).toContain('ecotrack_process_heap_used_bytes ');
    expect(response.text).not.toContain('path="/api/metrics"');
  });
});
