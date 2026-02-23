// API client with centralized configuration and error handling
import { withAuthHeader } from './authToken';

const rawApiBase =
  import.meta.env.VITE_API_BASE_URL ??
  // Temporary alias support during migration to VITE_API_BASE_URL.
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

const trimmedApiBase = rawApiBase.replace(/\/+$/, '');
export const API_BASE = trimmedApiBase.endsWith('/api')
  ? trimmedApiBase.slice(0, -4)
  : trimmedApiBase;

// Global error handler for API calls
const handleApiError = (error) => {
  console.error('API Error:', error);
  throw error;
};

const parseJsonResponse = async (response: Response) => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

// Generic API wrapper
export const apiClient = {
  get: async (url, options: any = {}) => {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        credentials: 'include',
        ...options,
        headers: {
          ...Object.fromEntries(
            withAuthHeader({
              'Content-Type': 'application/json',
              ...options.headers,
            }).entries(),
          ),
        },
      });
      
      if (!response.ok) {
        const error = ((await parseJsonResponse(response)) as { error?: string } | null) ?? {
          error: `HTTP ${response.status}`,
        };
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return parseJsonResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  post: async (url, data, options: any = {}) => {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        method: 'POST',
        credentials: 'include',
        ...options,
        headers: {
          ...Object.fromEntries(
            withAuthHeader({
              'Content-Type': 'application/json',
              ...options.headers,
            }).entries(),
          ),
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = ((await parseJsonResponse(response)) as { error?: string } | null) ?? {
          error: `HTTP ${response.status}`,
        };
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return parseJsonResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  put: async (url, data, options: any = {}) => {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        method: 'PUT',
        credentials: 'include',
        ...options,
        headers: {
          ...Object.fromEntries(
            withAuthHeader({
              'Content-Type': 'application/json',
              ...options.headers,
            }).entries(),
          ),
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = ((await parseJsonResponse(response)) as { error?: string } | null) ?? {
          error: `HTTP ${response.status}`,
        };
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return parseJsonResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  delete: async (url, options = {}) => {
    try {
      const { headers: optionHeaders, ...restOptions } = options as RequestInit;
      const response = await fetch(`${API_BASE}${url}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: Object.fromEntries(withAuthHeader(optionHeaders).entries()),
        ...restOptions,
      });
      
      if (!response.ok) {
        const error = ((await parseJsonResponse(response)) as { error?: string } | null) ?? {
          error: `HTTP ${response.status}`,
        };
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return parseJsonResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
