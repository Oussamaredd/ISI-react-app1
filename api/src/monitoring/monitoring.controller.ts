import { Body, Controller, Get, Header, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';

import { MonitoringService } from './monitoring.service.js';

@Controller()
export class MonitoringController {
  constructor(
    @Inject(MonitoringService)
    private readonly monitoringService: MonitoringService,
  ) {}

  @Post('errors')
  @HttpCode(HttpStatus.ACCEPTED)
  ingestFrontendError(@Body() payload: unknown) {
    const total = this.monitoringService.recordFrontendError(payload);
    return { accepted: true, total };
  }

  @Post('metrics/frontend')
  @HttpCode(HttpStatus.ACCEPTED)
  ingestFrontendMetric(@Body() payload: unknown) {
    const total = this.monitoringService.recordFrontendMetric(payload);
    return { accepted: true, total };
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getPrometheusMetrics() {
    return this.monitoringService.renderPrometheusMetrics();
  }
}
