// Frontend Error Handling and Logging
import React from 'react';

// Error handling configuration
export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error handler function
export const handleApiError = (error, context = '') => {
  const errorInfo = {
    type: ERROR_TYPES.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
    context,
    timestamp: new Date().toISOString(),
    severity: ERROR_SEVERITY.MEDIUM
  };

  if (error.response) {
    // API error response
    errorInfo.type = ERROR_TYPES.API_ERROR;
    errorInfo.message = error.response.data?.message || error.response.statusText || 'API request failed';
    errorInfo.status = error.response.status;
    
    // Categorize by status code
    if (error.response.status >= 500) {
      errorInfo.severity = ERROR_SEVERITY.HIGH;
    } else if (error.response.status >= 400) {
      errorInfo.severity = ERROR_SEVERITY.MEDIUM;
    }
  } else if (error.request) {
    // Network error
    errorInfo.type = ERROR_TYPES.NETWORK_ERROR;
    errorInfo.message = 'Network connection failed';
    errorInfo.severity = ERROR_SEVERITY.HIGH;
  } else if (error.code === 'ECONNABORTED') {
    // Timeout error
    errorInfo.type = ERROR_TYPES.TIMEOUT_ERROR;
    errorInfo.message = 'Request timeout';
    errorInfo.severity = ERROR_SEVERITY.MEDIUM;
  }

  // Log error to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', errorInfo);
  }

  // Send error to monitoring service
  logErrorToService(errorInfo, error);

  return errorInfo;
};

// Log error to external service
export const logErrorToService = (errorInfo, originalError) => {
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...errorInfo,
        userAgent: navigator.userAgent,
        url: window.location.href,
        stack: originalError?.stack
      })
    }).catch(err => {
      console.error('Failed to log error:', err);
    });
  }
};

// Custom error boundary component
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error });
    handleApiError(error, 'React Error Boundary');
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          color: '#721c24',
          margin: '2rem auto',
          maxWidth: '600px'
        }}>
          <h2>Something went wrong</h2>
          <p>The application encountered an unexpected error.</p>
          
          {process.env.NODE_ENV === 'development' && (
            <details style={{ 
              marginTop: '1rem', 
              textAlign: 'left',
              backgroundColor: '#fff',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #f5c6cb'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{ 
                marginTop: '1rem', 
                fontSize: '0.8rem', 
                overflow: 'auto',
                maxHeight: '200px',
                backgroundColor: '#f8f9fa',
                padding: '0.5rem',
                borderRadius: '4px'
              }}>
                {this.state.error?.stack}
              </pre>
            </details>
          )}
          
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}>
              Try Again
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}>
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Error handling hook for components
export const useErrorHandler = () => {
  const handleError = React.useCallback((error, context = '') => {
    const errorInfo = handleApiError(error, context);
    
    // You could also show a toast notification here
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(errorInfo.message, 'error');
    }
  }, []);

  return { handleError };
};

// Retry mechanism with exponential backoff
export const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Do not retry on certain error types
      if (error.response?.status >= 400 && error.response?.status < 500) {
        break;
      }
      
      // Do not retry on last attempt
      if (i === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  throw lastError;
};

// Network status monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};

// Error message formatter
export const formatErrorMessage = (error) => {
  if (!error) return 'Unknown error occurred';
  
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.statusText) return error.response.statusText;
  
  return 'An unexpected error occurred';
};

// Error recovery strategies
export const ERROR_RECOVERY = {
  RETRY: 'retry',
  REDIRECT: 'redirect',
  REFRESH: 'refresh',
  IGNORE: 'ignore'
};

export const suggestRecovery = (errorType) => {
  switch (errorType) {
    case ERROR_TYPES.NETWORK_ERROR:
      return {
        strategy: ERROR_RECOVERY.RETRY,
        message: 'Check your internet connection and try again',
        action: 'Retry'
      };
    
    case ERROR_TYPES.TIMEOUT_ERROR:
      return {
        strategy: ERROR_RECOVERY.RETRY,
        message: 'Request timed out. Please try again',
        action: 'Retry'
      };
    
    case ERROR_TYPES.AUTHENTICATION_ERROR:
      return {
        strategy: ERROR_RECOVERY.REDIRECT,
        message: 'Please log in again',
        action: 'Login'
      };
    
    case ERROR_TYPES.API_ERROR:
      if (error?.response?.status === 401) {
        return {
          strategy: ERROR_RECOVERY.REDIRECT,
          message: 'Session expired. Please log in again',
          action: 'Login'
        };
      }
      break;
    
    default:
      return {
        strategy: ERROR_RECOVERY.REFRESH,
        message: 'Something went wrong. Try refreshing the page',
        action: 'Refresh'
      };
  }
  
  return {
    strategy: ERROR_RECOVERY.REFRESH,
    message: 'An error occurred. Please try again',
    action: 'Try Again'
  };
};