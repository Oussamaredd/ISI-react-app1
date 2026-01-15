// client/src/tests/AdvancedTicketList.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdvancedTicketList from '../pages/AdvancedTicketList';

// Mock hooks
jest.mock('../hooks/useTickets', () => ({
  useTickets: () => ({
    tickets: [
      {
        id: 1,
        name: 'Test Ticket',
        price: 150.00,
        status: 'OPEN',
        hotel_name: 'Grand Hotel',
        updatedAt: '2026-01-15T10:30:00Z',
      },
      {
        id: 2,
        name: 'Another Ticket',
        price: 200.00,
        status: 'COMPLETED',
        hotel_name: 'City Inn',
        updatedAt: '2026-01-14T09:15:00Z',
      },
    ],
    hotels: [
      { id: 1, name: 'Grand Hotel', isAvailable: true },
      { id: 2, name: 'City Inn', isAvailable: true },
      { id: 3, name: 'Beach Resort', isAvailable: false },
    ],
    total: 50,
    isLoading: false,
    error: null,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderAdvancedList = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdvancedTicketList />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AdvancedTicketList Component', () => {
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
    
    // Expand filters
    fireEvent.click(screen.getByText('Show Filters'));
    
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Hotel')).toBeInTheDocument();
    expect(screen.getByText('Results per page')).toBeInTheDocument();
    
    // Check filter options
    expect(screen.getByText('All Status')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('All Hotels')).toBeInTheDocument();
  });

  test('renders tickets table', () => {
    renderAdvancedList();
    
    expect(screen.getByText('Test Ticket')).toBeInTheDocument();
    expect(screen.getByText('Another Ticket')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('Grand Hotel')).toBeInTheDocument();
    expect(screen.getByText('City Inn')).toBeInTheDocument();
    expect(screen.getByText('Treat')).toBeInTheDocument();
  });

  test('search functionality works', async () => {
    renderAdvancedList();
    
    const searchInput = screen.getByLabelText('Search Tickets');
    const searchButton = screen.getByText('Search');
    
    fireEvent.change(searchInput, { target: { value: 'Test Ticket' } });
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      // URL should be updated with search query
      expect(window.location.search).toContain('q=Test+Ticket');
    });
  });

  test('filter selection works', async () => {
    renderAdvancedList();
    
    // Expand filters
    fireEvent.click(screen.getByText('Show Filters'));
    
    const statusSelect = screen.getByDisplayValue('All Status');
    fireEvent.change(statusSelect, { target: { value: 'OPEN' } });
    
    await waitFor(() => {
      expect(window.location.search).toContain('status=OPEN');
    });
  });

  test('page size selection works', async () => {
    renderAdvancedList();
    
    // Expand filters
    fireEvent.click(screen.getByText('Show Filters'));
    
    const pageSizeSelect = screen.getByDisplayValue('20');
    fireEvent.change(pageSizeSelect, { target: { value: '50' } });
    
    await waitFor(() => {
      expect(window.location.search).toContain('pageSize=50');
    });
  });

  test('clear filters works', async () => {
    renderAdvancedList();
    
    // Set some filters first
    fireEvent.click(screen.getByText('Show Filters'));
    const statusSelect = screen.getByDisplayValue('All Status');
    fireEvent.change(statusSelect, { target: { value: 'OPEN' } });
    
    // Clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(window.location.search).not.toContain('status=OPEN');
      expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
    });
  });

  test('ticket links work correctly', () => {
    renderAdvancedList();
    
    const ticketLink = screen.getByText('Test Ticket');
    expect(ticketLink.closest('a')).toHaveAttribute('href', '/tickets/1/treat');
  });

  test('pagination displays correctly', () => {
    renderAdvancedList();
    
    // Should show pagination when there are tickets
    expect(screen.getByText('Showing 1-20 of 50 tickets')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  test('pagination navigation works', async () => {
    renderAdvancedList();
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(window.location.search).toContain('page=2');
    });
  });

  test('loading state displays correctly', () => {
    // Mock loading state
    jest.doMock('../hooks/useTickets', () => ({
      useTickets: () => ({
        tickets: [],
        hotels: [],
        total: 0,
        isLoading: true,
        error: null,
      }),
    }));

    renderAdvancedList();
    
    expect(screen.getByText('Loading tickets...')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument(); // Loading spinner
  });

  test('empty state displays correctly', () => {
    // Mock empty state
    jest.doMock('../hooks/useTickets', () => ({
      useTickets: () => ({
        tickets: [],
        hotels: [],
        total: 0,
        isLoading: false,
        error: null,
      }),
    }));

    renderAdvancedList();
    
    expect(screen.getByText('No tickets found')).toBeInTheDocument();
    expect(screen.getByText('🎫')).toBeInTheDocument(); // Empty state icon
  });

  test('error state displays correctly', () => {
    // Mock error state
    jest.doMock('../hooks/useTickets', () => ({
      useTickets: () => ({
        tickets: [],
        hotels: [],
        total: 0,
        isLoading: false,
        error: { message: 'Network error' },
      }),
    }));

    renderAdvancedList();
    
    expect(screen.getByText('Error loading tickets: Network error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('responsive behavior', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    renderAdvancedList();
    
    // Should still render correctly on mobile
    expect(screen.getByText('Advanced Tickets')).toBeInTheDocument();
    expect(screen.getByText('Show Filters')).toBeInTheDocument();
  });
});