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

    const { result } = renderHook(() => useApiReady('http://localhost:3001'));

    await waitFor(() => {
      expect(result.current.isApiReady).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/health',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
      }),
    );
  });

  test('retries until the API responds on /health', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue(createResponse(true));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useApiReady('http://localhost:3001'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });

    await waitFor(() => {
      expect(result.current.isApiReady).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
