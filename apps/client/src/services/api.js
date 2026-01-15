// API client with centralized configuration and error handling
const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Global error handler for API calls
const handleApiError = (error) => {
  console.error('API Error:', error);
  throw error;
};

// Generic API wrapper
export const apiClient = {
  get: async (url, options = {}) => {
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
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },

  post: async (url, data, options = {}) => {
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
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },

  put: async (url, data, options = {}) => {
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
        const error = await response.json();
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
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
};