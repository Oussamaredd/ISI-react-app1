import { screen } from '@testing-library/react';
import { vi, describe, test, expect } from 'vitest';
import TicketDetails from '../pages/TicketDetails';
import { renderWithProviders } from './test-utils';

vi.mock('../hooks/useTickets', () => ({
  useTicketDetails: () => ({
    data: {
      id: '1',
      title: 'Test Ticket',
      status: 'open',
      priority: 'high',
      hotelName: 'Grand Hotel',
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-01-15T10:30:00Z',
    },
    isLoading: false,
    error: null,
  }),
  useTicketComments: () => ({
    data: {
      comments: [
        {
          id: '1',
          body: 'Another test comment',
          user_name: 'Test User',
          created_at: '2026-01-15T12:00:00Z',
        },
      ],
      commentsPagination: { total: 1, hasNext: false, page: 1 },
    },
    isLoading: false,
    error: null,
  }),
  useTicketActivity: () => ({
    data: { activity: [] },
    isLoading: false,
    error: null,
  }),
  useAddComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

const renderTicketDetails = () =>
  renderWithProviders(<TicketDetails />, {
    path: '/app/tickets/:id/details',
    initialEntries: ['/app/tickets/1/details'],
  });

describe('TicketDetails Component', () => {
  test('renders ticket details page', async () => {
    renderTicketDetails();

    expect(await screen.findByText('Test Ticket')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('Grand Hotel')).toBeInTheDocument();
  });
});
