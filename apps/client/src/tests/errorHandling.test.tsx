// client/src/tests/errorHandling.test.tsx
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useErrorHandler, ERROR_TYPES } from '../utils/errorHandlers';

// Mock toast context
jest.mock('../context/ToastContext', () => ({
  useToast: () => ({
    error: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  }),
}));

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window.location, 'reload', {
  value: mockReload,
  writable: true,
});

describe('Error Handling', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useErrorHandler', () => {
    test('should classify network errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler(), { wrapper });
      
      const networkError = new TypeError('Failed to fetch');
      const classification = result.current.classifyError(networkError);

      expect(classification.type).toBe(ERROR_TYPES.NETWORK);
      expect(classification.message).toContain('Network connection error');
      expect(classification.isRecoverable).toBe(true);
    });

    test('should classify auth errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler(), { wrapper });
      
      const authError = { message: 'UNAUTHORIZED', status: 401 };
      const classification = result.current.classifyError(authError);

      expect(classification.type).toBe(ERROR_TYPES.AUTH);
      expect(classification.message).toContain('need to log in');
      expect(classification.isRecoverable).toBe(false);
    });

    test('should classify permission errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler(), { wrapper });
      
      const permissionError = { status: 403, code: 'ACCESS_DENIED' };
      const classification = result.current.classifyError(permissionError);

      expect(classification.type).toBe(ERROR_TYPES.PERMISSION);
      expect(classification.message).toContain('permission');
      expect(classification.isRecoverable).toBe(false);
    });

    test('should classify validation errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler(), { wrapper });
      
      const validationError = { status: 400, code: 'VALIDATION_ERROR', details: 'Invalid name' };
      const classification = result.current.classifyError(validationError);

      expect(classification.type).toBe(ERROR_TYPES.VALIDATION);
      expect(classification.message).toBe('Invalid name');
      expect(classification.isRecoverable).toBe(true);
    });

    test('should classify server errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler(), { wrapper });
      
      const serverError = { status: 500 };
      const classification = result.current.classifyError(serverError);

      expect(classification.type).toBe(ERROR_TYPES.SERVER);
      expect(classification.message).toContain('Server error');
      expect(classification.isRecoverable).toBe(true);
    });

    test('should handle async errors correctly', async () => {
      const { result } = renderHook(() => useErrorHandler(), { wrapper });
      
      const asyncFunction = jest.fn().mockRejectedValue(new Error('Async error'));
      
      await expect(
        result.current.handleAsyncError(asyncFunction)
      ).rejects.toThrow('Async error');
      
      expect(asyncFunction).toHaveBeenCalled();
    });
  });

  describe('Error Boundary Fallback', () => {
    test('should render error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      error.stack = 'Error: Test error\\n    at test.js:1:1';
      
      const { container } = render(
        <ErrorFallback error={error} resetErrorBoundary={jest.fn()} />
      );
      
      expect(container.textContent).toContain('Something went wrong');
      expect(container.textContent).toContain('Error Details');
      expect(container.textContent).toContain('Test error');
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});