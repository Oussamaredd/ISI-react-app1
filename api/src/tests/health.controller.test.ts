import { describe, expect, it, vi } from 'vitest';

import { HealthController } from '../health/health.controller.js';
import type { HealthService } from '../health/health.service.js';

describe('HealthController', () => {
  it('returns fast readiness payload without querying the database', () => {
    const healthService = {
      checkDatabase: vi.fn(),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);

    const payload = controller.check();

    expect(payload.status).toBe('ok');
    expect(payload.service).toBe('EcoTrack API');
    expect(healthService.checkDatabase).not.toHaveBeenCalled();
  });

  it('returns dependency status when database diagnostics are requested', async () => {
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
