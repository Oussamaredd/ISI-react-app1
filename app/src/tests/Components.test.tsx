import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TicketList from '../pages/TicketList';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});


describe('Ticket Components', () => {
  test('TicketList shows loading state', () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <TicketList />
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading tickets...')).toBeInTheDocument();
  });
});
