import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const dotenvConfigMock = vi.fn();

vi.mock('dotenv', () => ({
  default: {
    config: dotenvConfigMock,
  },
}));

describe('API env file loader', () => {
  beforeEach(() => {
    dotenvConfigMock.mockReset();
    vi.resetModules();
  });

  it('loads the workspace root env file only once', async () => {
    const { apiEnvFilePath, ensureApiEnvLoaded } = await import('../config/env-file.js');

    expect(apiEnvFilePath).toBeDefined();
    expect(path.basename(apiEnvFilePath ?? '')).toBe('.env');

    expect(ensureApiEnvLoaded()).toBe(apiEnvFilePath);
    expect(ensureApiEnvLoaded()).toBe(apiEnvFilePath);

    expect(dotenvConfigMock).toHaveBeenCalledTimes(1);
    expect(dotenvConfigMock).toHaveBeenCalledWith({ path: apiEnvFilePath });
  });
});
