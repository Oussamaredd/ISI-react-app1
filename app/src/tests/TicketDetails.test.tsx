import { screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import TicketDetails from '../pages/TicketDetails';
import { renderWithProviders } from './test-utils';

const { mockUseTicketComments } = vi.hoisted(() => ({
  mockUseTicketComments: vi.fn(),
}));

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
  useTicketComments: (...args: unknown[]) => mockUseTicketComments(...args),
  useTicketActivity: () => ({
    data: { activity: [] },
    isLoading: false,
    error: null,
  }),
  useAddComment: () => ({
    addComment: vi.fn(),
    isAdding: false,
  }),
  useUpdateComment: () => ({
    updateComment: vi.fn(),
    isUpdating: false,
  }),
  useDeleteComment: () => ({
    deleteComment: vi.fn(),
    isDeleting: false,
  }),
}));

const renderTicketDetails = (initialEntries = ['/app/tickets/1/details']) =>
  renderWithProviders(<TicketDetails />, {
    path: '/app/tickets/:id/details',
    initialEntries,
  });

describe('TicketDetails Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUseTicketComments.mockReturnValue({
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
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders ticket details page', async () => {
    renderTicketDetails();

    expect(await screen.findByText('Test Ticket')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('Grand Hotel')).toBeInTheDocument();
  });

  test('passes commentsPage query parameter into the comments hook', async () => {
    renderTicketDetails(['/app/tickets/1/details?commentsPage=3']);

    expect(await screen.findByText('Test Ticket')).toBeInTheDocument();
    expect(mockUseTicketComments).toHaveBeenCalledWith('1', 3);
  });

  test('does not crash when currentUser localStorage value is malformed JSON', async () => {
    window.localStorage.setItem('currentUser', '{bad-json');

    renderTicketDetails();

    expect(await screen.findByText('Test Ticket')).toBeInTheDocument();
  });
});
