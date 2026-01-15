// client/src/components/ErrorHandlingSetup.jsx
import React from 'react';
import { ErrorBoundary } from '../utils/errorHandlers.jsx';

const ErrorFallback = ({ error, resetError }) => {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
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
            {error?.stack}
          </pre>
        </details>
      )}
      
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button
          onClick={resetError}
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
          onClick={handleGoHome}
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
};

// Error handling hook for components
export const useErrorHandler = () => {
  const handleError = React.useCallback((error, context = '') => {
    // Basic error handling
    if (typeof window !== 'undefined' && window.showToast) {
      const message = error?.message || error?.response?.data?.message || 'An unexpected error occurred';
      window.showToast(message, 'error');
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', error);
    }
  }, []);

  return { handleError };
};

// Wrapper component for comprehensive error handling
export const ErrorHandlingSetup = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleError = React.useCallback((error, context = '') => {
    setError(error);
    setHasError(true);
    
    // You could also show a toast notification here
    if (typeof window !== 'undefined' && window.showToast) {
      const message = error?.message || error?.response?.data?.message || 'An unexpected error occurred';
      window.showToast(message, 'error');
    }
  }, []);

  const resetError = React.useCallback(() => {
    setHasError(false);
    setError(null);
  }, []);

  // Global error handler
  React.useEffect(() => {
    const handleGlobalError = (event) => {
      handleError(event.error, 'Global error');
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', (event) => {
      handleError(event.reason, 'Unhandled promise rejection');
    });

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, [handleError]);

  if (hasError) {
    return <ErrorFallback error={error} resetError={resetError} />;
  }

  return <ErrorBoundary fallback={<ErrorFallback />}>{children}</ErrorBoundary>;
};