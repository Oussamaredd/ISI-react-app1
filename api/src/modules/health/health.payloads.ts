import type { HealthService } from './health.service.js';

type DatabaseCheckPayload = Awaited<ReturnType<HealthService['checkDatabase']>>;

export const buildLivenessPayload = () => ({
  status: 'ok' as const,
  service: 'EcoTrack API',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
});

export const buildReadinessPayload = async (
  healthService: Pick<HealthService, 'checkDatabase'>,
) => {
  const database = (await healthService.checkDatabase()) as DatabaseCheckPayload;

  return {
    status: database.status === 'ok' ? ('ok' as const) : ('degraded' as const),
    service: 'EcoTrack API',
    timestamp: new Date().toISOString(),
    database,
  };
};
