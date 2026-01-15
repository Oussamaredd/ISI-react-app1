// client/src/components/ErrorDemo.tsx
import React from 'react';
import { useErrorHandler, ERROR_TYPES } from '../utils/errorHandlers';

// Demo component to test different error scenarios
export const ErrorDemo: React.FC = () => {
  const { handleError } = useErrorHandler();

  const triggerNetworkError = () => {
    handleError(new TypeError('Failed to fetch'));
  };

  const triggerAuthError = () => {
    handleError({ message: 'UNAUTHORIZED', status: 401 });
  };

  const triggerPermissionError = () => {
    handleError({ status: 403, code: 'ACCESS_DENIED' });
  };

  const triggerValidationError = () => {
    handleError({ status: 400, code: 'VALIDATION_ERROR', details: 'Invalid email format' });
  };

  const triggerServerError = () => {
    handleError({ status: 500 });
  };

  const triggerUnknownError = () => {
    handleError(new Error('Something unexpected happened'));
  };

  const triggerAsyncError = async () => {
    try {
      throw new Error('Async operation failed');
    } catch (error) {
      handleError(error);
    }
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '1rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: 1000,
      maxWidth: '300px',
    }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '14px', fontWeight: 'bold' }}>
        Error Testing (Dev Only)
      </h4>
      <div style={{ display: 'grid', gap: '0.5rem', fontSize: '12px' }}>
        <button
          onClick={triggerNetworkError}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '11px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          Network Error
        </button>
        <button
          onClick={triggerAuthError}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '11px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          Auth Error
        </button>
        <button
          onClick={triggerPermissionError}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '11px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          Permission Error
        </button>
        <button
          onClick={triggerValidationError}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '11px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          Validation Error
        </button>
        <button
          onClick={triggerServerError}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '11px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          Server Error
        </button>
        <button
          onClick={triggerUnknownError}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '11px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          Unknown Error
        </button>
        <button
          onClick={triggerAsyncError}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '11px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          Async Error
        </button>
      </div>
    </div>
  );
};