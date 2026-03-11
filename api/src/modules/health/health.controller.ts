import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { buildLivenessPayload, buildReadinessPayload } from './health.payloads.js';
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
    return buildLivenessPayload();
  }

  @Get('ready')
  async ready() {
    const payload = await buildReadinessPayload(this.healthService);

    if (payload.database.status !== 'ok') {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }

  @Get('database')
  checkDatabase() {
    return this.ready();
  }
}

