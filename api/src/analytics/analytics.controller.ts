import { Controller, Get, Inject } from '@nestjs/common';

import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary() {
    return this.analyticsService.getSummary();
  }
}
