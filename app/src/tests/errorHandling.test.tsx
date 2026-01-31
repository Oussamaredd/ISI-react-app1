import { render, renderHook, fireEvent } from '@testing-library/react';
import { useErrorHandler, ERROR_TYPES, ErrorFallback } from '../utils/errorHandlers';
import { vi, beforeEach, afterEach, describe, test, expect } from 'vitest';

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  }),
}));

const originalLocation = window.location;

beforeEach(() => {
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
  });
});
