// client/src/tests/TicketDetails.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TicketDetails from '../pages/TicketDetails';

// Mock hooks
jest.mock('../hooks/useTickets', () => ({
  useTicketDetails: () => ({
    data: {
      ticket: {
        id: 1,
        name: 'Test Ticket',
        price: 150.00,
        status: 'OPEN',
        hotel_id: 1,
        hotel_name: 'Grand Hotel',
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-15T10:30:00Z',
      },
      comments: [
        {
          id: 1,
          body: 'This is a test comment',
          user_id: 123,
          user_name: 'Test User',
          user_email: 'test@example.com',
          user_role: 'user',
          created_at: '2026-01-15T11:00:00Z',
          updated_at: '2026-01-15T11:00:00Z',
        }
      ],
      commentsPagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      activity: [
        {
          id: 1,
          type: 'creation',
          actor_name: 'Test User',
          actor_email: 'test@example.com',
          metadata: null,
          created_at: '2026-01-15T10:00:00Z',
        }
      ],
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useTicketComments: () => ({
    data: {
      comments: [
        {
          id: 1,
          body: 'Another test comment',
          user_id: 123,
          user_name: 'Test User',
          user_email: 'test@example.com',
          user_role: 'user',
          created_at: '2026-01-15T12:00:00Z',
          updated_at: '2026-01-15T12:00:00Z',
        }
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
    isLoading: false,
    error: null,
  }),
  useAddComment: () => ({
    addComment: jest.fn().mockResolvedValue({
      id: 2,
      body: 'New comment',
      user_id: 123,
    }),
    isAdding: false,
  }),
  useUpdateComment: () => ({
    updateComment: jest.fn().mockResolvedValue({
      id: 1,
      body: 'Updated comment',
    }),
    isUpdating: false,
  }),
  useDeleteComment: () => ({
    deleteComment: jest.fn().mockResolvedValue({
      deletedId: 1,
      message: 'Comment deleted successfully',
    }),
    isDeleting: false,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderTicketDetails = (ticketId = '1') => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TicketDetails />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('TicketDetails Component', () => {
  test('renders ticket details page', () => {
    renderTicketDetails();
    
    expect(screen.getByText('💬 Comments (1)')).toBeInTheDocument();
    expect(screen.getByText('🎫 Test Ticket')).toBeInTheDocument();
  });

  test('renders ticket information correctly', () => {
    renderTicketDetails();
    
    expect(screen.getByText('Test Ticket')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('Grand Hotel')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument();
  });

  test('renders activity timeline', () => {
    renderTicketDetails();
    
    expect(screen.getByText('📋 Activity Timeline')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  test('renders comments section', () => {
    renderTicketDetails();
    
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  test('renders add comment form', () => {
    renderTicketDetails();
    
    expect(screen.getByLabelText('Add a Comment')).toBeInTheDocument();
    expect(screen.getByText('Add Comment')).toBeInTheDocument();
  });

  test('allows comment editing', async () => {
    renderTicketDetails();
    
    // Find edit button and click it
    const editButtons = screen.getAllByText('✏️');
    fireEvent.click(editButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('This is a test comment')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('allows comment deletion', async () => {
    renderTicketDetails();
    
    // Find delete button and click it
    const deleteButtons = screen.getAllByText('🗑️');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      // Should be in deleting state
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });
  });

  test('shows loading states', () => {
    // Mock loading state
    jest.doMock('../hooks/useTickets', () => ({
      useTicketDetails: () => ({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      }),
      useTicketComments: () => ({
        data: { comments: [], pagination: {} },
        isLoading: true,
        error: null,
      }),
      useAddComment: () => ({
        addComment: jest.fn(),
        isAdding: true,
      }),
    }));

    renderTicketDetails();
    
    expect(screen.getByText('Loading ticket details...')).toBeInTheDocument();
    expect(screen.getByText('Loading comments...')).toBeInTheDocument();
    expect(screen.getByText('Adding...')).toBeInTheDocument();
  });

  test('shows error states', () => {
    // Mock error state
    jest.doMock('../hooks/useTickets', () => ({
      useTicketDetails: () => ({
        data: null,
        isLoading: false,
        error: { message: 'Failed to load ticket details' },
        refetch: jest.fn(),
      }),
      useTicketComments: () => ({
        data: { comments: [], pagination: {} },
        isLoading: false,
        error: { message: 'Failed to load comments' },
      }),
      useAddComment: () => ({
        addComment: jest.fn(),
        isAdding: false,
      }),
    }));

    renderTicketDetails();
    
    expect(screen.getByText('Error loading ticket details: Failed to load ticket details')).toBeInTheDocument();
    expect(screen.getByText('Error loading comments: Failed to load comments')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('handles pagination', async () => {
    renderTicketDetails();
    
    // Mock pagination
    jest.doMock('../hooks/useTickets', () => ({
      useTicketComments: () => ({
        data: {
          comments: [],
          pagination: {
            page: 1,
            pageSize: 20,
            total: 50,
            totalPages: 3,
            hasNext: true,
            hasPrev: false,
          },
        },
        isLoading: false,
        error: null,
      }),
    }));

    renderTicketDetails();
    
    expect(screen.getByText('Load More Comments')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  test('navigates back to tickets', () => {
    renderTicketDetails();
    
    const backButton = screen.getByText('← Back to Tickets');
    expect(backButton.closest('a')).toHaveAttribute('href', '/tickets');
  });

  test('handles comment submission', async () => {
    renderTicketDetails();
    
    const commentTextarea = screen.getByLabelText('Add a Comment');
    const submitButton = screen.getByText('Add Comment');
    
    fireEvent.change(commentTextarea, { target: { value: 'New test comment' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      // Should clear the textarea
      expect(commentTextarea).toHaveDisplayValue('');
      
      // Should show success message (handled by mock)
      expect(screen.getByText('Comment added successfully')).toBeInTheDocument();
    });
  });

  test('disables edit/delete for other users comments', () => {
    // Mock different user
    jest.doMock('../hooks/useTickets', () => ({
      useTicketDetails: () => ({
        data: {
          comments: [
            {
              id: 1,
              body: 'Other user comment',
              user_id: 456, // Different user ID
              user_name: 'Other User',
              user_email: 'other@example.com',
              user_role: 'user',
              created_at: '2026-01-15T11:00:00Z',
              updated_at: '2026-01-15T11:00:00Z',
            }
          ],
        },
      }),
      useAddComment: () => ({
        addComment: jest.fn(),
        isAdding: false,
      }),
    }));

    renderTicketDetails();
    
    // Should not show edit/delete for other user's comment
    expect(screen.queryByText('✏️')).not.toBeInTheDocument();
    expect(screen.queryByText('🗑️')).not.toBeInTheDocument();
    
    // Should still show comment content
    expect(screen.getByText('Other user comment')).toBeInTheDocument();
  });
});