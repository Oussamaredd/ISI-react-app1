// client/src/tests/useDashboard.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboard } from '../hooks/useTickets';

// Mock fetch
global.fetch = jest.fn();

describe('useDashboard Hook', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    (fetch as jest.Mock).mockClear();
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  test('should fetch dashboard data successfully', async () => {
    const mockDashboardData = {
      summary: {
        total: 100,
        open: 30,
        completed: 70,
        assigned: 60,
        avgPrice: 125.50,
        totalRevenue: 12550.00,
      },
      statusBreakdown: {
        open: 30,
        completed: 70,
      },
      hotels: [
        { id: 1, name: 'Grand Hotel', ticketCount: 25, avgPrice: 150.00 },
      ],
      recentActivity: [
        { date: '2026-01-15', created: 5, updated: 8 },
      ],
      recentTickets: [
        {
          id: 1,
          name: 'Test Ticket',
          price: 100.00,
          status: 'OPEN',
          hotelName: 'Grand Hotel',
          createdAt: '2026-01-15T10:00:00Z',
          updatedAt: '2026-01-15T10:30:00Z',
        },
      ],
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockDashboardData);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        credentials: 'include',
      })
    );
  });

  test('should handle fetch error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBe(null);
  });

  test('should auto-refresh at interval', () => {
    jest.useFakeTimers();

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ summary: { total: 100 } }),
    });

    renderHook(() => useDashboard(), { wrapper });

    // Initial fetch
    expect(fetch).toHaveBeenCalledTimes(1);

    // Fast-forward 5 minutes
    jest.advanceTimersByTime(300000);

    // Should fetch again
    expect(fetch).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  test('should call refetch function', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ summary: { total: 100 } }),
    });

    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });

    // Clear mock history
    (fetch as jest.Mock).mockClear();

    // Call refetch
    await result.current.refetch();

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});