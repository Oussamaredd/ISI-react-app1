// client/src/tests/App.test.tsx
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, test, expect, Mock } from 'vitest';
import App from '../App';
import { renderWithProviders } from './test-utils';

vi.mock('../hooks/useAuth', () => {
  return {
    useCurrentUser: vi.fn(),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

const mockFetch = vi.fn();

const renderApp = () => renderWithProviders(<App />);

describe('App Integration', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('renders login screen when not authenticated', async () => {
    const { useCurrentUser } = await import('../hooks/useAuth');
    (useCurrentUser as unknown as Mock).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ authenticated: false }),
      text: async () => JSON.stringify({ authenticated: false }),
    } as Response);

    renderApp();

    expect(await screen.findByText('AUTHENTIFICATION PROCESS')).toBeInTheDocument();
    expect(await screen.findByText('Please log in with your Google account to continue.')).toBeInTheDocument();
  });

  test('renders authenticated app when user is logged in', async () => {
    const { useCurrentUser } = await import('../hooks/useAuth');
    (useCurrentUser as unknown as Mock).mockReturnValue({
      user: { id: '123', name: 'Test User', email: 'test@example.com' },
      isLoading: false,
      isAuthenticated: true,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ authenticated: true, user: { id: '123', name: 'Test User' } }),
      text: async () => JSON.stringify({ authenticated: true }),
    } as Response);

    renderApp();

    await waitForElementToBeRemoved(() => screen.getByText(/Loading/i));
    await waitFor(() => expect(screen.getByText('Logged in as Test User')).toBeInTheDocument());

    expect(screen.getByText('Simple List')).toBeInTheDocument();
    expect(screen.getByText('Create Ticket')).toBeInTheDocument();
  });

  test('navigation links work correctly', async () => {
    const { useCurrentUser } = await import('../hooks/useAuth');
    (useCurrentUser as unknown as Mock).mockReturnValue({
      user: { id: '123', name: 'Test User' },
      isLoading: false,
      isAuthenticated: true,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ authenticated: true, user: { id: '123', name: 'Test User' } }),
      text: async () => JSON.stringify({ authenticated: true }),
    } as Response);

    renderApp();

    await waitForElementToBeRemoved(() => screen.getByText(/Loading/i));
    expect(screen.getByText('Simple List')).toBeInTheDocument();

    const createTicketLink = screen.getByText('Create Ticket');
    expect(createTicketLink.closest('a')).toHaveAttribute('href', '/tickets/create');

    const ticketsListLink = screen.getByText('Simple List');
    expect(ticketsListLink.closest('a')).toHaveAttribute('href', '/tickets');
  });
});
