import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { AuthProvider, useAuth } from '../hooks/useAuth';
import { ACCESS_TOKEN_STORAGE_KEY } from '../services/authToken';

const session = {
  accessToken: 'token-123',
  user: {
    id: 'user-1',
    email: 'local@example.com',
    displayName: 'Local User',
    avatarUrl: null,
    role: 'agent',
    roles: [],
    isActive: true,
    hotelId: 'hotel-1',
    provider: 'local' as const,
  },
};

function AuthProbe() {
  const { login, getAuthHeaders, isLoading } = useAuth();
  const headers = getAuthHeaders();

  return (
    <div>
      <button type="button" onClick={() => login(session)}>
        set-session
      </button>
      <p data-testid="auth-header">{headers.Authorization ?? ''}</p>
      <p data-testid="auth-loading">{String(isLoading)}</p>
    </div>
  );
}

describe('useAuth local storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('stores JWT in localStorage and exposes Authorization header', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-session' }));

    await waitFor(() => {
      expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('token-123');
      expect(screen.getByTestId('auth-header').textContent).toBe('Bearer token-123');
    });
  });

  test('resolves loading state after auth check timeouts and retries', async () => {
    vi.useFakeTimers();

    const abortableFetch = vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        const signal = init?.signal;

        const rejectAbort = () => {
          reject(new DOMException('Aborted', 'AbortError'));
        };

        if (signal?.aborted) {
          rejectAbort();
          return;
        }

        signal?.addEventListener('abort', rejectAbort, { once: true });
      });
    });

    vi.stubGlobal('fetch', abortableFetch as unknown as typeof fetch);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    });

    expect(abortableFetch).toHaveBeenCalledTimes(3);
  });
});
