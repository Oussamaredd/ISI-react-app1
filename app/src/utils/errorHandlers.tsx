// Frontend Error Handling and Logging
import React from 'react';

type ErrorInfo = {
  type: string;
  message: string;
  context: string;
  timestamp: string;
  severity: string;
  status?: number;
};

type ErrorBoundaryProps = {
  fallback?: React.ReactNode;
  children?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

// Error handling configuration
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  PERMISSION: 'PERMISSION',
  VALIDATION: 'VALIDATION',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN',
  // Legacy aliases kept for backwards compatibility
  NETWORK_ERROR: 'NETWORK',
  API_ERROR: 'SERVER',
  VALIDATION_ERROR: 'VALIDATION',
  AUTHENTICATION_ERROR: 'AUTH',
  TIMEOUT_ERROR: 'NETWORK',
  UNKNOWN_ERROR: 'UNKNOWN',
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const getStatusCode = (error: any): number | undefined => {
  if (!error) return undefined;
  if (typeof error.status === 'number') return error.status;
  if (typeof error.statusCode === 'number') return error.statusCode;
  if (typeof error?.response?.status === 'number') return error.response.status;
  return undefined;
};

export const classifyError = (error: any) => {
  const status = getStatusCode(error);

  if (error instanceof TypeError && error.message?.toLowerCase().includes('failed to fetch')) {
    return {
      type: ERROR_TYPES.NETWORK,
      message: 'Network connection error. Please check your connection.',
      status,
      isRecoverable: true,
    };
  }

  if (status === 401 || error?.message === 'UNAUTHORIZED') {
    return {
      type: ERROR_TYPES.AUTH,
      message: 'You need to log in again to continue.',
      status: 401,
      isRecoverable: false,
    };
  }

  if (status === 403 || error?.code === 'ACCESS_DENIED') {
    return {
      type: ERROR_TYPES.PERMISSION,
      message: 'You do not have permission to perform this action.',
      status: 403,
      isRecoverable: false,
    };
  }

  if (status === 400 || error?.code === 'VALIDATION_ERROR' || error?.details) {
    return {
      type: ERROR_TYPES.VALIDATION,
      message: error?.details || error?.message || 'Validation error',
      status: status ?? 400,
      isRecoverable: true,
    };
  }

  if (typeof status === 'number' && status >= 500) {
    return {
      type: ERROR_TYPES.SERVER,
      message: 'Server error. Please try again later.',
      status,
      isRecoverable: true,
    };
  }

  return {
    type: ERROR_TYPES.UNKNOWN,
    message: error?.message || 'An unexpected error occurred',
    status,
    isRecoverable: true,
  };
};

// Error handler function
export const handleApiError = (error: any, context = '') => {
  const classification = classifyError(error);

  const errorInfo: ErrorInfo = {
    type: classification.type,
    message: classification.message,
    context,
    timestamp: new Date().toISOString(),
    severity: classification.isRecoverable ? ERROR_SEVERITY.MEDIUM : ERROR_SEVERITY.HIGH,
    status: classification.status,
  };

  // Log error to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', errorInfo, error);
  }

  // Send error to monitoring service
  logErrorToService(errorInfo, error);

  return errorInfo;
};

// Log error to external service
export const logErrorToService = (errorInfo: ErrorInfo, originalError: any) => {
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...errorInfo,
        userAgent: navigator.userAgent,
        url: window.location.href,
        stack: originalError?.stack,
      }),
    }).catch((err) => {
      console.error('Failed to log error:', err);
    });
  }
};

export const ErrorFallback = ({
  error,
  resetError,
  resetErrorBoundary,
}: {
  error?: Error | null;
  resetError?: () => void;
  resetErrorBoundary?: () => void;
}) => {
  const handleReset = resetError ?? resetErrorBoundary;
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div
      style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '8px',
        color: '#721c24',
        margin: '2rem auto',
        maxWidth: '600px',
      }}
    >
      <h2>Something went wrong</h2>
      <p>The application encountered an unexpected error.</p>

      {process.env.NODE_ENV === 'development' && (
        <details
          style={{
            marginTop: '1rem',
            textAlign: 'left',
            backgroundColor: '#fff',
            padding: '1rem',
            borderRadius: '4px',
            border: '1px solid #f5c6cb',
          }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details</summary>
          <pre
            style={{
              marginTop: '1rem',
              fontSize: '0.8rem',
              overflow: 'auto',
              maxHeight: '200px',
              backgroundColor: '#f8f9fa',
              padding: '0.5rem',
              borderRadius: '4px',
            }}
          >
            {error?.stack}
          </pre>
        </details>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button
          onClick={handleReset}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>

        <button
          onClick={handleGoHome}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

// Custom error boundary component
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.setState({ error });
    handleApiError(error, 'React Error Boundary');
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <ErrorFallback error={this.state.error} resetError={this.reset} resetErrorBoundary={this.reset} />
        )
      );
    }

    return this.props.children;
  }
}

// Error handling hook for components
export const useErrorHandler = () => {
  const classifyErrorMemo = React.useCallback((error: any) => classifyError(error), []);

  const handleError = React.useCallback((error: any, context = '') => {
    const errorInfo = handleApiError(error, context);

    const toastWindow = window as Window & { showToast?: (message: string, type?: string) => void };

    // You could also show a toast notification here
    if (typeof window !== 'undefined' && toastWindow.showToast) {
      toastWindow.showToast(errorInfo.message, 'error');
    }

    return errorInfo;
  }, []);

  const handleAsyncError = React.useCallback(
    async (fn: () => Promise<any>) => {
      try {
        return await fn();
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
    []
  );

  return { classifyError: classifyErrorMemo, handleError, handleAsyncError };
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
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        break;
      }

      // Do not retry on last attempt
      if (i === maxRetries) {
        break;
      }

      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError;
};

// Network status monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

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
  IGNORE: 'ignore',
};

export const suggestRecovery = (errorType, error?: { response?: { status?: number } }) => {
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
    case ERROR_TYPES.NETWORK_ERROR:
      return {
        strategy: ERROR_RECOVERY.RETRY,
        message: 'Check your internet connection and try again',
        action: 'Retry',
      };

    case ERROR_TYPES.TIMEOUT_ERROR:
      return {
        strategy: ERROR_RECOVERY.RETRY,
        message: 'Request timed out. Please try again',
        action: 'Retry',
      };

    case ERROR_TYPES.AUTH:
    case ERROR_TYPES.AUTHENTICATION_ERROR:
      return {
        strategy: ERROR_RECOVERY.REDIRECT,
        message: 'Please log in again',
        action: 'Login',
      };

    case ERROR_TYPES.SERVER:
    case ERROR_TYPES.API_ERROR:
      if (error?.response?.status === 401) {
        return {
          strategy: ERROR_RECOVERY.REDIRECT,
          message: 'Session expired. Please log in again',
          action: 'Login',
        };
      }
      break;

    default:
      return {
        strategy: ERROR_RECOVERY.REFRESH,
        message: 'Something went wrong. Try refreshing the page',
        action: 'Refresh',
      };
  }

  return {
    strategy: ERROR_RECOVERY.REFRESH,
    message: 'An error occurred. Please try again',
    action: 'Try Again',
  };
};
