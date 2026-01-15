import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTickets, useCreateTicket } from '../hooks/useApi';

// Test components
import TicketList from '../pages/TicketList';
import CreateTicket from '../pages/CreateTickets';

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

  test('TicketList shows empty state', async () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <TicketList />
      </QueryClientProvider>
    );
    
    expect(await screen.findByText('No tickets found')).toBeInTheDocument();
  });

  test('CreateTicket form submission works', async () => {
    const queryClient = createTestQueryClient();
    const mutateMock = jest.fn();
    
    jest.mock('../hooks/useApi', () => ({
      useCreateTicket: () => ({
        mutate: mutateMock,
      }),
    }));

    render(
      <QueryClientProvider client={queryClient}>
        <CreateTicket />
      </QueryClientProvider>
    );
    
    const nameInput = screen.getByLabelText('Ticket Name');
    const priceInput = screen.getByLabelText('Price');
    const submitButton = screen.getByRole('button', { name: 'Create Ticket' });

    await userEvent.type(nameInput, 'Test Ticket');
    await userEvent.type(priceInput, '25.50');
    await userEvent.click(submitButton);

    expect(mutateMock).toHaveBeenCalledWith({
      name: 'Test Ticket',
      price: 25.50,
    });
  });
});

describe('API Integration', () => {
  test('useTickets fetches data correctly', async () => {
    const mockData = [
      { id: 1, name: 'Test Ticket', price: 25.50, status: 'OPEN' },
    ];

    jest.mock('../services/api', () => ({
      apiClient: {
        get: jest.fn().mockResolvedValue({ data: mockData }),
      },
    }));

    const { result } = renderHook(() => useTickets(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={createTestQueryClient()}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.data).toEqual(mockData));
  });
});