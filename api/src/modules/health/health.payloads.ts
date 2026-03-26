import fs from 'node:fs';

import type { HealthService } from './health.service.js';

type DatabaseCheckPayload = Awaited<ReturnType<HealthService['checkDatabase']>>;

const ROOT_PACKAGE_RELATIVE_URL = new URL('../../../../package.json', import.meta.url);
const API_PACKAGE_RELATIVE_URL = new URL('../../../package.json', import.meta.url);
const DEFAULT_RELEASE_VERSION = '0.0.0';

let cachedReleaseVersion: string | null = null;

const resolveReleaseVersion = () => {
  if (cachedReleaseVersion) {
    return cachedReleaseVersion;
  }

  for (const candidate of [ROOT_PACKAGE_RELATIVE_URL, API_PACKAGE_RELATIVE_URL]) {
    try {
      const raw = fs.readFileSync(candidate, 'utf8');
      const parsed = JSON.parse(raw) as { version?: unknown };
      if (typeof parsed.version === 'string' && parsed.version.trim()) {
        cachedReleaseVersion = parsed.version.trim();
        return cachedReleaseVersion;
      }
    } catch {
      continue;
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
