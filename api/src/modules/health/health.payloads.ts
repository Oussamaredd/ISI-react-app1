import type { HealthService } from './health.service.js';

type DatabaseCheckPayload = Awaited<ReturnType<HealthService['checkDatabase']>>;

const DEFAULT_RELEASE_VERSION = '0.0.0';

let cachedReleaseVersion: string | null = null;

const resolveReleaseVersion = () => {
  if (cachedReleaseVersion) {
    return cachedReleaseVersion;
  }

  for (const candidate of [process.env.ECOTRACK_RELEASE_VERSION, process.env.npm_package_version]) {
    if (typeof candidate === 'string' && candidate.trim()) {
      cachedReleaseVersion = candidate.trim();
      return cachedReleaseVersion;
    }
  }

  cachedReleaseVersion = DEFAULT_RELEASE_VERSION;
  return cachedReleaseVersion;
};

const buildReleasePayload = () => ({
  version: resolveReleaseVersion(),
});

export const buildLivenessPayload = () => ({
  status: 'ok' as const,
  service: 'EcoTrack API',
  release: buildReleasePayload(),
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
    release: buildReleasePayload(),
    timestamp: new Date().toISOString(),
    database,
  };
};
