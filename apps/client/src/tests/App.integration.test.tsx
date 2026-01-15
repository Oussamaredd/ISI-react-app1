// client/src/tests/App.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// Mock the hooks
jest.mock('../hooks/useTickets', () => ({
  useCurrentUser: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderApp = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('App Integration', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  test('renders login screen when not authenticated', () => {
    renderApp();
    
    expect(screen.getByText('AUTHENTIFICATION PROCESS')).toBeInTheDocument();
    expect(screen.getByText('Please log in with your Google account to continue.')).toBeInTheDocument();
  });

  test('renders authenticated app when user is logged in', async () => {
    // Re-mock hook to return authenticated user
    const { useCurrentUser } = require('../hooks/useTickets');
    useCurrentUser.mockImplementation(() => ({
      user: { id: '123', name: 'Test User', email: 'test@example.com' },
      isLoading: false,
      isAuthenticated: true,
    }));

    renderApp();

    await waitFor(() => {
      expect(screen.getByText('Logged in as Test User')).toBeInTheDocument();
    });

    // Check navigation is present
    expect(screen.getByText('Tickets List')).toBeInTheDocument();
    expect(screen.getByText('Create Ticket')).toBeInTheDocument();
    expect(screen.getByText('All Tickets')).toBeInTheDocument();
  });

  test('navigation links work correctly', async () => {
    // Mock authenticated user
    const { useCurrentUser } = require('../hooks/useTickets');
    useCurrentUser.mockImplementation(() => ({
      user: { id: '123', name: 'Test User' },
      isLoading: false,
      isAuthenticated: true,
    }));

    renderApp();

    await waitFor(() => {
      expect(screen.getByText('All Tickets')).toBeInTheDocument();
    });

    // Test navigation links
    const createTicketLink = screen.getByText('Create Ticket');
    expect(createTicketLink.closest('a')).toHaveAttribute('href', '/tickets/create');

    const ticketsListLink = screen.getByText('Tickets List');
    expect(ticketsListLink.closest('a')).toHaveAttribute('href', '/tickets');
  });
});