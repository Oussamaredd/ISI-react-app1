import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { AUTH_SESSION_INVALIDATED_EVENT } from '../services/api';
import { authApi, type AuthSuccess, type AuthUser } from '../services/authApi';
import { clearAccessToken, getAccessToken, setAccessToken } from '../services/authToken';
import { supabase } from '../services/supabase';

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

const isProtectedAppPath = () =>
  typeof window !== 'undefined' && window.location.pathname.startsWith('/app');

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const initialToken = getAccessToken();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (initialToken || isProtectedAppPath()) {
      return 'unknown';
    }

    return 'anonymous';
  });
  const isMountedRef = useRef(true);
  const isLoading = authState === 'unknown';
  const isAuthenticated = authState === 'authenticated' || Boolean(user);

  const applyAuthenticatedState = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser);
  }, []);

  const refreshAuth = useCallback(async function refreshAuthInternal() {
    setAuthState('unknown');
    const { data, error } = await supabase.auth.getSession();

    if (!isMountedRef.current) {
      return;
    }

    if (error) {
      clearAccessToken();
      applyAuthenticatedState(null);
      setAuthState('anonymous');
      return;
    }

    const accessToken = data.session?.access_token?.trim() ?? '';
    const nextUser = authApi.resolveSessionUser(data.session ?? null);

    if (accessToken && nextUser) {
      setAccessToken(accessToken);
      applyAuthenticatedState(nextUser);
      setAuthState('authenticated');
      return;
    }

    clearAccessToken();
    applyAuthenticatedState(null);
    setAuthState('anonymous');
  }, [applyAuthenticatedState]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleSessionInvalidated = () => {
      clearAccessToken();
      applyAuthenticatedState(null);
      setAuthState('anonymous');
      void supabase.auth.signOut({ scope: 'local' });
    };

    window.addEventListener(AUTH_SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
    return () => {
      window.removeEventListener(AUTH_SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
    };
  }, [applyAuthenticatedState]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearAccessToken();
        applyAuthenticatedState(null);
        setAuthState('anonymous');
        return;
      }

      const accessToken = session?.access_token?.trim() ?? '';
      const nextUser = authApi.resolveSessionUser(session);

      if (accessToken && nextUser) {
        setAccessToken(accessToken);
        applyAuthenticatedState(nextUser);
        setAuthState('authenticated');
        return;
      }

      clearAccessToken();
      applyAuthenticatedState(null);
      setAuthState('anonymous');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [applyAuthenticatedState]);

  useEffect(() => {
    isMountedRef.current = true;
    void refreshAuth();

    return () => {
      isMountedRef.current = false;
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
      setAuthState('authenticated');
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
      setAuthState('anonymous');
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
