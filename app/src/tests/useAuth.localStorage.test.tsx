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
    provider: 'local' as const,
  },
};

function AuthProbe() {
  const { authState, login, getAuthHeaders, isAuthenticated, isLoading } = useAuth();
  const headers = getAuthHeaders();

  return (
    <div>
      <button type="button" onClick={() => login(session)}>
        set-session
      </button>
      <p data-testid="auth-header">{headers.Authorization ?? ''}</p>
      <p data-testid="auth-is-authenticated">{String(isAuthenticated)}</p>
      <p data-testid="auth-state">{authState}</p>
      <p data-testid="auth-loading">{String(isLoading)}</p>
    </div>
  );
}

const createTransientFetch = (finalResponse?: Response) => {
  let attemptCount = 0;

  return vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
    attemptCount += 1;

    if (finalResponse && attemptCount >= 4) {
      return Promise.resolve(finalResponse);
    }

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
};

describe('useAuth local storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
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

  test('keeps the protected-route session gate active until a bootstrap recheck can resolve auth', async () => {
    vi.useFakeTimers();
    window.history.pushState({}, '', '/app');
    const transientFetch = createTransientFetch(
      {
        ok: false,
        status: 401,
        json: async () => ({ authenticated: false }),
      } as Response,
    );

    vi.stubGlobal('fetch', transientFetch as unknown as typeof fetch);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    expect(screen.getByTestId('auth-loading').textContent).toBe('true');
    expect(screen.getByTestId('auth-state').textContent).toBe('unknown');
    expect(transientFetch).toHaveBeenCalledTimes(3);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('auth-state').textContent).toBe('anonymous');
    expect(transientFetch).toHaveBeenCalledTimes(4);
  });

  test('keeps public routes interactive while session discovery runs in the background', async () => {
    vi.useFakeTimers();
    window.history.pushState({}, '', '/login');

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

    expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    expect(screen.getByTestId('auth-state').textContent).toBe('anonymous');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    expect(abortableFetch).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    expect(screen.getByTestId('auth-state').textContent).toBe('anonymous');
  });

  test('keeps stored bearer state unverified until the backend confirms the session', async () => {
    vi.useFakeTimers();
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'persisted-token');
    const transientFetch = createTransientFetch(
      {
        ok: true,
        status: 200,
        json: async () => ({ authenticated: true, user: session.user }),
      } as Response,
    );

    vi.stubGlobal('fetch', transientFetch as unknown as typeof fetch);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    expect(screen.getByTestId('auth-header').textContent).toBe('Bearer persisted-token');
    expect(screen.getByTestId('auth-is-authenticated').textContent).toBe('true');
    expect(screen.getByTestId('auth-loading').textContent).toBe('true');
    expect(screen.getByTestId('auth-state').textContent).toBe('unknown');
    expect(transientFetch).toHaveBeenCalledTimes(3);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    expect(transientFetch).toHaveBeenCalledTimes(4);
  });

  test('clears stale stored bearer when auth status reports unauthenticated', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'stale-token');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ authenticated: false }),
      })),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    });

    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('auth-header').textContent).toBe('');
    expect(screen.getByTestId('auth-is-authenticated').textContent).toBe('false');
    expect(screen.getByTestId('auth-state').textContent).toBe('anonymous');
  });
});

