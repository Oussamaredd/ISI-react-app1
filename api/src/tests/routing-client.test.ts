import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoutingClient } from '../modules/collections/routing/routing.client.js';

describe('RoutingClient circuit breaker', () => {
  const configServiceMock = {
    get: vi.fn(),
  };

  const fetchMock = vi.fn();

  const createRoutingClientMock = (resetWindowMs = 5000, baseUrl = 'https://router.example.test') => {
    configServiceMock.get.mockImplementation((key: string) => {
      if (key === 'routing.baseUrl') {
        return baseUrl;
      }
      if (key === 'routing.circuitBreaker.timeoutMs') {
        return 1000;
      }
      if (key === 'routing.circuitBreaker.failureThreshold') {
        return 3;
      }
      if (key === 'routing.circuitBreaker.resetWindowMs') {
        return resetWindowMs;
      }

      return undefined;
    });

    return new RoutingClient(configServiceMock as unknown as ConfigService);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('success scenarios', () => {
    it('returns route geometry when routing succeeds', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: 1000,
              duration: 300,
              geometry: {
                type: 'LineString',
                coordinates: [
                  [2.3522, 48.8566],
                  [2.354, 48.8589],
                ],
              },
            },
          ],
        }),
      });

      const client = createRoutingClientMock();
      const result = await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);

      expect(result).not.toBeNull();
      expect(result?.geometry.coordinates).toHaveLength(2);
      expect(result?.distanceKm).toBe(1);
      expect(result?.source).toBe('live');
    });

    it('records success metrics after successful request', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: 1000,
              duration: 300,
              geometry: {
                type: 'LineString',
                coordinates: [
                  [2.3522, 48.8566],
                  [2.354, 48.8589],
                ],
              },
            },
          ],
        }),
      });

      const client = createRoutingClientMock();
      await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);

      const metrics = client.getMetrics();
      expect(metrics.state).toBe('closed');
      expect(metrics.failures).toBe(0);
      expect(metrics.lastSuccessTime).not.toBeNull();
      expect(metrics.consecutiveSuccesses).toBe(0);
    });
  });

  describe('failure accumulation', () => {
    it('accumulates failures and opens circuit after threshold', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const client = createRoutingClientMock();

      await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);
      expect(client.getCircuitState()).toBe('closed');

      await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);
      expect(client.getCircuitState()).toBe('closed');

      await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);

      expect(client.getCircuitState()).toBe('open');
    });

    it('opens circuit on HTTP 500 error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const client = createRoutingClientMock();

      await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);
      expect(client.getCircuitState()).toBe('closed');

      await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);
      expect(client.getCircuitState()).toBe('closed');

      await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);

      expect(client.getCircuitState()).toBe('open');
    });
  });

  describe('open state fast fallback', () => {
    it('returns null immediately when circuit is open', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const client = createRoutingClientMock();

      for (let i = 0; i < 3; i += 1) {
        await client.fetchRoute([
          { longitude: 2.3522, latitude: 48.8566 },
          { longitude: 2.354, latitude: 48.8589 },
        ]);
      }

      expect(client.getCircuitState()).toBe('open');

      const callsBefore = fetchMock.mock.calls.length;

      const result = await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);

      expect(result).toBeNull();
      expect(fetchMock.mock.calls.length).toBe(callsBefore);
    });

    it('returns null for subsequent requests while circuit remains open', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const client = createRoutingClientMock();

      for (let i = 0; i < 3; i += 1) {
        await client.fetchRoute([
          { longitude: 2.3522, latitude: 48.8566 },
          { longitude: 2.354, latitude: 48.8589 },
        ]);
      }

      const callsBefore = fetchMock.mock.calls.length;

      const result1 = await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);

      const result2 = await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(fetchMock.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('half-open recovery', () => {
    it('transitions to half-open after reset window expires', async () => {
      const client = createRoutingClientMock(100);

      client['metrics'] = {
        state: 'open',
        failures: 3,
        lastFailureTime: Date.now() - 200,
        lastSuccessTime: null,
        consecutiveSuccesses: 0,
      };

      const state = client.getCircuitState();
      expect(state).toBe('half-open');
    });

    it('allows a test request in half-open state', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: 1000,
              duration: 300,
              geometry: {
                type: 'LineString',
                coordinates: [
                  [2.3522, 48.8566],
                  [2.354, 48.8589],
                ],
              },
            },
          ],
        }),
      });

      const client = createRoutingClientMock();

      client['metrics'] = {
        state: 'half-open',
        failures: 3,
        lastFailureTime: Date.now() - 10000,
        lastSuccessTime: null,
        consecutiveSuccesses: 0,
      };

      const result = await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);

      expect(result).not.toBeNull();
      expect(fetchMock).toHaveBeenCalled();
    });

    it('skips concurrent half-open probes while another probe is already in flight', async () => {
      const client = createRoutingClientMock();

      client['metrics'] = {
        state: 'half-open',
        failures: 3,
        lastFailureTime: Date.now() - 10000,
        lastSuccessTime: null,
        consecutiveSuccesses: 0,
      };
      client['probeInFlight'] = true;

      const result = await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('closes circuit after successive successes in half-open state', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: 1000,
              duration: 300,
              geometry: {
                type: 'LineString',
                coordinates: [
                  [2.3522, 48.8566],
                  [2.354, 48.8589],
                ],
              },
            },
          ],
        }),
      });

      const client = createRoutingClientMock();

      client['metrics'] = {
        state: 'half-open',
        failures: 3,
        lastFailureTime: Date.now() - 10000,
        lastSuccessTime: null,
        consecutiveSuccesses: 0,
      };

      await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);

      await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);

      expect(client.getCircuitState()).toBe('closed');
      expect(client.getMetrics().failures).toBe(0);
    });

    it('reopens circuit if test request fails in half-open state', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const client = createRoutingClientMock();

      client['metrics'] = {
        state: 'half-open',
        failures: 3,
        lastFailureTime: Date.now() - 10000,
        lastSuccessTime: null,
        consecutiveSuccesses: 0,
      };

      await client.fetchRoute([
        { longitude: 2.3522, latitude: 48.8566 },
        { longitude: 2.354, latitude: 48.8589 },
      ]);

      expect(client.getCircuitState()).toBe('open');
      expect(client.getMetrics().failures).toBe(4);
    });
  });

  it('resets the failure counter after a successful closed-state call', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: 1000,
              duration: 300,
              geometry: {
                type: 'LineString',
                coordinates: [
                  [2.3522, 48.8566],
                  [2.354, 48.8589],
                ],
              },
            },
          ],
        }),
      });

    const client = createRoutingClientMock();

    await client.fetchRoute([
      { longitude: 2.3522, latitude: 48.8566 },
      { longitude: 2.354, latitude: 48.8589 },
    ]);
    expect(client.getMetrics().failures).toBe(1);

    await client.fetchRoute([
      { longitude: 2.3522, latitude: 48.8566 },
      { longitude: 2.354, latitude: 48.8589 },
    ]);

    expect(client.getMetrics().failures).toBe(0);
    expect(client.getCircuitState()).toBe('closed');
  });

  it('returns null when the routing provider response lacks a usable geometry', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            distance: 1000,
            duration: 300,
            geometry: {
              type: 'LineString',
              coordinates: [[2.3522, 48.8566]],
            },
          },
        ],
      }),
    });

    const client = createRoutingClientMock();
    const result = await client.fetchRoute([
      { longitude: 2.3522, latitude: 48.8566 },
      { longitude: 2.354, latitude: 48.8589 },
    ]);

    expect(result).toBeNull();
    expect(client.getMetrics().failures).toBe(1);
  });

  it('falls back to the generic provider name when the configured base URL is invalid', () => {
    const client = createRoutingClientMock() as any;
    client.baseUrl = 'not-a-valid-url';

    expect(client.getProviderName()).toBe('osrm');
  });
});
