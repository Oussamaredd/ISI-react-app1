import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useApiReady } from '../hooks/useApiReady';

const createResponse = (ok: boolean, status = 200) =>
  ({
    ok,
    status,
  }) as Response;

describe('useApiReady', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('returns ready state when /health responds successfully', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createResponse(true));
    vi.stubGlobal('fetch', fetchMock);
    const currentOrigin = window.location.origin;

    const { result } = renderHook(() => useApiReady('http://localhost:3001'));

    await waitFor(() => {
      expect(result.current.isApiReady).toBe(true);
      expect(result.current.apiReachability).toBe('ready');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${currentOrigin}/health`,
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
      }),
    );
  });

  test('marks the API as degraded until a retry succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue(createResponse(true));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useApiReady('http://localhost:3001'));

    await waitFor(() => {
      expect(result.current.apiReachability).toBe('degraded');
    });

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.isApiReady).toBe(true);
      expect(result.current.apiReachability).toBe('ready');
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
