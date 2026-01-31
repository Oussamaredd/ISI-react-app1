// client/src/tests/Routing.test.tsx
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { vi, describe, test, beforeEach, afterEach, expect, Mock } from 'vitest';
import App from '../App';
import { renderWithProviders } from './test-utils';

vi.mock('../hooks/useAuth', () => ({
  useCurrentUser: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockFetch = vi.fn();

describe('Routing', () => {
  const renderApp = () => renderWithProviders(<App />);

  beforeEach(async () => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    const { useCurrentUser } = await import('../hooks/useAuth');
    (useCurrentUser as unknown as Mock).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('renders login screen when not authenticated', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ authenticated: false }),
      text: async () => JSON.stringify({ authenticated: false }),
    });

    renderApp();

    expect(await screen.findByText('AUTHENTIFICATION PROCESS')).toBeInTheDocument();
    expect(await screen.findByText('Please log in with your Google account to continue.')).toBeInTheDocument();
  });

  test('renders ticket list when authenticated', async () => {
    const { useCurrentUser } = await import('../hooks/useAuth');
    (useCurrentUser as unknown as Mock).mockReturnValue({
      user: { id: '123', name: 'Test User' },
      isLoading: false,
      isAuthenticated: true
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
  });
});
