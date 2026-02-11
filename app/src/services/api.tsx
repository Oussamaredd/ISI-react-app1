// API client with centralized configuration and error handling
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

// Generic API wrapper
export const apiClient = {
  get: async (url, options: any = {}) => {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let error = { error: `HTTP ${response.status}` };
        if (contentType && contentType.includes('application/json')) {
          try {
            error = await response.json();
          } catch {
            // Keep default error
          }
        }
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },

  post: async (url, data, options: any = {}) => {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let error = { error: `HTTP ${response.status}` };
        if (contentType && contentType.includes('application/json')) {
          try {
            error = await response.json();
          } catch {
            // Keep default error
          }
        }
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },

  put: async (url, data, options: any = {}) => {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let error = { error: `HTTP ${response.status}` };
        if (contentType && contentType.includes('application/json')) {
          try {
            error = await response.json();
          } catch {
            // Keep default error
          }
        }
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },

  delete: async (url, options = {}) => {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        method: 'DELETE',
        credentials: 'include',
        ...options,
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let error = { error: `HTTP ${response.status}` };
        if (contentType && contentType.includes('application/json')) {
          try {
            error = await response.json();
          } catch {
            // Keep default error
          }
        }
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
};
