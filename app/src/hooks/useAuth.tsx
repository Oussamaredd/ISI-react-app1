import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { AUTH_SESSION_INVALIDATED_EVENT, API_BASE, createApiHeaders } from '../services/api';
import { authApi, type AuthSuccess, type AuthUser } from '../services/authApi';
import { clearAccessToken, getAccessToken, setAccessToken } from '../services/authToken';

export type AuthState = 'unknown' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authState: AuthState;
  login: (session: AuthSuccess) => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_CHECK_TIMEOUT_MS = 6000;
const AUTH_CHECK_RETRIES = 2;
const AUTH_RETRY_DELAY_MS = 300;
const AUTH_RECHECK_DELAY_MS = 3000;

const isProtectedAppPath = () =>
  typeof window !== 'undefined' && window.location.pathname.startsWith('/app');

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const initialToken = getAccessToken();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(initialToken));
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (initialToken || isProtectedAppPath()) {
      return 'unknown';
    }

    return 'anonymous';
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const isLoading = authState === 'unknown';

  const applyAuthenticatedState = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser);
    setIsAuthenticated(Boolean(nextUser));
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const refreshAuth = useCallback(async function refreshAuthInternal() {
    clearRetryTimer();
    abortControllerRef.current?.abort();
    const lifecycleController = new AbortController();
    abortControllerRef.current = lifecycleController;
    const token = getAccessToken();
    const isAuthCallbackRoute =
      typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback');
    const shouldBlockOnBootstrap = Boolean(token) || isProtectedAppPath() || isAuthCallbackRoute;

    if (!isMountedRef.current || lifecycleController.signal.aborted) {
      return;
    }

    if (isAuthCallbackRoute && !token) {
      applyAuthenticatedState(null);
      setAuthState('anonymous');
      return;
    }

    if (shouldBlockOnBootstrap) {
      setAuthState('unknown');
    } else {
      applyAuthenticatedState(null);
      setAuthState('anonymous');
    }

    for (let attempt = 1; attempt <= AUTH_CHECK_RETRIES + 1; attempt += 1) {
      if (!isMountedRef.current || lifecycleController.signal.aborted) {
        return;
      }

      const requestController = new AbortController();
      const abortFromLifecycle = () => {
        requestController.abort();
      };
      lifecycleController.signal.addEventListener('abort', abortFromLifecycle, { once: true });
      const timeoutId = window.setTimeout(() => requestController.abort(), AUTH_CHECK_TIMEOUT_MS);

      try {
        const response = await fetch(
          `${API_BASE}/api/auth/status`,
          {
            credentials: 'include',
            signal: requestController.signal,
            headers: createApiHeaders(),
          },
        );

        window.clearTimeout(timeoutId);
        lifecycleController.signal.removeEventListener('abort', abortFromLifecycle);

        if (!isMountedRef.current || lifecycleController.signal.aborted) {
          return;
        }

        if (response.ok) {
          const payload = (await response.json()) as {
            authenticated?: boolean;
            user?: AuthUser;
          };

          if (!payload.authenticated && getAccessToken()) {
            clearAccessToken();
          }

          applyAuthenticatedState(payload.authenticated ? (payload.user ?? null) : null);
          setAuthState(payload.authenticated ? 'authenticated' : 'anonymous');
          return;
        }

        if (response.status === 401 || response.status === 403) {
          if (getAccessToken()) {
            clearAccessToken();
          }
          applyAuthenticatedState(null);
          setAuthState('anonymous');
          return;
        }
      } catch {
        window.clearTimeout(timeoutId);
        lifecycleController.signal.removeEventListener('abort', abortFromLifecycle);
      }

      if (attempt <= AUTH_CHECK_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, AUTH_RETRY_DELAY_MS * attempt));
      }
    }

    if (shouldBlockOnBootstrap) {
      setAuthState('unknown');
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        if (!isMountedRef.current) {
          return;
        }

        void refreshAuthInternal();
      }, AUTH_RECHECK_DELAY_MS);
      return;
    }

    applyAuthenticatedState(null);
    setAuthState('anonymous');
  }, [applyAuthenticatedState, clearRetryTimer]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleSessionInvalidated = () => {
      clearRetryTimer();
      abortControllerRef.current?.abort();
      clearAccessToken();
      applyAuthenticatedState(null);
      setAuthState('anonymous');
    };

    window.addEventListener(AUTH_SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
    return () => {
      window.removeEventListener(AUTH_SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
    };
  }, [applyAuthenticatedState, clearRetryTimer]);

  useEffect(() => {
    isMountedRef.current = true;
    void refreshAuth();

    return () => {
      isMountedRef.current = false;
      clearRetryTimer();
      abortControllerRef.current?.abort();
    };
  }, [clearRetryTimer, refreshAuth]);

  useEffect(() => {
    if (!isLoading && window.location.search.includes('auth=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isLoading]);

  const login = useCallback(
    (session: AuthSuccess) => {
      setAccessToken(session.accessToken);
      applyAuthenticatedState(session.user);
      setAuthState('authenticated');
    },
    [applyAuthenticatedState],
  );

  const logout = useCallback(async () => {
    clearRetryTimer();
    try {
      await authApi.logout();
    } catch {
      // No-op: local session is always cleared client-side.
    } finally {
      clearAccessToken();
      applyAuthenticatedState(null);
      setAuthState('anonymous');
    }
  }, [applyAuthenticatedState, clearRetryTimer]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      authState,
      login,
      logout,
      refreshAuth,
      getAuthHeaders,
    }),
    [authState, getAuthHeaders, isAuthenticated, isLoading, login, logout, refreshAuth, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: true,
      authState: 'unknown',
      login: (_session: AuthSuccess) => undefined,
      logout: async () => undefined,
      refreshAuth: async () => undefined,
      getAuthHeaders: () => ({}),
    };
  }

  return context;
};

export const useCurrentUser = () => {
  const { user, isAuthenticated, isLoading, authState } = useAuth();
  return { user, isAuthenticated, isLoading, authState, error: null };
};

export default AuthProvider;
