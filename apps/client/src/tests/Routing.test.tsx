// client/src/tests/Routing.test.tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// Mock the Tickets context
jest.mock('../context/Tickets', () => ({
  TicketsProvider: ({ children }: { children: React.ReactNode }) => children,
  useTickets: () => ({
    tickets: [],
    hotels: [],
    refreshTickets: jest.fn(),
    refreshHotels: jest.fn(),
    setTreatedTicketId: jest.fn(),
  }),
}));

// Mock fetch for auth check
global.fetch = jest.fn();

describe('Routing', () => {
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

  test('renders login screen when not authenticated', async () => {
    // Mock unauthenticated response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    renderApp();

    expect(screen.getByText('AUTHENTIFICATION PROCESS')).toBeInTheDocument();
    expect(screen.getByText('Please log in with your Google account to continue.')).toBeInTheDocument();
  });

  test('renders ticket list when authenticated', async () => {
    // Mock authenticated response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123', name: 'Test User', email: 'test@example.com' }),
    });

    renderApp();

    // Should show navigation and ticket list after auth
    expect(await screen.findByText('Tickets List')).toBeInTheDocument();
    expect(screen.getByText('All Tickets')).toBeInTheDocument();
  });
});