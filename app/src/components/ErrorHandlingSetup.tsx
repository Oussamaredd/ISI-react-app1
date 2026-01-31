// client/src/components/ErrorHandlingSetup.jsx
import React from 'react';
import { ErrorBoundary, ErrorFallback, useErrorHandler as useGlobalErrorHandler } from '../utils/errorHandlers';

// Wrapper component for comprehensive error handling
export const ErrorHandlingSetup = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);
  const { handleError: reportError } = useGlobalErrorHandler();

  const handleError = React.useCallback((error, context = '') => {
    setError(error);
    setHasError(true);
    reportError(error, context);
  }, [reportError]);

  const resetError = React.useCallback(() => {
    setHasError(false);
    setError(null);
  }, []);

  // Global error handler
  React.useEffect(() => {
    const handleGlobalError = (event) => {
      handleError(event.error, 'Global error');
    };
    const handleRejection = (event) => {
      handleError(event.reason, 'Unhandled promise rejection');
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [handleError]);

  if (hasError) {
    return <ErrorFallback error={error} resetError={resetError} />;
  }

  return <ErrorBoundary fallback={<ErrorFallback />}>{children}</ErrorBoundary>;
};

export const useErrorHandler = useGlobalErrorHandler;
