// client/src/tests/useTickets.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTickets, useHotels, useCurrentUser } from '../hooks/useTickets';

// Mock fetch
global.fetch = jest.fn();

// Test wrapper with React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTickets Hook', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  test('should fetch tickets successfully', async () => {
    const mockTickets = {
      tickets: [
        { id: 1, title: 'Test Ticket', price: 100, status: 'OPEN' },
        { id: 2, title: 'Another Ticket', price: 200, status: 'COMPLETED' },
      ],
      total: 2,
      pagination: { limit: 20, offset: 0, hasMore: false },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTickets,
    });

    const { result } = renderHook(() => useTickets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(2);
      expect(result.current.total).toBe(2);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should handle fetch error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useTickets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.tickets).toEqual([]);
  });

  test('should create ticket successfully', async () => {
    const mockNewTicket = { id: 3, title: 'New Ticket', price: 150, status: 'OPEN' };
    
    // Mock list call
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tickets: [], total: 0, pagination: { limit: 20, offset: 0, hasMore: false } }),
    });
    
    // Mock create call
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNewTicket,
    });

    const { result } = renderHook(() => useTickets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.createTicket({ name: 'New Ticket', price: 150 });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'New Ticket', price: 150 }),
      })
    );
  });
});

describe('useHotels Hook', () => {
  test('should fetch hotels successfully', async () => {
    const mockHotels = [
      { id: 1, name: 'Hotel A', isAvailable: true },
      { id: 2, name: 'Hotel B', isAvailable: false },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHotels,
    });

    const { result } = renderHook(() => useHotels(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.hotels).toHaveLength(2);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });
});

describe('useCurrentUser Hook', () => {
  test('should fetch current user successfully', async () => {
    const mockUser = { id: '123', name: 'Test User', email: 'test@example.com' };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  test('should handle unauthorized user', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });

    expect(result.current.user).toBe(null);
  });
});