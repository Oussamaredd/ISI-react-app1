import { describe, expect, it, vi } from 'vitest';

import { attachRootHealthRoutes } from '../modules/health/root-health-routes.js';

type RegisteredHandler = (_request: unknown, response: FakeResponse) => void | Promise<void>;

class FakeResponse {
  statusCode = 200;
  body: unknown;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(payload: unknown) {
    this.body = payload;
    return this;
  }
}

const createRoutesHarness = (healthService: { checkDatabase: ReturnType<typeof vi.fn> }) => {
  const handlers = new Map<string, RegisteredHandler>();
  const fakeApp = {
    get: vi.fn((path: string, handler: RegisteredHandler) => {
      handlers.set(path, handler);
      return fakeApp;
    }),
  };

  attachRootHealthRoutes(fakeApp as never, healthService as never);

  return {
    invoke: async (path: string) => {
      const handler = handlers.get(path);
      if (!handler) {
        throw new Error(`No handler registered for ${path}`);
      }

      const response = new FakeResponse();
      await handler({}, response);
      return response;
    },
  };
};

describe('root health probe routes', () => {
  it('serves the root liveness aliases without touching the database dependency', async () => {
    const healthService = {
      checkDatabase: vi.fn(),
    };
    const harness = createRoutesHarness(healthService);

    const healthResponse = await harness.invoke('/health');
    const healthzResponse = await harness.invoke('/healthz');
    const startupzResponse = await harness.invoke('/startupz');

    expect(healthResponse.statusCode).toBe(200);
    expect(healthzResponse.statusCode).toBe(200);
    expect(startupzResponse.statusCode).toBe(200);
    expect(healthService.checkDatabase).not.toHaveBeenCalled();
  });

  it('returns 200 on /readyz when readiness checks succeed', async () => {
    const healthService = {
      checkDatabase: vi.fn().mockResolvedValue({
        status: 'ok',
        checks: [{ name: 'ticketing.schema', status: 'ok' }],
      }),
    };
    const harness = createRoutesHarness(healthService);

    const response = await harness.invoke('/readyz');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        database: expect.objectContaining({ status: 'ok' }),
      }),
    );
  });

  it('returns 503 on /readyz when readiness checks fail', async () => {
    const healthService = {
      checkDatabase: vi.fn().mockResolvedValue({
        status: 'error',
        message: 'Database readiness checks failed: planning.telemetry.schema',
        checks: [{ name: 'planning.telemetry.schema', status: 'error' }],
      }),
    };
    const harness = createRoutesHarness(healthService);

    const response = await harness.invoke('/readyz');

    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'degraded',
        database: expect.objectContaining({ status: 'error' }),
      }),
    );
  });
});
