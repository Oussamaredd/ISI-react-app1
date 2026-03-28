import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, test, expect } from 'vitest';

import {
  ErrorBoundary,
  ErrorFallback,
  ERROR_RECOVERY,
  ERROR_TYPES,
  formatErrorMessage,
  retryWithBackoff,
  suggestRecovery,
  useErrorHandler,
  useNetworkStatus,
} from '../utils/errorHandlers';

const {
  captureWebExceptionSpy,
  reportFrontendErrorSpy,
  toastErrorSpy,
} = vi.hoisted(() => ({
  captureWebExceptionSpy: vi.fn(),
  reportFrontendErrorSpy: vi.fn(),
  toastErrorSpy: vi.fn(),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    error: toastErrorSpy,
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('../services/api', () => ({
  reportFrontendError: reportFrontendErrorSpy,
}));

vi.mock('../monitoring/sentry', () => ({
  captureWebException: captureWebExceptionSpy,
}));

const originalLocation = window.location;

beforeEach(() => {
  toastErrorSpy.mockReset();
  reportFrontendErrorSpy.mockReset();
  captureWebExceptionSpy.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      reload: vi.fn(),
      assign: vi.fn(),
      replace: vi.fn(),
    },
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

describe('Error Handling', () => {
  describe('useErrorHandler', () => {
    test('should classify network errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler());

      const networkError = new TypeError('Failed to fetch');
      const classification = result.current.classifyError(networkError);

      expect(classification.type).toBe(ERROR_TYPES.NETWORK);
      expect(classification.message).toContain('Network connection error');
      expect(classification.isRecoverable).toBe(true);
    });

    test('should classify auth errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler());

      const authError = { message: 'UNAUTHORIZED', status: 401 };
      const classification = result.current.classifyError(authError);

      expect(classification.type).toBe(ERROR_TYPES.AUTH);
      expect(classification.message).toContain('need to log in');
      expect(classification.isRecoverable).toBe(false);
    });

    test('should classify permission errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler());

      const permissionError = { status: 403, code: 'ACCESS_DENIED' };
      const classification = result.current.classifyError(permissionError);

      expect(classification.type).toBe(ERROR_TYPES.PERMISSION);
      expect(classification.message).toContain('permission');
      expect(classification.isRecoverable).toBe(false);
    });

    test('should classify validation errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler());

      const validationError = { status: 400, code: 'VALIDATION_ERROR', details: 'Invalid name' };
      const classification = result.current.classifyError(validationError);

      expect(classification.type).toBe(ERROR_TYPES.VALIDATION);
      expect(classification.message).toBe('Invalid name');
      expect(classification.isRecoverable).toBe(true);
    });

    test('should classify server errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler());

      const serverError = { status: 500 };
      const classification = result.current.classifyError(serverError);

      expect(classification.type).toBe(ERROR_TYPES.SERVER);
      expect(classification.message).toContain('Server error');
      expect(classification.isRecoverable).toBe(true);
    });

    test('should handle async errors correctly', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const asyncFunction = vi.fn().mockRejectedValue(new Error('Async error'));

      await expect(result.current.handleAsyncError(asyncFunction)).rejects.toThrow('Async error');

      expect(asyncFunction).toHaveBeenCalled();
    });

    test('surfaces handled errors through toast and telemetry', () => {
      const { result } = renderHook(() => useErrorHandler());

      const errorInfo = result.current.handleError({ response: { status: 503 } }, 'tickets.load');

      expect(errorInfo.type).toBe(ERROR_TYPES.SERVER);
      expect(toastErrorSpy).toHaveBeenCalledWith('Server error. Please try again later.');
      expect(reportFrontendErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'tickets.load',
          type: ERROR_TYPES.SERVER,
        }),
      );
    });
  });

  describe('Error Boundary Fallback', () => {
    test('should render error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      const { container } = render(
        <ErrorFallback error={error} resetErrorBoundary={vi.fn()} />
      );

      expect(container.textContent).toContain('Something went wrong');
      expect(container.textContent).toContain('Error Details');

      process.env.NODE_ENV = originalEnv;
    });

    test('should call resetErrorBoundary when Try Again is clicked', () => {
      const mockReset = vi.fn();
      const error = new Error('Test error');

      const { getByText } = render(
        <ErrorFallback error={error} resetErrorBoundary={mockReset} />
      );

      fireEvent.click(getByText('Try Again'));
      expect(mockReset).toHaveBeenCalled();
    });

    test('resets the error boundary and renders recovered content', async () => {
      let shouldThrow = true;
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const swallowJsdomBoundaryError = (event: ErrorEvent) => {
        if (event.error instanceof Error && event.error.message === 'Recovered later') {
          event.preventDefault();
        }
      };

      const ProblemChild = () => {
        if (shouldThrow) {
          throw new Error('Recovered later');
        }

        return <div>Recovered view</div>;
      };

      try {
        window.addEventListener('error', swallowJsdomBoundaryError);

        const { getByText } = render(
          <ErrorBoundary>
            <ProblemChild />
          </ErrorBoundary>,
        );

        shouldThrow = false;
        fireEvent.click(getByText('Try Again'));

        await waitFor(() => {
          expect(getByText('Recovered view')).toBeTruthy();
        });
      } finally {
        window.removeEventListener('error', swallowJsdomBoundaryError);
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('utility helpers', () => {
    test('formats API payload and status text errors consistently', () => {
      expect(
        formatErrorMessage({
          response: {
            data: {
              message: 'Detailed backend error',
            },
          },
        }),
      ).toBe('Detailed backend error');
      expect(
        formatErrorMessage({
          response: {
            statusText: 'Service unavailable',
          },
        }),
      ).toBe('Service unavailable');
      expect(formatErrorMessage(null)).toBe('Unknown error occurred');
      expect(formatErrorMessage('direct message')).toBe('direct message');
    });

    test('suggests recovery actions for auth, session expiry, and unknown failures', () => {
      expect(suggestRecovery(ERROR_TYPES.AUTH)).toEqual(
        expect.objectContaining({
          strategy: ERROR_RECOVERY.REDIRECT,
          action: 'Login',
        }),
      );

      expect(
        suggestRecovery(ERROR_TYPES.SERVER, {
          response: {
            status: 401,
          },
        }),
      ).toEqual(
        expect.objectContaining({
          strategy: ERROR_RECOVERY.REDIRECT,
          message: 'Session expired. Please log in again',
        }),
      );

      expect(suggestRecovery('unexpected')).toEqual(
        expect.objectContaining({
          strategy: ERROR_RECOVERY.REFRESH,
          action: 'Refresh',
        }),
      );
    });

    test('retries recoverable operations with exponential backoff', async () => {
      vi.useFakeTimers();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('temporary'))
        .mockRejectedValueOnce(new Error('temporary'))
        .mockResolvedValueOnce('ok');

      const promise = retryWithBackoff(operation, 2, 10);

      await vi.advanceTimersByTimeAsync(30);
      await expect(promise).resolves.toBe('ok');
      expect(operation).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
    });

    test('stops retrying client errors immediately', async () => {
      const clientError = {
        response: {
          status: 400,
        },
      };

      const operation = vi.fn().mockRejectedValue(clientError);

      await expect(retryWithBackoff(operation, 3, 10)).rejects.toEqual(clientError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('tracks browser online and offline events', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
    });
  });
});
