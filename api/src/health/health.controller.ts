import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { HealthService } from './health.service.js';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return this.live();
  }

  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'EcoTrack API',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready() {
    const database = await this.healthService.checkDatabase();
    const payload = {
      status: database.status === 'ok' ? 'ok' : 'degraded',
      service: 'EcoTrack API',
      timestamp: new Date().toISOString(),
      database,
    };

    if (database.status !== 'ok') {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }

  @Get('database')
  checkDatabase() {
    return this.ready();
  }
}
