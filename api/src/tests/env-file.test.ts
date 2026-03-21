import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dotenvConfigMock, existsSyncMock } = vi.hoisted(() => ({
  dotenvConfigMock: vi.fn(),
  existsSyncMock: vi.fn(),
}));

vi.mock('dotenv', () => ({
  default: {
    config: dotenvConfigMock,
  },
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');

  return {
    ...actual,
    default: {
      ...actual,
      existsSync: existsSyncMock,
    },
    existsSync: existsSyncMock,
  };
});

describe('API env file loader', () => {
  beforeEach(() => {
    dotenvConfigMock.mockReset();
    existsSyncMock.mockReset();
    vi.resetModules();
  });

  it('loads the workspace root env file only once when it exists', async () => {
    existsSyncMock.mockReturnValue(true);

    const { apiEnvFilePath, ensureApiEnvLoaded } = await import('../config/env-file.js');

    expect(apiEnvFilePath).toBeDefined();
    expect(path.basename(apiEnvFilePath ?? '')).toBe('.env');

    expect(ensureApiEnvLoaded()).toBe(apiEnvFilePath);
    expect(ensureApiEnvLoaded()).toBe(apiEnvFilePath);

    expect(dotenvConfigMock).toHaveBeenCalledTimes(1);
    expect(dotenvConfigMock).toHaveBeenCalledWith({ path: apiEnvFilePath });
  });

  it('skips dotenv loading when the workspace root env file is absent', async () => {
    existsSyncMock.mockReturnValue(false);

    const { apiEnvFilePath, ensureApiEnvLoaded } = await import('../config/env-file.js');

    expect(apiEnvFilePath).toBeUndefined();
    expect(ensureApiEnvLoaded()).toBeUndefined();
    expect(ensureApiEnvLoaded()).toBeUndefined();

    expect(dotenvConfigMock).not.toHaveBeenCalled();
  });
});
