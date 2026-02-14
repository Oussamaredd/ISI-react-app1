import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { API_BASE } from '../services/api';
import { authApi, type AuthSuccess, type AuthUser } from '../services/authApi';
import { clearAccessToken, getAccessToken, setAccessToken, withAuthHeader } from '../services/authToken';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (session: AuthSuccess) => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_CHECK_TIMEOUT_MS = 6000;
const AUTH_CHECK_RETRIES = 2;
const AUTH_RETRY_DELAY_MS = 300;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const applyAuthenticatedState = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser);
    setIsAuthenticated(Boolean(nextUser));
  }, []);

  const refreshAuth = useCallback(async () => {
    abortControllerRef.current?.abort();
    const lifecycleController = new AbortController();
    abortControllerRef.current = lifecycleController;
    const token = getAccessToken();
    const isAuthCallbackRoute =
      typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback');

    if (!isMountedRef.current || lifecycleController.signal.aborted) {
      return;
    }

    if (isAuthCallbackRoute && !token) {
      applyAuthenticatedState(null);
      setIsLoading(false);
      return;
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
          `${API_BASE}/api/me`,
          {
            credentials: 'include',
            signal: requestController.signal,
            headers: Object.fromEntries(withAuthHeader().entries()),
          },
        );

        window.clearTimeout(timeoutId);
        lifecycleController.signal.removeEventListener('abort', abortFromLifecycle);

        if (!isMountedRef.current || lifecycleController.signal.aborted) {
          return;
        }

        if (response.ok) {
          const payload = (await response.json()) as { user?: AuthUser };
          applyAuthenticatedState(payload.user ?? null);
          setIsLoading(false);
          return;
        }

        if (response.status === 401 || response.status === 403) {
          if (getAccessToken()) {
            clearAccessToken();
          }
          applyAuthenticatedState(null);
          setIsLoading(false);
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

    applyAuthenticatedState(null);
    setIsLoading(false);
  }, [applyAuthenticatedState]);

  useEffect(() => {
    isMountedRef.current = true;
    void refreshAuth();

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [refreshAuth]);

  useEffect(() => {
    if (!isLoading && window.location.search.includes('auth=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isLoading]);

  const login = useCallback(
    (session: AuthSuccess) => {
      setAccessToken(session.accessToken);
      applyAuthenticatedState(session.user);
    },
    [applyAuthenticatedState],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // No-op: local session is always cleared client-side.
    } finally {
      clearAccessToken();
      applyAuthenticatedState(null);
    }
  }, [applyAuthenticatedState]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshAuth,
      getAuthHeaders,
    }),
    [getAuthHeaders, isAuthenticated, isLoading, login, logout, refreshAuth, user],
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
      login: (_session: AuthSuccess) => undefined,
      logout: async () => undefined,
      refreshAuth: async () => undefined,
      getAuthHeaders: () => ({}),
    };
  }

  return context;
};

export const useCurrentUser = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  return { user, isAuthenticated, isLoading, error: null };
};

export default AuthProvider;
