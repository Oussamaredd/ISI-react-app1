// client/src/tests/Dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../pages/Dashboard';

// Mock the dashboard hook
jest.mock('../hooks/useTickets', () => ({
  useDashboard: () => ({
    data: {
      summary: {
        total: 150,
        open: 45,
        completed: 105,
        assigned: 78,
        avgPrice: 125.50,
        totalRevenue: 18825.00,
        minPrice: 25.00,
        maxPrice: 500.00,
      },
      statusBreakdown: {
        open: 45,
        completed: 105,
      },
      hotels: [
        { id: 1, name: 'Grand Hotel', ticketCount: 25, avgPrice: 150.00 },
        { id: 2, name: 'City Inn', ticketCount: 18, avgPrice: 120.00 },
        { id: 3, name: 'Beach Resort', ticketCount: 12, avgPrice: 200.00 },
      ],
      recentActivity: [
        { date: '2026-01-15', created: 5, updated: 8 },
        { date: '2026-01-14', created: 3, updated: 6 },
      ],
      recentTickets: [
        {
          id: 1,
          name: 'Room 101',
          price: 150.00,
          status: 'OPEN',
          hotelName: 'Grand Hotel',
          updatedAt: '2026-01-15T10:30:00Z',
        },
        {
          id: 2,
          name: 'Suite 205',
          price: 250.00,
          status: 'COMPLETED',
          hotelName: 'City Inn',
          updatedAt: '2026-01-15T09:15:00Z',
        },
      ],
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderDashboard = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Component', () => {
  test('renders dashboard header', () => {
    renderDashboard();
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Overview of your ticket management system')).toBeInTheDocument();
  });

  test('renders stat cards with correct values', () => {
    renderDashboard();
    
    expect(screen.getByText('Total Tickets')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('78 assigned to hotels')).toBeInTheDocument();
    
    expect(screen.getByText('Open Tickets')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('105')).toBeInTheDocument();
    
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$18,825.00')).toBeInTheDocument();
  });

  test('renders recent activity table', () => {
    renderDashboard();
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Room 101')).toBeInTheDocument();
    expect(screen.getByText('Suite 205')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  test('renders hotels performance section', () => {
    renderDashboard();
    
    expect(screen.getByText('Hotels Performance')).toBeInTheDocument();
    expect(screen.getByText('Grand Hotel')).toBeInTheDocument();
    expect(screen.getByText('City Inn')).toBeInTheDocument();
    expect(screen.getByText('Beach Resort')).toBeInTheDocument();
  });

  test('renders quick actions', () => {
    renderDashboard();
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Create New Ticket')).toBeInTheDocument();
    expect(screen.getByText('View All Tickets')).toBeInTheDocument();
  });

  test('navigation links are present', () => {
    renderDashboard();
    
    const dashboardLink = screen.getByText('Dashboard');
    const ticketsLink = screen.getByText('Tickets List');
    const createLink = screen.getByText('Create Ticket');
    
    expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard');
    expect(ticketsLink.closest('a')).toHaveAttribute('href', '/tickets');
    expect(createLink.closest('a')).toHaveAttribute('href', '/tickets/create');
  });

  test('shows loading state', () => {
    // Override mock to show loading
    jest.doMock('../hooks/useTickets', () => ({
      useDashboard: () => ({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      }),
    }));

    renderDashboard();
    
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  test('shows error state', () => {
    // Override mock to show error
    jest.doMock('../hooks/useTickets', () => ({
      useDashboard: () => ({
        data: null,
        isLoading: false,
        error: { message: 'Failed to load' },
        refetch: jest.fn(),
      }),
    }));

    renderDashboard();
    
    expect(screen.getByText('Error loading dashboard: Failed to load')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});