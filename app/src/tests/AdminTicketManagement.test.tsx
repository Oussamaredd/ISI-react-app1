import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminTicketManagement } from '../components/admin/AdminTicketManagement';
import { renderWithProviders } from './test-utils';

const mockUseTickets = vi.fn();

vi.mock('../hooks/useTickets', () => ({
  useTickets: (filters: unknown) => mockUseTickets(filters),
}));

describe('AdminTicketManagement', () => {
  it('renders ticket rows and action links', async () => {
    mockUseTickets.mockImplementation(() => {
      return {
        data: {
          tickets: [
            {
              id: 'ticket-1',
              title: 'Overflowing container near gate',
              status: 'open',
              supportCategory: 'container_overflow',
              updatedAt: '2026-02-23T11:30:00.000Z',
            },
          ],
          total: 1,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    });

    renderWithProviders(<AdminTicketManagement />, {
      route: '/app/admin',
      withAuthProvider: false,
    });

    expect(await screen.findByText(/Overflowing container near gate/i)).toBeInTheDocument();
    expect(screen.getByText(/container_overflow/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View details/i })).toHaveAttribute(
      'href',
      '/app/tickets/ticket-1/details',
    );
    expect(screen.getByRole('link', { name: /Treat/i })).toHaveAttribute(
      'href',
      '/app/tickets/ticket-1/treat',
    );
  });
});
