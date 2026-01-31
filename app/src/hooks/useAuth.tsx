// client/src/hooks/useAuth.tsx
import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { API_BASE } from '../services/api';

const AuthContext = createContext(null);

const normalizedApiBase = API_BASE.replace(/\/$/, '');
const AUTH_BASE_URL = normalizedApiBase.endsWith('/api') ? normalizedApiBase : `${normalizedApiBase}/api`;
const AUTH_STATUS_URL = `${AUTH_BASE_URL}/auth/status`;
const AUTH_LOGOUT_URL = `${AUTH_BASE_URL}/auth/logout`;
const AUTH_CHECK_TIMEOUT_MS = 6000;
const AUTH_CHECK_RETRIES = 2;
const AUTH_RETRY_DELAY_MS = 300;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const checkAuthStatus = useCallback(async () => {
    // Abort any in-flight request (React StrictMode mounts twice in dev)
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!isMountedRef.current || controller.signal.aborted) {
      return;
    }

    for (let attempt = 1; attempt <= AUTH_CHECK_RETRIES + 1; attempt += 1) {
      if (!isMountedRef.current || controller.signal.aborted) {
        return;
      }

      const timeoutId = window.setTimeout(() => controller.abort(), AUTH_CHECK_TIMEOUT_MS);

      try {
        const response = await fetch(AUTH_STATUS_URL, {
          credentials: 'include',
          signal: controller.signal
        });

        window.clearTimeout(timeoutId);

        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }

        if (response.ok) {
          const statusData = await response.json();
          const authenticated = Boolean(statusData?.authenticated ?? statusData?.user);
          setUser(authenticated ? statusData?.user ?? null : null);
          setIsAuthenticated(authenticated);
          setIsLoading(false);
          return;
        }

        if (response.status === 401 || response.status === 403) {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        console.error('Auth check failed with status:', response.status);
      } catch (error) {
        window.clearTimeout(timeoutId);

        if (controller.signal.aborted || !isMountedRef.current) {
          return;
        }

        console.error('Auth check failed:', error);
      }

      if (attempt <= AUTH_CHECK_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, AUTH_RETRY_DELAY_MS * attempt));
      }
    }

    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  }, []);

  // Check authentication status on mount and page changes
  useEffect(() => {
    isMountedRef.current = true;
    checkAuthStatus();

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [checkAuthStatus]);

  useEffect(() => {
    if (!isLoading && window.location.search.includes('auth=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isLoading]);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await fetch(AUTH_LOGOUT_URL, { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const getAuthHeaders = async () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    getAuthHeaders
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback for when context isn't available yet
    return { user: null, isAuthenticated: false, isLoading: true, login: () => {}, logout: () => {}, getAuthHeaders: async () => ({}) };
  }
  return context;
};

export const useCurrentUser = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback for when context isn't available yet
    return { user: null, isAuthenticated: false, isLoading: true, error: null };
  }
  return { user: context.user, isAuthenticated: context.isAuthenticated, isLoading: context.isLoading, error: null };
};

export default AuthProvider;
