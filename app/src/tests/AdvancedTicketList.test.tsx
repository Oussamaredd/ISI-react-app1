// client/src/tests/AdvancedTicketList.test.tsx
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, Mock } from 'vitest';
import AdvancedTicketList from '../pages/AdvancedTicketList';
import { renderWithProviders } from './test-utils';
import { useTickets } from '../hooks/useTickets';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Test User' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    getAuthHeaders: async () => ({}),
  }),
  useCurrentUser: () => ({
    user: { name: 'Test User' },
    isAuthenticated: true,
    isLoading: false,
    error: null,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../hooks/useTickets', () => {
  const useTicketsMock = vi.fn((filters?: any) => {
    if (filters === false) {
      return {
        data: {
          hotels: [
            { id: '1', name: 'Grand Hotel', isAvailable: true },
            { id: '2', name: 'City Inn', isAvailable: true },
            { id: '3', name: 'Beach Resort', isAvailable: false },
          ],
        },
        isLoading: false,
        error: null,
      };
    }
    return {
      data: {
        tickets: [
          {
            id: '1',
            title: 'Test Ticket',
            priority: 'high',
            status: 'open',
            hotelId: '1',
            updatedAt: '2026-01-15T10:30:00Z',
          },
          {
            id: '2',
            title: 'Another Ticket',
            priority: 'medium',
            status: 'completed',
            hotelId: '2',
            updatedAt: '2026-01-14T09:15:00Z',
          },
        ],
        total: 50,
      },
      isLoading: false,
      error: null,
    };
  });

  return { useTickets: useTicketsMock };
});

const renderAdvancedList = (initialEntries = ['/app/tickets/advanced?page=1&pageSize=20']) =>
  renderWithProviders(<AdvancedTicketList />, {
    path: '/app/tickets/advanced',
    initialEntries,
  });

describe('AdvancedTicketList Component', () => {
  beforeEach(() => {
    // reset any per-test mockReturnValueOnce overrides
    (useTickets as unknown as Mock).mockClear?.();
  });

  test('renders advanced ticket list page', () => {
    renderAdvancedList();
    
    expect(screen.getByText('Advanced Tickets')).toBeInTheDocument();
    expect(screen.getByText('Search, filter, and manage your tickets')).toBeInTheDocument();
  });

  test('renders search and filters section', () => {
    renderAdvancedList();
    
    expect(screen.getByLabelText('Search Tickets')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Search by ticket name...')).toBeInTheDocument();
    expect(screen.getByText('Show Filters')).toBeInTheDocument();
    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  test('filters toggle works correctly', () => {
    renderAdvancedList();
    
    const toggleButton = screen.getByText('Show Filters');
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    
    fireEvent.click(toggleButton);
    expect(screen.getByText('Hide Filters')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  test('renders filters when expanded', () => {
    renderAdvancedList();
    
    fireEvent.click(screen.getByText('Show Filters'));
    
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Hotel')).toBeInTheDocument();
    expect(screen.getByText('Results per page')).toBeInTheDocument();
    
    expect(screen.getByText('All Status')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('All Hotels')).toBeInTheDocument();
  });

  test('renders tickets table', () => {
    renderAdvancedList();
    
    expect(screen.getByText('Test Ticket')).toBeInTheDocument();
    expect(screen.getByText('Another Ticket')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('Grand Hotel')).toBeInTheDocument();
    expect(screen.getByText('City Inn')).toBeInTheDocument();
    expect(screen.getByText('Treat')).toBeInTheDocument();
  });

  test('search functionality works', async () => {
    const { getLocation } = renderAdvancedList();
    
    const searchInput = screen.getByLabelText('Search Tickets');
    const searchButton = screen.getByText('Search');
    
    fireEvent.change(searchInput, { target: { value: 'Test Ticket' } });
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      expect(getLocation()?.search).toContain('q=Test+Ticket');
    });
  });

  test('filter selection works', async () => {
    const { getLocation } = renderAdvancedList();
    
    fireEvent.click(screen.getByText('Show Filters'));
    
    const statusSelect = screen.getByDisplayValue('All Status');
    fireEvent.change(statusSelect, { target: { value: 'OPEN' } });
    
    await waitFor(() => {
      expect(getLocation()?.search).toContain('status=OPEN');
    });
  });

  test('page size selection works', async () => {
    const { getLocation } = renderAdvancedList();
    
    fireEvent.click(screen.getByText('Show Filters'));
    
    const pageSizeSelect = screen.getByDisplayValue('20');
    fireEvent.change(pageSizeSelect, { target: { value: '50' } });
    
    await waitFor(() => {
      expect(getLocation()?.search).toContain('pageSize=50');
    });
  });

  test('clear filters works', async () => {
    const { getLocation } = renderAdvancedList();
    
    fireEvent.click(screen.getByText('Show Filters'));
    const statusSelect = screen.getByDisplayValue('All Status');
    fireEvent.change(statusSelect, { target: { value: 'OPEN' } });
    
    fireEvent.click(screen.getByText('Clear Filters'));
    
    await waitFor(() => {
      expect(getLocation()?.search ?? '').not.toContain('status=OPEN');
      expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
    });
  });

  test('ticket links work correctly', () => {
    renderAdvancedList();
    
    const ticketLink = screen.getByText('Test Ticket');
    expect(ticketLink.closest('a')).toHaveAttribute('href', '/app/tickets/1/treat');
  });

  test('pagination displays correctly', () => {
    renderAdvancedList();
    
    expect(screen.getByText('Showing 1-20 of 50 tickets')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  test('pagination navigation works', async () => {
    const { getLocation } = renderAdvancedList();
    
    fireEvent.click(screen.getByText('Next'));
    
    await waitFor(() => {
      expect(getLocation()?.search).toContain('page=2');
    });
  });

  test('loading state displays correctly', () => {
    (useTickets as unknown as Mock).mockReturnValueOnce({
      tickets: [],
      hotels: [],
      total: 0,
      isLoading: true,
      error: null,
    });

    renderAdvancedList();
    
    expect(screen.getByText('Loading tickets...')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument(); // Loading spinner
  });

  test('empty state displays correctly', () => {
    (useTickets as unknown as Mock).mockReturnValueOnce({
      tickets: [],
      hotels: [],
      total: 0,
      isLoading: false,
      error: null,
    });

    renderAdvancedList();
    
    expect(screen.getByText('No tickets found')).toBeInTheDocument();
    expect(screen.getByText('🎫')).toBeInTheDocument(); // Empty state icon
  });

  test('error state displays correctly', () => {
    (useTickets as unknown as Mock).mockReturnValueOnce({
      tickets: [],
      hotels: [],
      total: 0,
      isLoading: false,
      error: { message: 'Network error' },
    });

    renderAdvancedList();
    
    expect(screen.getByText('Error loading tickets: Network error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('responsive behavior', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    renderAdvancedList();
    
    expect(screen.getByText('Advanced Tickets')).toBeInTheDocument();
    expect(screen.getByText('Show Filters')).toBeInTheDocument();
  });
});
