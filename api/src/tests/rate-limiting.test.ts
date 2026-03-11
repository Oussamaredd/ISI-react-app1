import { Controller, Get, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SkipThrottle, Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';

import { AUTH_ABUSE_THROTTLE } from '../config/rate-limit.js';

@Controller()
class RateLimitTestController {
  @Get('dashboard')
  dashboard() {
    return { ok: true };
  }

  @Get('health')
  @SkipThrottle()
  health() {
    return { ok: true };
  }

  @Post('login')
  @Throttle(AUTH_ABUSE_THROTTLE)
  login() {
    return { ok: true };
  }
}

describe('rate limiting policy', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            {
              name: 'default',
              ttl: 60_000,
              limit: 2,
            },
          ],
        }),
      ],
      controllers: [RateLimitTestController],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('enforces the global limit on standard routes', async () => {
    const clientIp = '198.51.100.10';

    await request(app.getHttpServer()).get('/dashboard').set('x-forwarded-for', clientIp).expect(200);
    await request(app.getHttpServer()).get('/dashboard').set('x-forwarded-for', clientIp).expect(200);
    await request(app.getHttpServer()).get('/dashboard').set('x-forwarded-for', clientIp).expect(429);
  });

  it('skips rate limiting for health probes', async () => {
    const clientIp = '198.51.100.11';

    for (let index = 0; index < 6; index += 1) {
      await request(app.getHttpServer()).get('/health').set('x-forwarded-for', clientIp).expect(200);
    }
  });

  it('applies the stricter auth abuse policy on login routes', async () => {
    const clientIp = '198.51.100.12';

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app.getHttpServer()).post('/login').set('x-forwarded-for', clientIp).expect(201);
    }

    await request(app.getHttpServer()).post('/login').set('x-forwarded-for', clientIp).expect(429);
  });
});
