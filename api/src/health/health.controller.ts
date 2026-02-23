import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { HealthService } from './health.service.js';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      service: 'EcoTrack API',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('database')
  async checkDatabase() {
    const database = await this.healthService.checkDatabase();
    return {
      status: database.status === 'ok' ? 'ok' : 'degraded',
      service: 'EcoTrack API',
      timestamp: new Date().toISOString(),
      database,
    };
  }
}
