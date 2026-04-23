import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { AuthProvider, useAuth } from '../hooks/useAuth';
import { AUTH_SESSION_INVALIDATED_EVENT } from '../services/api';
import { ACCESS_TOKEN_STORAGE_KEY } from '../services/authToken';

const {
  mockSupabaseGetSession,
  mockSupabaseOnAuthStateChange,
  mockSupabaseSignOut,
} = vi.hoisted(() => ({
  mockSupabaseGetSession: vi.fn(),
  mockSupabaseOnAuthStateChange: vi.fn(),
  mockSupabaseSignOut: vi.fn(),
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockSupabaseGetSession,
      onAuthStateChange: mockSupabaseOnAuthStateChange,
      signOut: mockSupabaseSignOut,
    },
  },
}));

const supabaseSession = {
  access_token: 'token-123',
  user: {
    id: 'supabase-user-1',
    email: 'local@example.com',
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    user_metadata: {
      display_name: 'Local User',
      is_active: true,
      legacy_user_id: 'user-1',
      role: 'agent',
    },
  },
};

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

describe('useAuth local storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
    mockSupabaseGetSession.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });
    mockSupabaseOnAuthStateChange.mockImplementation(() => ({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    }));
    mockSupabaseSignOut.mockResolvedValue({ error: null });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
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

  test('restores an authenticated session from Supabase without contacting the backend', async () => {
    window.history.pushState({}, '', '/app');
    mockSupabaseGetSession.mockResolvedValue({
      data: {
        session: supabaseSession,
      },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    });

    expect(screen.getByTestId('auth-header').textContent).toBe('Bearer token-123');
    expect(screen.getByTestId('auth-is-authenticated').textContent).toBe('true');
    expect(window.fetch).not.toHaveBeenCalled();
  });

  test('keeps public routes interactive while anonymous session discovery stays client-side', async () => {
    window.history.pushState({}, '', '/login');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('anonymous');
    });

    expect(screen.getByTestId('auth-loading').textContent).toBe('false');
    expect(window.fetch).not.toHaveBeenCalled();
  });

  test('clears stale stored bearer when the Supabase session is missing', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'stale-token');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('anonymous');
    });

    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('auth-header').textContent).toBe('');
    expect(window.fetch).not.toHaveBeenCalled();
  });

  test('invalidating the session clears auth state and signs out the local Supabase client', async () => {
    mockSupabaseGetSession.mockResolvedValue({
      data: {
        session: supabaseSession,
      },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    });

    window.dispatchEvent(new Event(AUTH_SESSION_INVALIDATED_EVENT));

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('anonymous');
    });

    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(mockSupabaseSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
