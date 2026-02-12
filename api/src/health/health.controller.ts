import { Controller, Get } from '@nestjs/common';

import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    const database = await this.healthService.checkDatabase();
    return {
      service: 'EcoTrack API',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database,
    };
  }
}
