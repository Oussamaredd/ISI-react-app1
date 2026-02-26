import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { HealthController } from '../health/health.controller.js';
import type { HealthService } from '../health/health.service.js';

describe('HealthController', () => {
  it('returns fast liveness payload without querying the database', () => {
    const healthService = {
      checkDatabase: vi.fn(),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);

    const payload = controller.live();

    expect(payload.status).toBe('ok');
    expect(payload.service).toBe('EcoTrack API');
    expect(healthService.checkDatabase).not.toHaveBeenCalled();
  });

  it('keeps /api/health as liveness compatibility alias', () => {
    const healthService = {
      checkDatabase: vi.fn(),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);

    const payload = controller.check();

    expect(payload.status).toBe('ok');
    expect(healthService.checkDatabase).not.toHaveBeenCalled();
  });

  it('returns readiness payload when database dependency is healthy', async () => {
    const healthService = {
      checkDatabase: vi.fn().mockResolvedValue({ status: 'ok' as const }),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);

    const payload = await controller.ready();

    expect(payload.status).toBe('ok');
    expect(payload.database).toEqual({ status: 'ok' });
    expect(healthService.checkDatabase).toHaveBeenCalledTimes(1);
  });

  it('returns service unavailable when readiness dependency fails', async () => {
    const healthService = {
      checkDatabase: vi.fn().mockResolvedValue({
        status: 'error' as const,
        message: 'database unavailable',
      }),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);

    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(healthService.checkDatabase).toHaveBeenCalledTimes(1);
  });

  it('keeps /api/health/database as readiness compatibility alias', async () => {
    const healthService = {
      checkDatabase: vi.fn().mockResolvedValue({ status: 'ok' as const }),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);

    const payload = await controller.checkDatabase();

    expect(payload.status).toBe('ok');
    expect(payload.database).toEqual({ status: 'ok' });
    expect(healthService.checkDatabase).toHaveBeenCalledTimes(1);
  });
});
